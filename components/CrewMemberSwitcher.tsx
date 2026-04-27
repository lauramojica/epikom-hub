"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

type CrewMember = { id: string; name: string; slug: string };

type Props = {
  crew: CrewMember[];
  selectedSlug: string | null;
  myId: string;
  weekParam: string | null;
};

export function CrewMemberSwitcher({ crew, selectedSlug, myId, weekParam }: Props) {
  const router = useRouter();
  // "Yo" = self (no ?crew param). Otherwise crew slug.
  const value = selectedSlug ?? "__me__";

  function go(next: string) {
    const params = new URLSearchParams();
    if (weekParam) params.set("week", weekParam);
    if (next !== "__me__") params.set("crew", next);
    const qs = params.toString();
    router.push(qs ? `/semana?${qs}` : "/semana");
  }

  const me = crew.find((c) => c.id === myId);

  return (
    <label
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs"
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        color: "var(--text-2)",
      }}
    >
      <Users size={13} />
      <select
        value={value}
        onChange={(e) => go(e.target.value)}
        className="bg-transparent text-xs"
        style={{
          color: "var(--text)",
          border: "none",
          outline: "none",
          fontFamily: "inherit",
          paddingRight: 4,
        }}
      >
        <option value="__me__">
          Yo{me ? ` (${me.name.split(" ")[0]})` : ""}
        </option>
        {crew
          .filter((c) => c.id !== myId)
          .map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
      </select>
    </label>
  );
}
