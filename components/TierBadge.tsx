import type { ClientTier } from "@/lib/clients";

const TONES: Record<ClientTier, { bg: string; fg: string }> = {
  A:    { bg: "var(--brand-violeta-soft)",  fg: "var(--brand-violeta-ink)" },
  "B+": { bg: "var(--brand-turquesa-soft)", fg: "var(--brand-turquesa-ink)" },
  B:    { bg: "var(--brand-turquesa-soft)", fg: "var(--brand-turquesa-ink)" },
  C:    { bg: "var(--bg-3)",                fg: "var(--text-2)" },
};

export function TierBadge({ tier }: { tier: ClientTier }) {
  const tone = TONES[tier];
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase"
      style={{
        background: tone.bg,
        color: tone.fg,
        letterSpacing: "0.04em",
      }}
    >
      Tier {tier}
    </span>
  );
}
