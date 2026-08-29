interface Props {
  lines?: number;
  height?: number;
}

export function SkeletonLine({ w = "100%", h = 12 }: { w?: string; h?: number }) {
  return <div className="skeleton rounded" style={{ width: w, height: h }} />;
}

export default function SkeletonCard({ lines = 3, height = 80 }: Props) {
  return (
    <div
      className="bg-surface border border-line rounded-xl p-4 space-y-3"
      style={{ minHeight: height }}
    >
      {Array.from({ length: lines }, (_, i) => (
        <SkeletonLine key={i} w={i === 0 ? "60%" : i === lines - 1 ? "40%" : "85%"} h={i === 0 ? 14 : 10} />
      ))}
    </div>
  );
}
