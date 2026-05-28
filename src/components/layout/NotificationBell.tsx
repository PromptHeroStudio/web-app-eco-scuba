import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bell, CheckCircle, Info, AlertTriangle } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Notification } from "@/types";

export default function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isPingActive, setIsPingActive] = useState(false);

    const activatePing = useCallback(() => {
        setIsPingActive(true);
        window.setTimeout(() => setIsPingActive(false), 1200);
    }, []);

    const fetchNotifications = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from<Notification>('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.warn('Notifications fetch stalled:', error.message);
                return;
            }

            if (data) {
                setNotifications(data);
                setUnreadCount(data.filter((notification) => !notification.is_read).length);
            }
        } catch (err) {
            console.error('Critical notifications error:', err);
        }
    }, []);

    const subscribeToNotifications = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return () => undefined;

        const channel = supabase
            .channel(`notifications-user-${user.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`,
            }, (payload) => {
                const newNotification = payload.new as Notification;
                setNotifications((prev) => [newNotification, ...prev].slice(0, 10));
                setUnreadCount((prev) => prev + 1);
                activatePing();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activatePing]);

    useEffect(() => {
        void fetchNotifications();
        let cleanup = () => undefined;

        void subscribeToNotifications().then((disposer) => {
            if (typeof disposer === 'function') cleanup = disposer;
        }).catch((err) => {
            console.error('Notification subscription failed:', err);
        });

        return cleanup;
    }, [fetchNotifications, subscribeToNotifications]);

    const markAllAsRead = useCallback(async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .not('is_read', 'is', true);

            if (error) {
                console.error('Failed to mark notifications as read:', error.message);
                return;
            }

            setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Mark all as read failed:', err);
        }
    }, []);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-300 border border-transparent hover:border-white/10"
                    aria-label="Notifikacije"
                >
                    {isPingActive && (
                        <motion.span
                            initial={{ scale: 0.8, opacity: 0.8 }}
                            animate={{ scale: [0.8, 1.4, 1], opacity: [0.8, 0.2, 0] }}
                            transition={{ duration: 1.2, ease: 'easeOut' }}
                            className="absolute inset-0 rounded-full bg-primary/20"
                        />
                    )}
                    <Bell className="h-5 w-5 relative z-10" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-white flex items-center justify-center shadow-lg shadow-primary/50">
                            {unreadCount}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 bg-bg-secondary border-border shadow-2xl rounded-2xl overflow-hidden" align="end">
                <div className="p-4 border-b border-border flex items-center justify-between bg-bg-tertiary/50">
                    <h3 className="font-bold text-sm">Notifikacije</h3>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] uppercase tracking-widest font-bold" onClick={markAllAsRead}>
                        Označi sve pročitano
                    </Button>
                </div>
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {notifications.length > 0 ? (
                        notifications.map((n) => (
                            <div
                                key={n.id}
                                className={`p-4 border-b border-border last:border-0 hover:bg-white/5 transition-colors cursor-pointer relative ${!n.is_read ? 'bg-primary/5' : ''}`}
                            >
                                {!n.is_read && <div className="absolute right-4 top-4 h-2 w-2 rounded-full bg-primary" />}
                                <div className="flex gap-3">
                                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${n.type === 'project_update' ? 'bg-blue-500/10 text-blue-500' :
                                        n.type === 'approval_needed' ? 'bg-amber-500/10 text-amber-500' :
                                            'bg-primary/10 text-primary'
                                        }`}>
                                        {n.type === 'project_update' ? <Info className="h-4 w-4" /> :
                                            n.type === 'approval_needed' ? <AlertTriangle className="h-4 w-4" /> :
                                                <CheckCircle className="h-4 w-4" />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold leading-tight mb-1">{n.title}</p>
                                        <p className="text-[11px] text-muted-foreground line-clamp-2">{n.message}</p>
                                        <p className="text-[9px] text-text-dim mt-2 uppercase tracking-wide">
                                            {new Date(n.created_at).toLocaleTimeString('bs', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-12 text-center text-muted-foreground">
                            <Bell className="h-10 w-10 mx-auto mb-4 opacity-10" />
                            <p className="text-sm">Nema novih obavještenja</p>
                        </div>
                    )}
                </div>
                <div className="p-3 border-t border-border bg-bg-tertiary/50 text-center">
                    <Button variant="link" className="text-[11px] h-6 uppercase tracking-widest font-bold text-primary">Vidi sve obavijesti</Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
