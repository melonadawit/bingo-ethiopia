import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

interface ConnectionStatusProps {
    status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
    error?: string | null;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, error }) => {
    if (status === 'connected' && !error) return null;

    const getStatusConfig = () => {
        switch (status) {
            case 'connecting':
                return {
                    icon: <Loader2 className="w-4 h-4 animate-spin" />,
                    text: 'Connecting...',
                    color: 'bg-yellow-500/90',
                };
            case 'reconnecting':
                return {
                    icon: <Loader2 className="w-4 h-4 animate-spin" />,
                    text: 'Reconnecting...',
                    color: 'bg-orange-500/90',
                };
            case 'disconnected':
                return {
                    icon: <WifiOff className="w-4 h-4" />,
                    text: error || 'Disconnected',
                    color: 'bg-red-500/90',
                };
            default:
                return {
                    icon: <Wifi className="w-4 h-4" />,
                    text: 'Connected',
                    color: 'bg-green-500/90',
                };
        }
    };

    const config = getStatusConfig();

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className={`fixed top-4 right-4 z-50 ${config.color} text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-semibold`}
                style={{
                    backdropFilter: 'blur(10px)',
                }}
            >
                {config.icon}
                <span>{config.text}</span>
            </motion.div>
        </AnimatePresence>
    );
};
