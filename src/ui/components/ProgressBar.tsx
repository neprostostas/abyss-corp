export function ProgressBar({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <span style={{ width: `${String(percent)}%` }} />
    </div>
  );
}
