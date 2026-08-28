-- ============================================
-- EPIKOM HUB - AUTOMATED REMINDERS SYSTEM
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. FUNCTION: Process Overdue Deliverable Reminders
-- This function checks for overdue deliverables and creates notifications
-- Uses project-specific reminder settings
-- ============================================

CREATE OR REPLACE FUNCTION process_overdue_reminders()
RETURNS INTEGER AS $$
DECLARE
  reminder_count INTEGER := 0;
  deliverable_record RECORD;
  days_overdue INTEGER;
  reminder_number INTEGER;
  reminder_days JSONB;
  first_day INTEGER;
  second_day INTEGER;
  third_day INTEGER;
  existing_reminder INTEGER;
BEGIN
  -- Loop through overdue deliverables
  FOR deliverable_record IN
    SELECT 
      d.id as deliverable_id,
      d.name as deliverable_name,
      d.due_date,
      p.id as project_id,
      p.name as project_name,
      p.client_id,
      p.notification_settings,
      c.name as client_name,
      c.email as client_email,
      c.notification_preferences
    FROM deliverables d
    JOIN projects p ON p.id = d.project_id
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE d.status NOT IN ('approved', 'cancelled')
      AND d.due_date < NOW()
      AND p.status = 'active'
  LOOP
    -- Calculate days overdue
    days_overdue := EXTRACT(DAY FROM NOW() - deliverable_record.due_date)::INTEGER;
    
    -- Get reminder settings from project (with defaults)
    reminder_days := COALESCE(
      deliverable_record.notification_settings->'overdue_reminders',
      '{"first": 1, "second": 3, "third": 7}'::jsonb
    );
    
    first_day := COALESCE((reminder_days->>'first')::INTEGER, 1);
    second_day := COALESCE((reminder_days->>'second')::INTEGER, 3);
    third_day := COALESCE((reminder_days->>'third')::INTEGER, 7);
    
    -- Determine which reminder to send based on project settings
    reminder_number := NULL;
    
    IF days_overdue = first_day THEN
      reminder_number := 1;
    ELSIF days_overdue = second_day THEN
      reminder_number := 2;
    ELSIF days_overdue = third_day THEN
      reminder_number := 3;
    END IF;
    
    -- Skip if not a reminder day for this project
    IF reminder_number IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Check if we already sent this reminder
    SELECT COUNT(*) INTO existing_reminder
    FROM scheduled_reminders
    WHERE deliverable_id = deliverable_record.deliverable_id
      AND title LIKE '%Recordatorio ' || reminder_number || '%'
      AND created_at > NOW() - INTERVAL '1 day';
    
    IF existing_reminder = 0 AND deliverable_record.client_id IS NOT NULL THEN
      -- Create reminder/notification for the client
      INSERT INTO notifications (
        user_id, 
        type, 
        title, 
        message, 
        link, 
        project_id
      )
      SELECT 
        pr.id,
        'deadline',
        CASE reminder_number
          WHEN 1 THEN '⚠️ Recordatorio 1: Entregable pendiente'
          WHEN 2 THEN '🔶 Recordatorio 2: Entregable pendiente'
          WHEN 3 THEN '🔴 Recordatorio 3: Entregable pendiente'
        END,
        'El entregable "' || deliverable_record.deliverable_name || '" del proyecto "' || 
        deliverable_record.project_name || '" tiene ' || days_overdue || ' día(s) de retraso.',
        '/projects/' || deliverable_record.project_id,
        deliverable_record.project_id
      FROM profiles pr
      WHERE pr.email = deliverable_record.client_email;
      
      -- Log the reminder
      INSERT INTO scheduled_reminders (
        reminder_type,
        project_id,
        deliverable_id,
        user_id,
        scheduled_for,
        title,
        message,
        status,
        sent_at
      )
      SELECT
        'deliverable',
        deliverable_record.project_id,
        deliverable_record.deliverable_id,
        pr.id,
        NOW(),
        'Recordatorio ' || reminder_number || ': ' || deliverable_record.deliverable_name,
        days_overdue || ' días de retraso',
        'sent',
        NOW()
      FROM profiles pr
      WHERE pr.email = deliverable_record.client_email;
      
      reminder_count := reminder_count + 1;
    END IF;
  END LOOP;
  
  RETURN reminder_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 2. FUNCTION: Process Social Media Post Reminders
-- This function checks for upcoming social media posts and creates notifications
-- ============================================

CREATE OR REPLACE FUNCTION process_social_post_reminders()
RETURNS INTEGER AS $$
DECLARE
  reminder_count INTEGER := 0;
  post_record RECORD;
  hours_until_post NUMERIC;
BEGIN
  -- Loop through scheduled posts that haven't sent notification yet
  FOR post_record IN
    SELECT 
      smp.id as post_id,
      smp.title,
      smp.platform,
      smp.scheduled_date,
      smp.scheduled_time,
      smp.notify_before_hours,
      smp.project_id,
      p.name as project_name,
      p.client_id,
      c.email as client_email
    FROM social_media_posts smp
    JOIN projects p ON p.id = smp.project_id
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE smp.status = 'scheduled'
      AND smp.notification_sent = false
      AND smp.scheduled_date IS NOT NULL
  LOOP
    -- Calculate hours until post
    hours_until_post := EXTRACT(EPOCH FROM (
      (post_record.scheduled_date + COALESCE(post_record.scheduled_time, '12:00:00'::TIME)) - NOW()
    )) / 3600;
    
    -- Check if it's time to send reminder
    IF hours_until_post <= post_record.notify_before_hours AND hours_until_post > 0 THEN
      -- Create notification
      INSERT INTO notifications (
        user_id, 
        type, 
        title, 
        message, 
        link, 
        project_id
      )
      SELECT 
        pr.id,
        'deadline',
        '📱 Publicación programada próximamente',
        'La publicación "' || post_record.title || '" está programada para ' ||
        post_record.platform || ' en ' || 
        CASE 
          WHEN hours_until_post < 1 THEN 'menos de 1 hora'
          WHEN hours_until_post < 2 THEN '1 hora'
          ELSE ROUND(hours_until_post) || ' horas'
        END,
        '/projects/' || post_record.project_id,
        post_record.project_id
      FROM profiles pr
      WHERE pr.email = post_record.client_email;
      
      -- Mark notification as sent
      UPDATE social_media_posts 
      SET notification_sent = true 
      WHERE id = post_record.post_id;
      
      reminder_count := reminder_count + 1;
    END IF;
  END LOOP;
  
  RETURN reminder_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 3. FUNCTION: Process Project Deadline Reminders
-- Reminds about projects approaching their end date
-- ============================================

CREATE OR REPLACE FUNCTION process_project_deadline_reminders()
RETURNS INTEGER AS $$
DECLARE
  reminder_count INTEGER := 0;
  project_record RECORD;
  days_until_deadline INTEGER;
BEGIN
  FOR project_record IN
    SELECT 
      p.id,
      p.name,
      p.end_date,
      p.progress,
      p.client_id,
      c.email as client_email,
      c.notification_preferences
    FROM projects p
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.status = 'active'
      AND p.end_date IS NOT NULL
      AND p.duration_type = 'fixed'
      AND p.end_date > NOW()
      AND p.end_date <= NOW() + INTERVAL '7 days'
  LOOP
    days_until_deadline := EXTRACT(DAY FROM project_record.end_date - NOW())::INTEGER;
    
    -- Only send reminders at 7, 3, 1 days
    IF days_until_deadline IN (7, 3, 1) THEN
      -- Check if already sent today
      IF NOT EXISTS (
        SELECT 1 FROM notifications 
        WHERE project_id = project_record.id 
          AND type = 'project_update'
          AND title LIKE '%' || days_until_deadline || ' día%'
          AND created_at > NOW() - INTERVAL '1 day'
      ) THEN
        -- Create notification
        INSERT INTO notifications (
          user_id, 
          type, 
          title, 
          message, 
          link, 
          project_id
        )
        SELECT 
          pr.id,
          'project_update',
          CASE days_until_deadline
            WHEN 1 THEN '⏰ Proyecto vence mañana'
            WHEN 3 THEN '📅 Proyecto vence en 3 días'
            ELSE '📋 Proyecto vence en ' || days_until_deadline || ' días'
          END,
          'El proyecto "' || project_record.name || '" vence el ' || 
          TO_CHAR(project_record.end_date, 'DD/MM/YYYY') || '. Progreso actual: ' || 
          project_record.progress || '%',
          '/projects/' || project_record.id,
          project_record.id
        FROM profiles pr
        WHERE pr.email = project_record.client_email;
        
        reminder_count := reminder_count + 1;
      END IF;
    END IF;
  END LOOP;
  
  RETURN reminder_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 4. MASTER FUNCTION: Run All Reminders
-- This is the function to call from a cron job or Edge Function
-- ============================================

CREATE OR REPLACE FUNCTION run_all_reminders()
RETURNS JSON AS $$
DECLARE
  overdue_count INTEGER;
  social_count INTEGER;
  deadline_count INTEGER;
BEGIN
  -- Process all reminder types
  SELECT process_overdue_reminders() INTO overdue_count;
  SELECT process_social_post_reminders() INTO social_count;
  SELECT process_project_deadline_reminders() INTO deadline_count;
  
  -- Return summary
  RETURN json_build_object(
    'timestamp', NOW(),
    'overdue_deliverables', overdue_count,
    'social_posts', social_count,
    'project_deadlines', deadline_count,
    'total', overdue_count + social_count + deadline_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 5. CRON JOB SETUP (requires pg_cron extension)
-- Uncomment if pg_cron is enabled in your Supabase project
-- ============================================

-- Enable pg_cron extension (run as superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule to run every hour
-- SELECT cron.schedule(
--   'process-reminders',
--   '0 * * * *',  -- Every hour at minute 0
--   $$SELECT run_all_reminders()$$
-- );

-- Or run every 15 minutes
-- SELECT cron.schedule(
--   'process-reminders-frequent',
--   '*/15 * * * *',
--   $$SELECT run_all_reminders()$$
-- );


-- ============================================
-- 6. MANUAL TEST
-- Run this to test the reminder system
-- ============================================

-- SELECT run_all_reminders();


-- ============================================
-- 7. VIEW: Pending Reminders Summary
-- ============================================

CREATE OR REPLACE VIEW reminder_summary AS
SELECT 
  'Overdue Deliverables' as category,
  COUNT(*) as count
FROM deliverables d
JOIN projects p ON p.id = d.project_id
WHERE d.status NOT IN ('approved', 'cancelled')
  AND d.due_date < NOW()
  AND p.status = 'active'

UNION ALL

SELECT 
  'Upcoming Social Posts' as category,
  COUNT(*) as count
FROM social_media_posts smp
WHERE smp.status = 'scheduled'
  AND smp.scheduled_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 3

UNION ALL

SELECT 
  'Projects Due This Week' as category,
  COUNT(*) as count
FROM projects p
WHERE p.status = 'active'
  AND p.end_date BETWEEN NOW() AND NOW() + INTERVAL '7 days';


SELECT '✅ Automated Reminders System configured successfully!' as status;
SELECT '💡 To test, run: SELECT run_all_reminders();' as tip;
