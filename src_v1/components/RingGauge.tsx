interface RingGaugeProps {
  score: number;
  max: number;
  label: string;
  color: string;
  size?: number;
}

export default function RingGauge({ score, max, label, color, size = 100 }: RingGaugeProps) {
  const pct = score / max;
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <div className="ring-gauge">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E5E7EB" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" textAnchor="middle" dy=".35em"
          fontSize="20" fontWeight="700" fill="#111827">
          {score}
        </text>
      </svg>
      <div className="label">{label}</div>
    </div>
  );
}
