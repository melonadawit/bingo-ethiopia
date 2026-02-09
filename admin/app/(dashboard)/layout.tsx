'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
    LayoutDashboard,
    Gamepad2,
    Users,
    Wallet,
    Settings,
    LogOut,
    Menu,
    X,
    Megaphone,
    ShieldAlert,
    Bot,
    Trophy,
    Sparkles,
    Shield,
    PanelLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LiveFeed } from '@/components/live-feed';
import { CommandMenu } from '@/components/command-menu';
import { NotificationsPopover } from '@/components/notifications-popover';

const sidebarItems = [
    { href: '/overview', label: 'Overview', icon: LayoutDashboard },
    { href: '/games', label: 'Live Games', icon: Gamepad2 },
    { href: '/users', label: 'Users', icon: Users },
    { href: '/finance', label: 'Finance', icon: Wallet },
    { href: '/marketing', label: 'Marketing', icon: Megaphone },
    { href: '/risk', label: 'Risk Console', icon: ShieldAlert },
    { href: '/tournaments', label: 'Tournaments & Events', icon: Trophy },
    { href: '/content', label: 'Content Studio', icon: Sparkles },
    { href: '/bot', label: 'Bot Studio', icon: Bot },
    { href: '/settings/team', label: 'Role Manager', icon: Shield },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [userRole, setUserRole] = useState<string>('readonly');
    const [userEmail, setUserEmail] = useState<string>('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
            } else {
                setUserEmail(session.user.email || '');
                // Fetch Role
                const { data: admin } = await supabase
                    .from('admin_users')
                    .select('role')
                    .eq('email', session.user.email)
                    .single();

                if (admin) setUserRole(admin.role);
                setIsLoading(false);
            }
        };
        checkAuth();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    // Role-based filtering
    const filteredItems = sidebarItems.filter(item => {
        if (userRole === 'super_admin') return true;

        switch (userRole) {
            case 'finance':
                return ['/overview', '/finance', '/users'].includes(item.href);
            case 'marketing':
                return ['/overview', '/marketing', '/users'].includes(item.href);
            case 'ops':
                return ['/overview', '/games', '/users', '/risk', '/bot'].includes(item.href);
            default: // readonly
                return ['/overview', '/games'].includes(item.href);
        }
    });

    // Strict Access Control
    useEffect(() => {
        if (!isLoading && userRole !== 'super_admin') {
            const allowedPaths = filteredItems.map(i => i.href);
            // Also allow sub-paths (e.g., /users/123) if /users is allowed
            const isAllowed = allowedPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));

            // Overview is always safe fallback
            if (!isAllowed && pathname !== '/overview') {
                router.push('/overview');
                // Optional: toast.error("Unauthorized access");
            }
        }
    }, [pathname, userRole, isLoading, filteredItems, router]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 lg:static lg:translate-x-0 border-r border-gray-200 dark:border-gray-800",
                    isSidebarOpen ? "w-64" : "w-0 lg:w-20 -translate-x-full lg:translate-x-0"
                )}
            >
                <div className="flex h-full flex-col">
                    {/* Header */}
                    <div className={cn("flex h-16 items-center border-b px-6", !isSidebarOpen && "justify-center px-2")}>
                        {isSidebarOpen ? (
                            <span className="text-xl font-bold text-primary">BingoAdmin</span>
                        ) : (
                            <span className="text-xl font-bold text-primary">B</span>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-1 px-3 py-4">
                        {filteredItems.map((item) => {
                            const Icon = item.icon;
                            // ... existing render logic ...
                            const isActive = pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                                    )}
                                >
                                    <Icon className={cn("h-5 w-5", isSidebarOpen ? "mr-3" : "mx-auto")} />
                                    {isSidebarOpen && item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Footer */}
                    <div className="border-t p-4 space-y-2">
                        {isSidebarOpen && (
                            <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded text-xs text-center text-green-600 font-mono">
                                v2.3
                            </div>
                        )}
                        <Button
                            variant="outline"
                            className={cn("w-full text-red-500 hover:text-red-600 hover:bg-red-50", isSidebarOpen ? "justify-start" : "justify-center px-0")}
                            onClick={handleLogout}
                            title="Logout"
                        >
                            <LogOut className={cn("h-4 w-4", isSidebarOpen && "mr-3")} />
                            {isSidebarOpen && "Logout"}
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Topbar */}
                <header className="flex h-16 items-center justify-between border-b bg-white dark:bg-gray-800 px-6 shadow-sm">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    >
                        {isSidebarOpen ? <PanelLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </Button>
                    <div className="flex items-center space-x-4">
                        <NotificationsPopover />
                        <span className="text-sm font-medium text-gray-500 capitalize">
                            {userEmail} • <span className={userRole === 'super_admin' ? "text-blue-600 font-bold" : "text-green-600"}>{userRole.replace('_', ' ')}</span>
                        </span>
                    </div>
                </header>

                {/* content */}
                <main className="flex-1 overflow-y-auto p-6 relative">
                    {children}
                    <LiveFeed />
                </main>
            </div>
            <CommandMenu />
        </div>
    );
}
