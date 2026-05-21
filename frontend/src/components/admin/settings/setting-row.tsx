import { Badge } from '@/components/ui/badge';

interface SettingRowProps {
  label: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
}

export function SettingRow({ label, description, badge, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between gap-6 py-4 border-b border-border/60 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{label}</p>
          {badge && <Badge variant="outline" className="text-xs">{badge}</Badge>}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
