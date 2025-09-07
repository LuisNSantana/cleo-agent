'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Check, 
  MessageSquare, 
  Eye, 
  Trash2, 
  RotateCcw,
  Filter,
  Inbox,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles,
  ChevronRight,
  Settings,
  Archive,
  Search,
  Star,
  TrendingUp
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Simple relative time function
function timeAgo(date: string) {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString();
}

interface TaskNotification {
  id: string;
  task_id: string;
  agent_id: string;
  agent_name: string;
  agent_avatar?: string;
  notification_type: 'task_completed' | 'task_failed' | 'task_scheduled' | 'task_reminder';
  title: string;
  message: string;
  task_result?: Record<string, any>;
  error_details?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  read: boolean;
  read_at?: string;
  action_buttons?: Array<{
    id: string;
    label: string;
    action_type: string;
    action_data?: Record<string, any>;
    style?: string;
  }>;
  created_at: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  by_type: Record<string, number>;
  by_priority: Record<string, number>;
}

export default function NotificationInbox() {
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, { msg?: boolean; sum?: boolean }>>({});
  const [filter, setFilter] = useState<{
    unread_only: boolean;
    notification_type?: string;
    priority?: string;
  }>({
    unread_only: false
  });

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.unread_only) params.append('unread_only', 'true');
      if (filter.notification_type) params.append('notification_type', filter.notification_type);
      if (filter.priority) params.append('priority', filter.priority);

      const response = await fetch(`/api/notifications?${params}`);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/notifications?stats=true');
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: notificationId,
          action: 'mark_read'
        })
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, read: true, read_at: new Date().toISOString() }
              : n
          )
        );
        fetchStats(); // Update stats
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Send notification to chat
  const sendToChat = async (notificationId: string, targetChatId?: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_id: notificationId,
          action: 'send_to_chat',
          target_chat_id: targetChatId
        })
      });

      if (response.ok) {
        // Mark as read and show success
        await markAsRead(notificationId);
        alert('Notification sent to chat!');
      }
    } catch (error) {
      console.error('Error sending to chat:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchNotifications(), fetchStats()]);
      setLoading(false);
    };

    loadData();
  }, [filter]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task_completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'task_failed': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'task_scheduled': return <Calendar className="w-4 h-4 text-blue-500" />;
      case 'task_reminder': return <Bell className="w-4 h-4 text-yellow-500" />;
      default: return <Inbox className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Notification Inbox</h1>
          {stats && stats.unread > 0 && (
            <Badge variant="destructive">{stats.unread} unread</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem 
                onClick={() => setFilter({ unread_only: !filter.unread_only })}
              >
                <Check className={`w-4 h-4 mr-2 ${filter.unread_only ? 'opacity-100' : 'opacity-0'}`} />
                Unread only
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilter({ unread_only: false })}>
                All notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter({ unread_only: false, notification_type: 'task_completed' })}>
                Completed tasks
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter({ unread_only: false, notification_type: 'task_failed' })}>
                Failed tasks
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-500">{stats.unread}</div>
              <p className="text-xs text-muted-foreground">Unread</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-500">
                {stats.by_type.task_completed || 0}
              </div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-orange-500">
                {stats.by_type.task_failed || 0}
              </div>
              <p className="text-xs text-muted-foreground">Failed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications List */}
      <div className="space-y-4">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
              <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No notifications found</p>
              <p className="text-sm">Your agent task notifications will appear here</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`${!notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(notification.notification_type)}
                      <div className={`w-2 h-2 rounded-full ${getPriorityColor(notification.priority)}`} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{notification.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        by {notification.agent_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {notification.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(notification.created_at)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className={`text-sm mb-4 prose prose-sm max-w-none relative ${expanded[notification.id]?.msg ? '' : 'max-h-24 overflow-hidden'}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {notification.message}
                  </ReactMarkdown>
                  {!expanded[notification.id]?.msg && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white/90 via-white/60 to-transparent dark:from-gray-900/90 dark:via-gray-900/60"></div>
                  )}
                </div>
                <div className="-mt-2 mb-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setExpanded(prev => ({
                      ...prev,
                      [notification.id]: { ...(prev[notification.id] || {}), msg: !prev[notification.id]?.msg }
                    }))}
                  >
                    {expanded[notification.id]?.msg ? 'Ver menos' : 'Ver más'}
                  </Button>
                </div>

                {/* Task Result */}
                {notification.task_result && (
                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <h4 className="font-medium text-sm mb-2">Result Details:</h4>
                    <div className="text-xs space-y-2">
                      {notification.task_result.summary && (
                        <div>
                          <div className={`prose prose-sm max-w-none relative ${expanded[notification.id]?.sum ? '' : 'max-h-24 overflow-hidden'}`}>
                            <strong>Summary:</strong>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {String(notification.task_result.summary)}
                            </ReactMarkdown>
                            {!expanded[notification.id]?.sum && (
                              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-gray-50 via-gray-50/60 to-transparent"></div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs mt-1"
                            onClick={() => setExpanded(prev => ({
                              ...prev,
                              [notification.id]: { ...(prev[notification.id] || {}), sum: !prev[notification.id]?.sum }
                            }))}
                          >
                            {expanded[notification.id]?.sum ? 'Ver menos' : 'Ver más'}
                          </Button>
                        </div>
                      )}
                      {notification.task_result.execution_time && (
                        <p><strong>Execution Time:</strong> {notification.task_result.execution_time}ms</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Error Details */}
                {notification.error_details && (
                  <div className="bg-red-50 p-3 rounded-lg mb-4">
                    <h4 className="font-medium text-sm mb-2 text-red-700">Error Details:</h4>
                    <p className="text-xs text-red-600">{notification.error_details}</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  {!notification.read && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Mark Read
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => sendToChat(notification.id)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Open in Chat
                  </Button>

                  {notification.notification_type === 'task_failed' && (
                    <Button variant="outline" size="sm">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Retry Task
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
