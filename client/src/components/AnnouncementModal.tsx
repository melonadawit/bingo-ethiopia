import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ExternalLink, Star } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';

export function AnnouncementModal() {
    const { config } = useConfig();
    const location = useLocation();
    const [isOpen, setIsOpen] = useState(false);
    const announcement = config.features.announcement;

    // Only show on Lobby
    // if (location.pathname !== '/lobby') return null; // MOVED TO BOTTOM to avoid hook errors

    useEffect(() => {
        if (announcement && announcement.enabled && announcement.id) {
            // Changed to sessionStorage so it shows once per session (app open)
            const seenId = sessionStorage.getItem('seen_announcement_id');
            if (seenId !== announcement.id) {
                // Delay slightly for dramatic effect
                const timer = setTimeout(() => setIsOpen(true), 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [announcement]);

    const handleClose = () => {
        setIsOpen(false);
        if (announcement?.id) {
            sessionStorage.setItem('seen_announcement_id', announcement.id);
        }
    };

    // Valid check after hooks - prevents rendering but executes hooks
    if (location.pathname !== '/lobby') return null;

    if (!announcement || !isOpen) return null;

    if (!announcement || !isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="relative w-full max-w-sm bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Image Header */}
                        {announcement.image_url ? (
                            <div className="relative w-full h-48 sm:h-56 bg-zinc-800">
                                <img
                                    src={announcement.image_url}
                                    alt="Announcement"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 to-transparent" />
                            </div>
                        ) : (
                            <div className="w-full h-24 bg-gradient-to-r from-purple-900 to-blue-900 relative overflow-hidden">
                                <Star className="absolute top-4 right-4 text-white/10 w-32 h-32 rotate-12" />
                            </div>
                        )}

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <h2 className="text-2xl font-bold text-white leading-tight">
                                {announcement.title}
                            </h2>
                            <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                                {announcement.message}
                            </p>

                            {/* Action Button */}
                            {announcement.action_url && (
                                <a
                                    href={announcement.action_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={handleClose}
                                    className="flex items-center justify-center gap-2 w-full py-3 mt-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-purple-900/20"
                                >
                                    {announcement.action_text || 'Learn More'}
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            )}

                            {!announcement.action_url && (
                                <button
                                    onClick={handleClose}
                                    className="w-full py-3 mt-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors"
                                >
                                    Got it
                                </button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
