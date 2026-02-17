export default function ProgressBar({ value = 0, label, variant = 'bar', size = 120, strokeWidth = 8 }) {
  const clamped = Math.max(0, Math.min(100, Number(value) || 0));

  if (variant === 'ring') {
    const safeSize = Math.max(60, size);
    const safeStroke = Math.max(2, Math.min(20, strokeWidth));
    const center = safeSize / 2;
    const radius = center - safeStroke;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (clamped / 100) * circumference;

    return (
      <div className="flex flex-col items-center gap-2">
        {label ? <p className="text-sm font-semibold text-slate-700">{label}</p> : null}
        <div className="relative">
          <svg width={safeSize} height={safeSize} viewBox={`0 0 ${safeSize} ${safeSize}`} className="overflow-visible">
            <circle cx={center} cy={center} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={safeStroke} />
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#0071bc"
              strokeWidth={safeStroke}
              strokeLinecap="round"
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={offset}
              strokeOpacity={1}
              transform={`rotate(-90 ${center} ${center})`}
              className="transition-[stroke-dashoffset] duration-700 ease-in-out"
            />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-slate-900">{Math.round(clamped)}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {label ? <p className="text-sm font-semibold text-slate-700">{label}</p> : null}
      <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-sky-600 transition-all duration-700 ease-in-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <p className="text-right text-xs font-semibold text-slate-600">{Math.round(clamped)}%</p>
    </div>
  );
}
