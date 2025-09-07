'use client';

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotificationStats } from '@/hooks/use-notification-stats';
import { useRouter } from 'next/navigation';

export function NotificationIndicator() {
  const { stats } = useNotificationStats();
  const router = useRouter();

  const handleClick = () => {
    router.push('/agents/notifications');
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="relative"
    >
      <Bell className="w-5 h-5" />
      {stats && stats.unread > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {stats.unread > 99 ? '99+' : stats.unread}
        </Badge>
      )}
    </Button>
  );
}
