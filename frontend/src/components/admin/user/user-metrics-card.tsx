import { Card, CardContent } from '@/components/ui/card';

interface UserMetricsCardProps {
  label: string;
  value: number | undefined;
  color: 'green' | 'yellow' | 'red' | 'gray';
}

const colorMap = {
  green: 'text-green-600',
  yellow: 'text-yellow-600',
  red: 'text-red-600',
  gray: 'text-gray-900',
};

const labelColorMap = {
  green: 'text-gray-600',
  yellow: 'text-gray-600',
  red: 'text-gray-600',
  gray: 'text-gray-600',
};

export function UserMetricsCard({ label, value, color }: UserMetricsCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className={`text-sm ${labelColorMap[color]} mb-2`}>{label}</p>
        <p className={`text-3xl font-bold ${colorMap[color]}`}>{value || 0}</p>
      </CardContent>
    </Card>
  );
}
