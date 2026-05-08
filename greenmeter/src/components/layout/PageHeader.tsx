interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between pb-4">
      <div>
        <h1 className="text-[16px] font-bold text-[var(--tx1)]">{title}</h1>
        {description && (
          <p className="mt-0.5 text-[12px] text-[var(--tx3)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
