import type { NextRequest } from "next/server";

export function isAuthorizedCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}
