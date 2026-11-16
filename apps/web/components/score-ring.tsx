import { formatScore } from "@/lib/format";

type ScoreRingProps = {
  score: number | null;
  size?: number;
  tone?: "light" | "dark";
  label?: string;
};

export function ScoreRing({ score, size = 128, label = "Overall score" }: ScoreRingProps) {
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;
  const hasScore = score != null && !Number.isNaN(score);
  const pct = hasScore ? Math.max(0, Math.min(100, score)) : 0;
  const offset = circumference - (pct / 100) * circumference;
  const track = "#E3E6EB";
  const arc = "#0E8F6E";
  const text = "#16181D";
  const muted = "#5E6772";

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
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      ) : null}

      <text x={center} y={center - 6} textAnchor="middle" fill={text} fontSize={size > 100 ? 32 : 22} fontWeight="650">
        {hasScore ? score : "—"}
      </text>
      <text x={center} y={center + 16} textAnchor="middle" fill={muted} fontSize="11">
        {hasScore ? "out of 100" : "No score"}
      </text>
    </svg>
  );
}
