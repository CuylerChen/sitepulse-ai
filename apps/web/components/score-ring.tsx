import { formatScore } from "@/lib/format";

type ScoreRingProps = {
  score: number | null;
  size?: number;
  tone?: "light" | "dark";
  label?: string;
};

export function ScoreRing({ score, size = 128, tone = "light", label = "Overall score" }: ScoreRingProps) {
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const hasScore = score != null && !Number.isNaN(score);
  const pct = hasScore ? Math.max(0, Math.min(100, score)) : 0;
  const offset = circumference - (pct / 100) * circumference;
  const track = tone === "light" ? "rgba(255,255,255,0.16)" : "#E2E8F0";
  const arc = tone === "light" ? "#60A5FA" : "#2563EB";
  const text = tone === "light" ? "#FFFFFF" : "#0F172A";
  const muted = tone === "light" ? "rgba(255,255,255,0.72)" : "#64748B";
  const angle = ((-90 + (pct / 100) * 360) * Math.PI) / 180;
  const dotX = center + radius * Math.cos(angle);
  const dotY = center + radius * Math.sin(angle);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${label}: ${formatScore(score)} out of 100`}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke={track} strokeWidth={stroke} />
      {hasScore ? (
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={arc}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      ) : null}
      {hasScore && pct > 0 ? <circle cx={dotX} cy={dotY} r="4.5" fill="#6366F1" /> : null}
      <text x={center} y={center - 6} textAnchor="middle" fill={text} fontSize={size > 100 ? 32 : 22} fontWeight="650">
        {hasScore ? score : "—"}
      </text>
      <text x={center} y={center + 16} textAnchor="middle" fill={muted} fontSize="11">
        {hasScore ? "out of 100" : "No score"}
      </text>
    </svg>
  );
}
