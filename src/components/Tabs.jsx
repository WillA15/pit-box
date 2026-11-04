/** Accessible tab bar (WAI-ARIA tabs pattern, manual activation). */
export default function Tabs({ tabs, value, onChange, label, idPrefix }) {
  const move = (e, i) => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!d) return;
    e.preventDefault();
    const next = tabs[(i + d + tabs.length) % tabs.length];
    onChange(next.value);
    document.getElementById(`${idPrefix}-tab-${next.value}`)?.focus();
  };
  return (
    <div className="tabs-bar" role="tablist" aria-label={label}>
      {tabs.map((t, i) => (
        <button
          key={t.value}
          id={`${idPrefix}-tab-${t.value}`}
          role="tab"
          type="button"
          aria-selected={value === t.value}
          aria-controls={`${idPrefix}-panel-${t.value}`}
          tabIndex={value === t.value ? 0 : -1}
          className="tabs-bar__tab"
          onClick={() => onChange(t.value)}
          onKeyDown={(e) => move(e, i)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
