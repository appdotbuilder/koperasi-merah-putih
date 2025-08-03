
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Notification } from '../../../server/src/schema';

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkAsRead: (id: number) => void;
}

export function NotificationCenter({ notifications, onMarkAsRead }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    const icons = {
      PAYMENT_DUE: '💳',
      LOAN_APPROVED: '✅',
      MEETING_REMINDER: '📅',
      SHU_DISTRIBUTION: '🎯',
      GENERAL: '📢'
    };
    return icons[type as keyof typeof icons] || '📢';
  };

  const getNotificationColor = (type: string) => {
    const colors = {
      PAYMENT_DUE: 'border-red-200 bg-red-50',
      LOAN_APPROVED: 'border-green-200 bg-green-50',
      MEETING_REMINDER: 'border-blue-200 bg-blue-50',
      SHU_DISTRIBUTION: 'border-purple-200 bg-purple-50',
      GENERAL: 'border-gray-200 bg-gray-50'
    };
    return colors[type as keyof typeof colors] || 'border-gray-200 bg-gray-50';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="relative border-red-200 text-red-600 hover:bg-red-50"
        >
          🔔
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3 bg-red-50 border-b border-red-100">
            <CardTitle className="text-lg font-semibold text-red-800 flex items-center justify-between">
              🔔 Notifikasi
              {unreadCount > 0 && (
                <Badge variant="destructive" className="bg-red-600">
                  {unreadCount} baru
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {notifications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {notifications
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((notification: Notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-full ${getNotificationColor(notification.type)}`}>
                          <span className="text-lg">
                            {getNotificationIcon(notification.type)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-medium ${
                              !notification.read ? 'text-gray-900' : 'text-gray-700'
                            }`}>
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <button
                                onClick={() => onMarkAsRead(notification.id)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Tandai dibaca
                              </button>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {notification.created_at.toLocaleDateString('id-ID')} • 
                            {notification.created_at.toLocaleTimeString('id-ID', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="text-4xl mb-4">📭</div>
                  <p className="text-gray-500 text-center font-medium">Tidak ada notifikasi</p>
                  <p className="text-gray-400 text-center text-sm mt-1">
                    Notifikasi akan muncul di sini
                  </p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
