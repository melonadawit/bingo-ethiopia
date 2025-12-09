import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NumberDisplayProps {
    currentNumber: number | null;
    history: number[];
}

export const NumberDisplay: React.FC<NumberDisplayProps> = ({ currentNumber, history }) => {
    return (
        <div className="flex flex-col items-center gap-4 mb-6">
            {/* Current Large Number */}
            <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <motion.div
                    key={currentNumber}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative w-24 h-24 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center border-4 border-white/10 shadow-2xl"
                >
                    <span className="text-4xl font-extrabold text-white">
                        {currentNumber || '-'}
                    </span>
                </motion.div>
            </div>

            {/* History Strip */}
            <div className="flex gap-2 p-2 bg-black/20 rounded-full overflow-hidden max-w-full">
                <AnimatePresence>
                    {history.slice(-5).reverse().map((num, i) => (
                        <motion.div
                            key={`${num}-${i}`}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-medium text-white/60"
                        >
                            {num}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};
