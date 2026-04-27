import twilio from "twilio";

let cachedClient: ReturnType<typeof twilio> | null = null;

function getClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  if (!cachedClient) cachedClient = twilio(sid, token);
  return cachedClient;
}

/**
 * Envía un SMS. Si Twilio no está configurado o el usuario no tiene teléfono,
 * la función no hace nada (no rompe el flujo). Devuelve true si se envió.
 */
export async function sendSms(to: string | null | undefined, body: string) {
  if (!to) return false;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!from) {
    console.warn("[sms] TWILIO_FROM_NUMBER missing; skipping send");
    return false;
  }
  const client = getClient();
  if (!client) {
    console.warn("[sms] Twilio creds missing; skipping send");
    return false;
  }
  try {
    await client.messages.create({ to, from, body });
    return true;
  } catch (err) {
    console.error("[sms] send failed", err);
    return false;
  }
}

/**
 * Trunca a 160 chars con elipsis. Twilio cobra por segmento (160 GSM-7 chars
 * o 70 UCS-2 chars si hay emojis); mantengamos las notifs en 1 segmento.
 */
export function smsTrim(s: string, max = 155) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}
