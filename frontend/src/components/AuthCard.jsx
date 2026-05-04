export function AuthCard({ title, subtitle, children }) {
  return (
    <div className="glass-card mx-auto w-full max-w-md p-6 md:p-8">
      <p className="section-title">Tracky</p>
      <h1 className="mt-3 font-display text-3xl text-brand-100">{title}</h1>
      <p className="mt-2 text-sm text-brand-200/80">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
