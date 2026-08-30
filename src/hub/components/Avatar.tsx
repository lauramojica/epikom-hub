// Returns a readable text color (dark or light) based on hex background luminance
export function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#101114" : "#f2f3f6";
}

interface AvatarProps {
  initials: string;
  color: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  src?: string | null;
}

const sizes = {
  xs: { outer: "w-5 h-5", text: "text-[8px]" },
  sm: { outer: "w-7 h-7", text: "text-xs" },
  md: { outer: "w-9 h-9", text: "text-sm" },
  lg: { outer: "w-12 h-12", text: "text-base" },
};

export default function Avatar({ initials, color, size = "sm", className = "", src }: AvatarProps) {
  const { outer, text } = sizes[size];
  if (src) {
    return (
      <div className={`${outer} rounded-full overflow-hidden flex-shrink-0 ${className}`} style={{ background: color }}>
        <img src={src} alt={initials} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`${outer} rounded-full flex items-center justify-center font-700 flex-shrink-0 ${text} ${className}`}
      style={{ background: color, color: contrastColor(color) }}
    >
      {initials}
    </div>
  );
}
