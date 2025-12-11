import { useState } from 'react';
import { User, Bell, Shield, HelpCircle, LogOut, ChevronRight, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

const Settings = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [darkMode, setDarkMode] = useState(true);
    const [notifications, setNotifications] = useState(true);

    const handleLogout = () => {
        logout();
        navigate('/lobby');
    };

    type SettingsItem = {
        icon: any;
        label: string;
        action: () => void;
        toggle?: boolean;
        value?: boolean;
    };

    const settingsSections: { title: string; items: SettingsItem[] }[] = [
        {
            title: 'Account',
            items: [
                { icon: User, label: 'Profile Information', action: () => { } },
                { icon: Shield, label: 'Privacy & Security', action: () => { } },
            ]
        },
        {
            title: 'Preferences',
            items: [
                {
                    icon: darkMode ? Moon : Sun,
                    label: 'Dark Mode',
                    action: () => setDarkMode(!darkMode),
                    toggle: true,
                    value: darkMode
                },
                {
                    icon: Bell,
                    label: 'Notifications',
                    action: () => setNotifications(!notifications),
                    toggle: true,
                    value: notifications
                },
            ]
        },
        {
            title: 'Support',
            items: [
                { icon: HelpCircle, label: 'Help & FAQ', action: () => { } },
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-[#0B1120]">
            {/* Profile Header */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 mb-6 shadow-2xl shadow-purple-500/20"
            >
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-lg rounded-full flex items-center justify-center border-4 border-white/30">
                        <User size={40} className="text-white" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-black text-white">{user?.firstName || 'Player'}</h2>
                        <p className="text-white/80 text-sm">@{user?.username || 'user'}</p>
                        <div className="mt-2 bg-white/20 backdrop-blur-lg rounded-full px-3 py-1 inline-block">
                            <span className="text-white text-xs font-bold">Balance: {user?.balance || 1000} Birr</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Settings Sections */}
            <div className="space-y-6">
                {settingsSections.map((section, sectionIndex) => (
                    <motion.div
                        key={section.title}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: sectionIndex * 0.1 }}
                    >
                        <h3 className="text-slate-400 text-sm font-bold uppercase mb-3 px-2">{section.title}</h3>
                        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 overflow-hidden">
                            {section.items.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={item.action}
                                    className={cn(
                                        "w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors",
                                        index !== section.items.length - 1 && "border-b border-slate-800"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center">
                                            <item.icon size={20} className="text-indigo-400" />
                                        </div>
                                        <span className="text-white font-medium">{item.label}</span>
                                    </div>

                                    {item.toggle ? (
                                        <div className={cn(
                                            "w-12 h-6 rounded-full transition-colors relative",
                                            item.value ? "bg-indigo-600" : "bg-slate-700"
                                        )}>
                                            <div className={cn(
                                                "absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform",
                                                item.value ? "left-6" : "left-0.5"
                                            )} />
                                        </div>
                                    ) : (
                                        <ChevronRight size={20} className="text-slate-500" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Logout Button */}
            <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={handleLogout}
                className="w-full mt-6 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
            >
                <LogOut size={20} />
                Logout
            </motion.button>

            {/* App Info */}
            <div className="mt-8 text-center text-slate-500 text-sm">
                <p>Bingo Ethiopia v1.0.0</p>
                <p className="mt-1">Made with ❤️ in Ethiopia</p>
            </div>
        </div>
    );
};

export default Settings;
