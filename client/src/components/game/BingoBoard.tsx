import React from 'react';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';

interface BingoBoardProps {
    board: number[][]; // 5x5 matrix
    marked: boolean[][]; // 5x5 matrix tracking marked cells
    onCellClick: (row: number, col: number) => void;
}

export const BingoBoard: React.FC<BingoBoardProps> = ({ board, marked, onCellClick }) => {
    return (
        <div className="grid grid-cols-5 gap-2 p-2 bg-secondary/20 rounded-xl backdrop-blur-sm border border-white/10">
            {board.map((row, rIndex) => (
                <React.Fragment key={rIndex}>
                    {row.map((num, cIndex) => (
                        <motion.button
                            key={`${rIndex}-${cIndex}`}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => onCellClick(rIndex, cIndex)}
                            className={cn(
                                "aspect-square flex items-center justify-center rounded-lg text-lg font-bold transition-all duration-300",
                                marked[rIndex][cIndex]
                                    ? "bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/25 ring-2 ring-primary/50"
                                    : "bg-white/5 text-white/80 hover:bg-white/10"
                            )}
                        >
                            {num === 0 ? 'FREE' : num}
                        </motion.button>
                    ))}
                </React.Fragment>
            ))}
        </div>
    );
};
