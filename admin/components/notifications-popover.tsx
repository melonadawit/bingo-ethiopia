"use client"

import * as React from "react"
import { Bell, Check, ShieldAlert, CreditCard, MessageSquare, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { useQuery } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';


export function NotificationsPopover() {

    // Use TanStack Query
    const { data: serverNotifs = [] } = useQuery({
        queryKey: ['admin-notifications'],
        queryFn: async () => {
            const res = await fetchAdmin('/notifications');
            return res.notifications || [];
        },
        refetchInterval: 10000,
    });

    const [open, setOpen] = React.useState(false);
    const [localNotifs, setLocalNotifs] = React.useState<any[]>([]);

    // Sync server data to local state (to allow "marking as read" locally)
    React.useEffect(() => {
        if (serverNotifs.length > 0) {
            setLocalNotifs(prev => {
                // Merge new items
                const newItems = serverNotifs.filter((n: any) => !prev.find(p => p.id === n.id));
                return [...newItems, ...prev].slice(0, 50); // Keep last 50
            });
        }
    }, [serverNotifs]);

    const notifs = localNotifs;
    const unreadCount = notifs.filter(n => !n.read).length;

    const markAllRead = () => {
        setLocalNotifs(notifs.map(n => ({ ...n, read: true })));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'risk': return <ShieldAlert className="h-4 w-4 text-red-500" />;
            case 'ticket': return <MessageSquare className="h-4 w-4 text-blue-500" />;
            case 'finance': return <CreditCard className="h-4 w-4 text-green-500" />;
            default: return <Bell className="h-4 w-4 text-gray-500" />;
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 animate-pulse border border-white dark:border-gray-900" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 mr-4" align="end">
                <div className="flex items-center justify-between p-4 border-b">
                    <h4 className="font-semibold text-sm">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={markAllRead} className="h-auto px-2 text-xs text-blue-500 hover:text-blue-600">
                            Mark all read
                        </Button>
                    )}
                </div>
                <ScrollArea className="h-[300px]">
                    {notifs.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            No notifications
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifs.map((item) => (
                                <div
                                    key={item.id}
                                    className={cn(
                                        "p-4 hover:bg-muted/50 transition-colors cursor-pointer flex gap-3 items-start",
                                        !item.read && "bg-blue-50/50 dark:bg-blue-900/10"
                                    )}
                                >
                                    <div className={cn("p-2 rounded-full bg-muted mt-0.5", !item.read && "bg-white shadow-sm dark:bg-gray-800")}>
                                        {getIcon(item.type)}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <p className={cn("text-xs font-medium leading-none", !item.read && "font-bold text-primary")}>
                                            {item.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {item.desc}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/70">
                                            {item.time}
                                        </p>
                                    </div>
                                    {!item.read && (
                                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
