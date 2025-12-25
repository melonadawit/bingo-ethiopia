import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Wallet, History, Settings, ChevronRight, ChevronLeft, Trophy, Calendar, Gift, Flame, Plus, Minus } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useBalanceSync } from '../hooks/useBalanceSync';

export default function Layout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const { user } = useAuth();

    // Real-time balance sync
    const syncedUser = useBalanceSync();
    const displayBalance = syncedUser?.balance || user?.balance || 0;

    const navItems = [
        { icon: Home, label: 'Game Lobby', path: '/lobby' },
        { icon: Trophy, label: 'Tournaments', path: '/tournaments', badge: 'Live' },
        { icon: Calendar, label: 'Events', path: '/events' },
        { icon: Gift, label: 'Referral', path: '/referral' },
        { icon: Flame, label: 'Daily Bonus', path: '/daily-bonus' },
        { icon: Trophy, label: 'Leaderboard', path: '/leaderboard' },
        { icon: Wallet, label: 'Wallet', path: '/wallet' },
        { icon: History, label: 'History', path: '/history' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    const isGamePage = location.pathname.startsWith('/game');

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-yellow-500/30">
            {/* Floating Mobile Menu Button - Hidden on game pages */}
            {/* Drawer Handle (Chevron) - Hidden on game pages */}
            {!isGamePage && (
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className={cn(
                        "lg:hidden fixed top-6 z-50 p-2 pl-1 pr-3 shadow-lg shadow-indigo-500/20 transition-all duration-300 flex items-center gap-1",
                        isSidebarOpen
                            ? "left-64 ml-4 bg-slate-800 rounded-full border border-slate-700 text-white"
                            : "left-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-r-xl"
                    )}
                >
                    {isSidebarOpen ? <ChevronLeft size={20} /> : <ChevronRight size={24} />}
                </button>
            )}

            <div className="flex">
                {/* Sidebar */}
                <AnimatePresence>
                    {(isSidebarOpen || window.innerWidth >= 1024) && (
                        <motion.aside
                            initial={{ x: -320 }}
                            animate={{ x: 0 }}
                            exit={{ x: -320 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className={cn(
                                "fixed lg:relative inset-y-0 left-0 z-40 w-80 flex flex-col justify-between",
                                "bg-[#0f172a]/95 backdrop-blur-2xl border-r border-slate-800/50",
                                "lg:transform-none"
                            )}
                        >
                            {/* Decorative Ethiopian Gradient Line */}
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-green-500 via-yellow-500 to-red-500 opacity-80" />

                            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                {/* Profile & Balance Section - NOW AT TOP */}
                                <div className="mb-8 relative">
                                    <div className="relative z-10 bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 backdrop-blur-sm overflow-hidden group">
                                        {/* Glow effect */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-yellow-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                        <div className="flex items-center gap-4 mb-4 relative z-10">
                                            <div className="relative">
                                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-lg ring-2 ring-slate-700">
                                                    {user?.firstName?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-slate-800 animate-pulse"></div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-slate-400">Welcome back,</p>
                                                <p className="text-base font-bold text-white truncate leading-tight">
                                                    {(() => {
                                                        const tgUser = (window as any).Telegram?.WebApp?.initDataUnsafe?.user;
                                                        return user?.firstName || user?.username || tgUser?.first_name || 'Player';
                                                    })()}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Smart Balance Display */}
                                        <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-700/50 flex flex-col relative z-10">
                                            <span className="text-xs text-slate-400 font-medium mb-1">Total Balance</span>
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-200">
                                                    {displayBalance.toLocaleString()}
                                                </span>
                                                <span className="text-xs text-yellow-500 font-bold">Birr</span>
                                            </div>
                                        </div>

                                        {/* Quick Actions */}
                                        <div className="grid grid-cols-2 gap-2 mt-3 relative z-10">
                                            <Link to="/wallet" className="flex items-center justify-center gap-1 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-xs font-bold py-2 rounded-lg transition-colors border border-green-600/20">
                                                <Plus size={14} /> Deposit
                                            </Link>
                                            <Link to="/wallet" className="flex items-center justify-center gap-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs font-bold py-2 rounded-lg transition-colors border border-red-600/20">
                                                <Minus size={14} /> Withdraw
                                            </Link>
                                        </div>
                                    </div>
                                </div>

                                {/* Navigation */}
                                <nav className="space-y-1.5">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Menu</p>
                                    {navItems.map((item) => {
                                        const isActive = location.pathname === item.path;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => setIsSidebarOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative",
                                                    isActive
                                                        ? "text-white bg-gradient-to-r from-indigo-600/20 to-purple-600/10 border border-indigo-500/20"
                                                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                                                )}
                                            >
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeNav"
                                                        className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/10 to-transparent opacity-50"
                                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                                    />
                                                )}

                                                {/* Icon Container with subtle glow on active */}
                                                <div className={cn(
                                                    "p-2 rounded-lg transition-colors",
                                                    isActive ? "bg-indigo-500/20 text-indigo-300" : "bg-slate-800/50 text-slate-400 group-hover:text-white group-hover:bg-slate-700"
                                                )}>
                                                    <item.icon size={18} />
                                                </div>

                                                <span className="font-medium flex-1">{item.label}</span>

                                                {/* Smart Badge */}
                                                {(item as any).badge && (
                                                    <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                                                        {(item as any).badge}
                                                    </span>
                                                )}

                                                {/* Hover indicator */}
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity translate-x-1 group-hover:translate-x-0" />
                                            </Link>
                                        );
                                    })}
                                </nav>
                            </div>

                            {/* Footer / Logout */}
                            {/* Footer / Logo - Reduced size */}
                            {/* Footer / Logo - Premium & Compact */}
                            <div className="p-2 border-t border-slate-800/50 bg-[#0b1120]/50 backdrop-blur-md text-center">
                                <h1 className="text-2xl font-black tracking-tight scale-y-110">
                                    <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                                        BINGO ETHIOPIA
                                    </span>
                                </h1>
                                <p className="text-[10px] text-slate-500 font-medium tracking-widest mt-0.5 opacity-60">OFFICIAL V3.2</p>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Main Content */}
                <main className="flex-1 min-w-0 min-h-screen relative overflow-hidden bg-[#0B1120]">
                    {/* Atmospheric Background Effects */}
                    <div className="fixed inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-900/20 rounded-full blur-[120px] mix-blend-screen opacity-30" />
                        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[100px] mix-blend-screen opacity-20" />
                    </div>

                    <Outlet />
                </main>
            </div>
        </div>
    );
}
