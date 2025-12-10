import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';
import { Button } from '../components/ui/Button';
import { Loader2, Clock, X, ChevronDown, MoreVertical, Volume2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type GameStatus = 'connecting' | 'selection' | 'playing' | 'ended';
type BingoCard = {
    id: number;
    numbers: number[][]; // 5x5
};

// --- Mock Data Generators ---
const generateBingoCard = (id: number): BingoCard => {
    const card: number[][] = Array(5).fill(0).map(() => Array(5).fill(0));
    const used = new Set<number>();

    // B (1-15), I (16-30), N (31-45), G (46-60), O (61-75)
    for (let col = 0; col < 5; col++) {
        const min = col * 15 + 1;
        const max = min + 14;

        for (let row = 0; row < 5; row++) {
            if (col === 2 && row === 2) continue; // Free space

            let num;
            do {
                num = Math.floor(Math.random() * (max - min + 1)) + min;
            } while (used.has(num));

            used.add(num);
            card[row][col] = num;
        }
    }
    return { id, numbers: card };
};

// --- Components ---

const MasterBoard = ({ calledNumbers, lastCalled }: { calledNumbers: Set<number>, lastCalled: number | null }) => {
    return (
        <div className="bg-white rounded-xl p-1 shadow-lg h-full overflow-hidden flex flex-col">
            <div className="grid grid-cols-5 bg-indigo-600 rounded-t-lg mb-1">
                {['B', 'I', 'N', 'G', 'O'].map(letter => (
                    <div key={letter} className="text-center text-white font-bold py-1 text-xs">{letter}</div>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-5 gap-px bg-slate-100">
                    {Array.from({ length: 15 }, (_, i) => (
                        <React.Fragment key={i}>
                            {['B', 'I', 'N', 'G', 'O'].map((_, colIndex) => {
                                const num = i + 1 + (colIndex * 15);
                                const isCalled = calledNumbers.has(num);
                                const isLast = num === lastCalled;

                                return (
                                    <div
                                        key={num}
                                        className={cn(
                                            "aspect-square flex items-center justify-center text-[10px] sm:text-xs font-medium rounded-sm transition-colors",
                                            isLast ? "bg-orange-500 text-white font-bold animate-pulse" :
                                                isCalled ? "bg-green-500 text-white" : "bg-white text-slate-400"
                                        )}
                                    >
                                        {num}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        </div>
    );
};

const PlayingCard = ({ card, calledNumbers }: { card: BingoCard, calledNumbers: Set<number> }) => {
    return (
        <div className="bg-[#2A1B3D] rounded-xl p-3 shadow-xl border border-white/10 mb-4 max-w-sm mx-auto">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-t-lg py-1 px-4 mb-2 flex justify-between items-center shadow-lg">
                <span className="text-slate-900 font-bold text-xs uppercase">Cartela No: {card.id}</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {/* Headers */}
                {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
                    <div key={letter} className={cn(
                        "aspect-square flex items-center justify-center rounded-lg font-black text-white text-sm shadow-md",
                        ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-emerald-500', 'bg-orange-500'][i]
                    )}>
                        {letter}
                    </div>
                ))}

                {/* Numbers */}
                {card.numbers.map((row, r) => (
                    <React.Fragment key={r}>
                        {row.map((num, c) => {
                            const isCenter = r === 2 && c === 2;
                            const isCalled = num !== 0 && calledNumbers.has(num);

                            return (
                                <button
                                    key={`${r}-${c}`}
                                    disabled={isCenter || !isCalled}
                                    className={cn(
                                        "aspect-square flex items-center justify-center rounded-lg text-sm sm:text-base font-bold transition-all duration-200 shadow-sm",
                                        isCenter
                                            ? "bg-emerald-500 text-white animate-pulse"
                                            : isCalled
                                                ? "bg-orange-500 text-white shadow-orange-500/20"
                                                : "bg-white text-slate-800"
                                    )}
                                >
                                    {isCenter ? '★' : num}
                                </button>
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

const GamePage: React.FC = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [status, setStatus] = useState<GameStatus>('connecting');
    const [selectedCards, setSelectedCards] = useState<number[]>([]);
    const [myCards, setMyCards] = useState<BingoCard[]>([]);

    // Game State
    const [calledNumbers, setCalledNumbers] = useState<Set<number>>(new Set());
    const [currentNumber, setCurrentNumber] = useState<number | null>(null);
    const [timeLeft] = useState(25);
    const [history, setHistory] = useState<number[]>([]);

    // Mock initial data - 300 cards
    const availableCards = useMemo(() => Array.from({ length: 300 }, (_, i) => i + 1), []);

    useEffect(() => {
        if (!user) {
            navigate('/lobby');
            return;
        }

        // Simulate Connection
        const timer = setTimeout(() => {
            setStatus('selection');
        }, 1000);

        return () => clearTimeout(timer);
    }, [user, navigate]);

    // Cleanup socket on unmount
    useEffect(() => {
        return () => {
            socket.off('game_started');
            socket.off('number_drawn');
        };
    }, []);

    const handleSelectCard = (id: number) => {
        if (selectedCards.includes(id)) {
            setSelectedCards(prev => prev.filter(c => c !== id));
        } else {
            if (selectedCards.length < 2) {
                setSelectedCards(prev => [...prev, id]);
            }
        }
    };

    const startGame = () => {
        if (selectedCards.length === 0) return;

        // Generate actual cards for the game
        const cards = selectedCards.map(id => generateBingoCard(id));
        setMyCards(cards);

        setStatus('playing');

        // MOCK GAME LOGIC (Replace with Socket.io later)
        let count = 0;
        const interval = setInterval(() => {
            if (count > 75) {
                clearInterval(interval);
                return;
            }

            // Random number 1-75 that hasn't been called
            let num;
            do {
                num = Math.floor(Math.random() * 75) + 1;
            } while (calledNumbers.has(num));

            setCurrentNumber(num);
            setCalledNumbers(prev => new Set(prev).add(num));
            setHistory(prev => [num, ...prev].slice(0, 3));

            count++;
        }, 3000); // New number every 3 seconds

        return () => clearInterval(interval);
    };

    if (status === 'connecting') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#1a1b2e]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="text-white/60">Connecting to Room...</p>
            </div>
        );
    }

    if (status === 'selection') {
        return (
            <div className="min-h-screen bg-[#1a1b2e] flex flex-col text-white">
                {/* Header */}
                <header className="bg-slate-900 p-3 shadow-lg z-10">
                    <div className="flex justify-between items-center mb-2">
                        <X className="text-slate-400" onClick={() => navigate('/lobby')} />
                        <h1 className="font-bold text-lg">Online Bingo</h1>
                        <MoreVertical className="text-slate-400" />
                    </div>

                    {/* Compact Time Display */}
                    <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-lg p-2 text-center shadow-lg flex items-center justify-center gap-4">
                        <div className="flex items-center gap-1">
                            <Clock size={14} />
                            <span className="font-medium text-xs">Time:</span>
                            <span className="text-xl font-black">{timeLeft}s</span>
                        </div>
                        <div className="h-4 w-px bg-white/20" />
                        <div className="text-xs">
                            <span className="text-white/70">Players:</span> <span className="font-bold">24</span>
                        </div>
                        <div className="h-4 w-px bg-white/20" />
                        <div className="text-xs">
                            <span className="text-white/70">Prize:</span> <span className="font-bold">1,200 Birr</span>
                        </div>
                    </div>
                </header>

                {/* Selection Grid */}
                <div className="flex-1 p-4 overflow-y-auto pb-32">
                    <h2 className="text-center font-bold text-lg mb-4">Select Your Cards (Max 2)</h2>

                    <div className="grid grid-cols-7 gap-2 mb-4">
                        {availableCards.map(num => (
                            <button
                                key={num}
                                onClick={() => handleSelectCard(num)}
                                className={cn(
                                    "aspect-square rounded-lg flex items-center justify-center font-bold text-sm transition-all",
                                    selectedCards.includes(num)
                                        ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-slate-900 shadow-lg shadow-orange-500/20 transform scale-105"
                                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                )}
                            >
                                {num}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Selected Cards Preview - Fixed at Bottom */}
                {selectedCards.length > 0 && (
                    <div className="fixed bottom-16 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-700 p-4 z-20">
                        <h3 className="text-sm font-bold mb-2 text-center">Your Selected Cards</h3>
                        <div className="flex gap-2 justify-center">
                            {selectedCards.map(id => (
                                <div key={id} className="bg-gradient-to-br from-yellow-400 to-orange-500 text-slate-900 rounded-lg px-4 py-2 font-bold shadow-lg">
                                    #{id}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bottom Action */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900 border-t border-slate-800 z-30">
                    <Button
                        onClick={startGame}
                        disabled={selectedCards.length === 0}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 h-12 text-lg font-bold"
                    >
                        Confirm Selection ({selectedCards.length})
                    </Button>
                </div>
            </div>
        );
    }

    // PLAYING STATE
    return (
        <div className="min-h-screen bg-[#1a1b2e] flex flex-col text-white overflow-hidden">
            {/* Minimal Header */}
            <header className="bg-slate-900 px-4 py-2 flex items-center justify-between text-xs sm:text-sm border-b border-slate-800 z-20">
                <div className="flex items-center gap-4">
                    <X size={20} className="text-slate-400" onClick={() => navigate('/lobby')} />
                    <span className="font-bold">Online Bingo</span>
                </div>
                <div className="flex items-center gap-3">
                    <Volume2 size={20} className="text-slate-400" />
                    <ChevronDown size={20} className="text-slate-400" />
                </div>
            </header>

            {/* Game Info Bar */}
            <div className="bg-[#2A1B3D] grid grid-cols-4 divide-x divide-white/10 border-b border-white/5">
                {[
                    { label: 'Game ID', val: gameId?.slice(-6) || '...' },
                    { label: 'Players', val: '24' },
                    { label: 'Bet', val: '50' },
                    { label: 'Called', val: calledNumbers.size },
                ].map((item, i) => (
                    <div key={i} className={`p-2 text-center bg-gradient-to-b ${i === 2 ? 'from-emerald-900/50 to-emerald-900/20' : i === 3 ? 'from-pink-900/50 to-pink-900/20' : ''}`}>
                        <div className="text-[10px] text-white/50 uppercase">{item.label}</div>
                        <div className="font-bold text-sm sm:text-base">{item.val}</div>
                    </div>
                ))}
            </div>

            <div className="flex-1 overflow-hidden flex relative">
                {/* Left Panel: Master Board (50%) */}
                <div className="w-1/2 h-full p-2 bg-[#201530] border-r border-white/5 z-10 shrink-0">
                    <MasterBoard calledNumbers={calledNumbers} lastCalled={currentNumber} />
                </div>

                {/* Right Panel: Play Area (50%) */}
                <div className="w-1/2 relative flex flex-col h-full overflow-hidden">

                    {/* Top Section: Impressive Animated Call Display */}
                    <div className="h-[30%] min-h-[160px] bg-gradient-to-br from-purple-900/40 via-indigo-900/40 to-blue-900/40 p-4 flex items-center justify-center relative overflow-hidden">
                        {/* Animated Background */}
                        <div className="absolute inset-0 overflow-hidden">
                            <div className="absolute w-96 h-96 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ top: '-50%', left: '-25%' }} />
                            <div className="absolute w-96 h-96 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse animation-delay-1000" style={{ bottom: '-50%', right: '-25%' }} />
                        </div>

                        {/* Current Call (Big Impressive Circle) */}
                        <div className="flex-1 flex justify-center items-center z-10">
                            <AnimatePresence mode='wait'>
                                <motion.div
                                    key={currentNumber}
                                    initial={{ scale: 0, rotate: -180, opacity: 0 }}
                                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                                    exit={{ scale: 0, rotate: 180, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                                    className="relative"
                                >
                                    {/* Outer glow ring */}
                                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 blur-2xl opacity-60 animate-pulse" />

                                    {/* Main circle */}
                                    <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500 shadow-[0_0_60px_rgba(255,165,0,0.6)] flex items-center justify-center border-4 border-white/20">
                                        <div className="text-center">
                                            <div className="text-sm font-bold text-black/40 uppercase mb-[-6px] tracking-wider">
                                                {currentNumber && ['B', 'I', 'N', 'G', 'O'][Math.floor((currentNumber - 1) / 15)]}
                                            </div>
                                            <div className="text-5xl font-black text-white drop-shadow-lg">
                                                {currentNumber || '-'}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        {/* Recent History */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Recent</span>
                            {history.map((num, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ x: 20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="px-2 py-1 rounded bg-slate-800/80 text-slate-200 font-mono text-xs border border-slate-600/50 backdrop-blur-sm"
                                >
                                    {num}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable Cards Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-[#1a1b2e] pb-24">
                        {myCards.map(card => (
                            <PlayingCard
                                key={card.id}
                                card={card}
                                calledNumbers={calledNumbers}
                            />
                        ))}
                    </div>

                    {/* Bottom Actions */}
                    <div className="absolute bottom-0 left-0 w-full bg-[#1a1b2e]/90 backdrop-blur-lg p-4 grid grid-cols-2 gap-4 border-t border-white/5 z-20">
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white font-bold py-6 rounded-xl shadow-lg shadow-red-900/20"
                            onClick={() => navigate('/lobby')}
                        >
                            Leave
                        </Button>
                        <Button
                            className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black font-black py-6 rounded-xl shadow-lg shadow-orange-500/20 text-xl tracking-wider"
                        >
                            BINGO!
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GamePage;
