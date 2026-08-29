import { useState } from "react";

const REACTIONS = [
  { emoji: "🔥", label: "fire" },
  { emoji: "💯", label: "perfect" },
  { emoji: "👏", label: "clap" },
];

interface Props {
  initialCounts?: Record<string, number>;
  compact?: boolean;
}

export default function EmojiReactions({ initialCounts = {}, compact = false }: Props) {
  const [counts, setCounts] = useState<Record<string, number>>(initialCounts);
  const [mine, setMine] = useState<Set<string>>(new Set());

  const toggle = (e: React.MouseEvent, emoji: string) => {
    e.stopPropagation();
    const isActive = mine.has(emoji);
    setMine((prev) => {
      const next = new Set(prev);
      isActive ? next.delete(emoji) : next.add(emoji);
      return next;
    });
    setCounts((prev) => ({
      ...prev,
      [emoji]: Math.max(0, (prev[emoji] || 0) + (isActive ? -1 : 1)),
    }));
  };

  return (
    <div className="flex items-center gap-1">
      {REACTIONS.map(({ emoji, label }) => {
        const count = counts[emoji] || 0;
        const active = mine.has(emoji);
        return (
          <button
            key={label}
            onClick={(e) => toggle(e, emoji)}
            title={label}
            className={`flex items-center gap-0.5 rounded-full transition-all duration-150 select-none ${
              compact ? "px-1 py-0 text-[12px]" : "px-1.5 py-0.5 text-sm"
            } ${
              active
                ? "bg-accent/20 ring-1 ring-accent/40 scale-110"
                : count > 0
                  ? "bg-surface2 border border-line hover:bg-surface hover:scale-105"
                  : "opacity-30 hover:opacity-70 hover:bg-surface2"
            }`}
          >
            <span>{emoji}</span>
            {count > 0 && (
              <span className="font-mono text-[9px] text-muted leading-none">{count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
