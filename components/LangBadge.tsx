import type { ClientLang } from "@/lib/clients";

/**
 * Renders a compact "EN" chip when the client's working language is English.
 * Returns null for es/default so Spanish-default clients don't get a noisy badge.
 */
export function LangBadge({ lang }: { lang: ClientLang }) {
  if (lang !== "en") return null;
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase"
      style={{
        background: "var(--lang-en-soft, rgba(59,130,246,0.12))",
        color: "var(--lang-en, rgb(37,99,235))",
        letterSpacing: "0.04em",
      }}
    >
      EN
    </span>
  );
}
