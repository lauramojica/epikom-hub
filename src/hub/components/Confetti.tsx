const COLORS = ["#dbfa45", "#31b498", "#e040fb", "#f59e0b", "#ef4444", "#a78bfa", "#22c55e", "#ff2d78"];

interface Piece {
  id: number; x: number; color: string;
  size: number; duration: number; delay: number;
  shape: "rect" | "circle" | "star";
}

function Star({ color, size }: { color: string; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" fill={color}>
      <polygon points="5,0 6.2,3.8 10,3.8 7,6.2 8.1,10 5,7.5 1.9,10 3,6.2 0,3.8 3.8,3.8" />
    </svg>
  );
}

export default function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const pieces: Piece[] = Array.from({ length: 70 }, (_, i) => ({
    id: i,
    x: 5 + Math.random() * 90,
    color: COLORS[i % COLORS.length],
    size: 6 + Math.random() * 8,
    duration: 2.2 + Math.random() * 1.6,
    delay: Math.random() * 0.9,
    shape: (["rect", "circle", "star"] as const)[i % 3],
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: "-16px",
            animation: `confetti-fall ${p.duration}s ${p.delay}s cubic-bezier(0.25,0.46,0.45,0.94) forwards`,
          }}
        >
          {p.shape === "star" ? (
            <Star color={p.color} size={p.size + 2} />
          ) : (
            <div style={{
              width: p.shape === "circle" ? p.size : p.size * 1.4,
              height: p.shape === "circle" ? p.size : p.size * 0.6,
              borderRadius: p.shape === "circle" ? "50%" : "2px",
              background: p.color,
            }} />
          )}
        </div>
      ))}
    </div>
  );
}
