export function QuickActionCard({ title, subtitle, actionLabel, onClick }) {
  return (
    <div className="glass-card p-4">
      <h3 className="font-medium text-brand-100">{title}</h3>
      <p className="mt-1 text-sm text-brand-200/75">{subtitle}</p>
      <button className="pill-button mt-4" onClick={onClick}>
        {actionLabel}
      </button>
    </div>
  );
}
