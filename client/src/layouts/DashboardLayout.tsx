import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, Wallet, History, Settings, LogOut, Menu, X, User } from 'lucide-react';
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
        { icon: Wallet, label: 'Wallet', path: '/wallet' },
        { icon: History, label: 'History', path: '/history' },
        { icon: Settings, label: 'Settings', path: '/settings' },
    ];

    return (
        <div className="min-h-screen bg-[#0B1120] text-slate-100 font-sans selection:bg-indigo-500/30">
            {/* Mobile Nav Header */}
            <div className="lg:hidden flex items-center justify-between p-4 bg-slate-900/50 backdrop-blur-lg border-b border-slate-800 sticky top-0 z-50">
                <span className="text-xl font-black bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">BINGO.ET</span>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-white">
                    {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

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
                                <div className="hidden lg:flex items-center gap-3 mb-12">
                                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                        <span className="text-xl font-bold text-white">B</span>
                                    </div>
                                    <span className="text-2xl font-black tracking-tight text-white">BINGO<span className="text-indigo-400">.ET</span></span>
                                </div>

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
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-yellow-400 to-orange-500 flex items-center justify-center font-bold text-slate-900">
                                        TG
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-white truncate">Bereket T.</p>
                                        <p className="text-xs text-slate-400 truncate">@bereket_tg</p>
                                    </div>
                                </div>
                                <button className="w-full flex items-center justify-center gap-2 text-xs font-medium text-red-400 hover:text-red-300 py-2 hover:bg-red-500/10 rounded-lg transition">
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

                    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
