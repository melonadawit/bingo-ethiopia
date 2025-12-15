import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Wallet, History, Settings, LogOut, Menu, X, User, Trophy } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const { user, logout } = useAuth();

    const navItems = [
        { icon: Home, label: 'Game Lobby', path: '/lobby' },
        { icon: Trophy, label: 'Leaderboard', path: '/leaderboard' },
        { icon: Wallet, label: 'Wallet', path: '/wallet' },
        { icon: History, label: 'History', path: '/history' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    const isGamePage = location.pathname.startsWith('/game');

    return (
        <div className="min-h-screen bg-[#0B1120] text-slate-100 font-sans selection:bg-indigo-500/30">
            {/* Floating Mobile Menu Button - Hidden on game pages */}
            {!isGamePage && (
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="lg:hidden fixed top-4 right-4 z-50 p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-500 transition-all"
                >
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            )}

            <div className="flex">
                {/* Sidebar */}
                <AnimatePresence>
                    {(isSidebarOpen || window.innerWidth >= 1024) && (
                        <motion.aside
                            initial={{ x: -300 }}
                            animate={{ x: 0 }}
                            exit={{ x: -300 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className={cn(
                                "fixed lg:relative inset-y-0 left-0 z-40 w-72 bg-slate-900/90 backdrop-blur-xl border-r border-slate-800 p-6 flex flex-col justify-between",
                                "lg:transform-none lg:bg-transparent lg:backdrop-blur-none"
                            )}
                        >
                            <div>
                                <nav className="space-y-2">
                                    {navItems.map((item) => {
                                        const isActive = location.pathname === item.path;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => setIsSidebarOpen(false)}
                                                className={cn(
                                                    "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden",
                                                    isActive
                                                        ? "text-white bg-indigo-600/10 shadow-[0_0_20px_rgba(79,70,229,0.1)]"
                                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                                )}
                                            >
                                                {isActive && <motion.div layoutId="activeNav" className="absolute left-0 w-1 h-6 bg-indigo-500 rounded-r-full" />}
                                                <item.icon size={20} className={cn("transition-colors", isActive ? "text-indigo-400" : "group-hover:text-slate-200")} />
                                                <span className="font-medium">{item.label}</span>
                                            </Link>
                                        );
                                    })}
                                </nav>
                            </div>

                            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center">
                                        <User size={20} className="text-white" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">
                                            {user?.username || user?.firstName || 'Player'}
                                        </p>
                                        <p className="text-xs text-slate-400 truncate">
                                            {user?.balance || 0} Birr
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={logout}
                                    className="w-full flex items-center justify-center gap-2 text-xs font-medium text-red-400 hover:text-red-300 py-2 hover:bg-red-500/10 rounded-lg transition"
                                >
                                    <LogOut size={14} />
                                    Disconnect
                                </button>
                            </div>
                        </motion.aside>
                    )}
                </AnimatePresence>

                {/* Main Content */}
                <main className="flex-1 min-w-0 min-h-screen relative overflow-hidden">
                    {/* Background Blobs */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen animate-blob" />
                        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-blob animation-delay-2000" />
                    </div>

                    <Outlet />
                </main>
            </div>
        </div>
    );
}
