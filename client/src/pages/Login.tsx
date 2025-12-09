import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { motion } from 'framer-motion';

export default function Login() {
    const handleTelegramLogin = () => {
        // Logic to open Telegram Widget or mock login
        console.log("Connect Telegram");
        // For demo/dev purposes, we might just redirect to lobby
        window.location.href = '/lobby';
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B1120] relative overflow-hidden p-4">
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen animate-blob" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-blob animation-delay-4000" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md relative z-10"
            >
                <Card variant="glass" className="p-8 text-center border-t border-white/10">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-indigo-500/30 mb-6">
                        <span className="text-3xl font-black text-white">B</span>
                    </div>

                    <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Welcome to Bingo.ET</h1>
                    <p className="text-slate-400 mb-8">The most exciting real-money Bingo game in Ethiopia. Connect with Telegram to start winning.</p>

                    <Button
                        size="lg"
                        className="w-full bg-[#2AABEE] hover:bg-[#229ED9] text-white shadow-lg shadow-cyan-500/20"
                        onClick={handleTelegramLogin}
                    >
                        <span className="mr-2">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.622 23.984C11.586 23.992 11.765 24 11.944 24c4.898 0 9.07-2.923 11.028-7.143l-4.167-2.083c-1.353 2.916-4.238 4.976-7.666 4.976-4.962 0-9-4.038-9-9s4.038-9 9-9c4.962 0 9 4.038 9 9l2.083-4.167A12.01 12.01 0 0 0 12 0z" fill="none" /> {/* Placeholder SVG path actually */}
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z" />
                            </svg>
                        </span>
                        Login with Telegram
                    </Button>

                    <p className="mt-6 text-xs text-slate-500">
                        By connecting, you agree to our Terms of Service.
                        <br />Must be 18+ to play.
                    </p>
                </Card>
            </motion.div>
        </div>
    );
}
