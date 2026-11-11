"use client";

type Item<T extends string> = { id: T; label: string; count?: number };

export default function DashboardNav<T extends string>({ items, active, onChange }: {
  items: Item<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return <nav className="dashboard-nav" aria-label="Workspace sections">
    {items.map(item => <button key={item.id} type="button" aria-current={active === item.id ? 'page' : undefined} onClick={() => onChange(item.id)}>
      {item.label}{!!item.count && <span className="nav-count" aria-label={`${item.count} unread messages`}>{item.count > 99 ? '99+' : item.count}</span>}
    </button>)}
  </nav>;
}
