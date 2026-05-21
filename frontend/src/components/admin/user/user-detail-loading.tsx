import { Card, CardContent } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function UserDetailLoading() {
  return (
    <Card>
      <CardContent className="h-96 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </CardContent>
    </Card>
  );
}
