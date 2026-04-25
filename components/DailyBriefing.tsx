import Link from "next/link";
import { Bell, UserPlus, AtSign, Users, AlertTriangle, CheckCircle2, StickyNote } from "lucide-react";
import type { NotificationRow } from "@/app/api/notifications/route";

type Props = {
  notifications: NotificationRow[];
};

const KIND_ICON: Record<NotificationRow["kind"], React.ReactNode> = {
  assign:   <UserPlus size={11} />,
  mention:  <AtSign size={11} />,
  standup:  <Users size={11} />,
  deadline: <AlertTriangle size={11} />,
  approval: <CheckCircle2 size={11} />,
  note:     <StickyNote size={11} />,
};

export function DailyBriefing({ notifications }: Props) {
  const unread = notifications.filter((n) => n.unread).slice(0, 3);
  if (unread.length === 0) return null;

  return (
    <div
      className="mt-8 rounded-lg p-4"
      style={{
        border: "1px dashed var(--border-strong)",
        background: "var(--bg)",
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <div
          className="flex h-6 w-6 items-center justify-center rounded-md"
          style={{
            background: "var(--brand-violeta-soft)",
            color: "var(--brand-violeta-ink)",
          }}
        >
          <Bell size={12} />
        </div>
        <div
          className="text-[11px] font-medium uppercase"
          style={{ letterSpacing: "0.08em", color: "var(--text-3)" }}
        >
          Tu briefing
        </div>
        <span
          className="tnum text-[11px]"
          style={{ color: "var(--text-3)" }}
        >
          {unread.length} sin leer
        </span>
      </div>

      <ul className="space-y-1.5">
        {unread.map((n) => {
          const row = (
            <li
              key={n.id}
              className="flex items-start gap-2 text-[13px]"
              style={{ color: "var(--text)" }}
            >
              <span
                className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded"
                style={{ color: "var(--text-2)" }}
              >
                {KIND_ICON[n.kind]}
              </span>
              <span className="leading-snug">
                {n.title}
                {n.body && (
                  <span style={{ color: "var(--text-3)" }}> · {n.body}</span>
                )}
              </span>
            </li>
          );
          return n.link ? (
            <Link key={n.id} href={n.link} className="block hover:opacity-80">
              {row}
            </Link>
          ) : (
            row
          );
        })}
      </ul>
    </div>
  );
}
