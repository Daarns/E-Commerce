import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface UserInfoCardProps {
  title: string;
  items: Array<{
    label: string;
    value: React.ReactNode;
  }>;
}

export function UserInfoCard({ title, items }: UserInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, idx) => (
          <div key={idx}>
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p className="text-gray-900 font-medium">{item.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
