interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="ph">
      <div>
        <div className="ptitle">{title}</div>
        {description && <div className="psub">{description}</div>}
      </div>
      {actions && <div className="ph-acts">{actions}</div>}
    </div>
  );
}
