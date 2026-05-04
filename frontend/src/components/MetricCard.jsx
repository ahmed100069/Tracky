export function MetricCard({ label, value, hint }) {
  return (
    <div className="metric-card">
      <p className="section-title">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-brand-100">{value}</p>
      <p className="mt-2 text-sm text-brand-200/70">{hint}</p>
    </div>
  );
}
