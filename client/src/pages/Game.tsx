import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';
import { Button } from '../components/ui/Button';
import { Loader2, Volume2, RefreshCw } from 'lucide-react';
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
        <div className="bg-[#2A1B3D] rounded-lg p-2 h-full overflow-hidden flex flex-col">
            <div className="grid grid-cols-5 gap-1 mb-2">
                {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
                    <div key={letter} className={cn(
                        "text-center text-white font-bold py-1 text-sm rounded",
                        ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-emerald-500', 'bg-orange-500'][i]
                    )}>{letter}</div>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-5 gap-1">
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
                                            "aspect-square flex items-center justify-center text-xs font-bold rounded transition-colors",
                                            isLast ? "bg-green-500 text-white scale-110" :
                                                isCalled ? "bg-green-500 text-white" : "bg-slate-700/50 text-slate-400"
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
        <div className="bg-[#2A1B3D] rounded-lg p-2 mb-3 border border-slate-700/50">
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-lg py-1 px-3 mb-2 text-center">
                <span className="text-white font-bold text-xs">Cartela No: {card.id}</span>
            </div>

            <div className="grid grid-cols-5 gap-1">
                {/* Headers */}
                {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
                    <div key={letter} className={cn(
                        "aspect-square flex items-center justify-center rounded font-black text-white text-sm",
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
                                        "aspect-square flex items-center justify-center rounded text-sm font-bold transition-all",
                                        isCenter
                                            ? "bg-green-500 text-white"
                                            : isCalled
                                                ? "bg-purple-600 text-white"
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

const MiniCard = ({ card }: { card: BingoCard }) => {
    return (
        <div className="bg-[#2A1B3D] rounded-lg p-2 border border-purple-500/30">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-t-lg py-0.5 px-2 mb-1">
                <span className="text-slate-900 font-bold text-[10px] uppercase">Cartela No: {card.id}</span>
            </div>
            <div className="grid grid-cols-5 gap-0.5">
                {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
                    <div key={letter} className={cn(
                        "aspect-square flex items-center justify-center rounded text-white text-[8px] font-bold",
                        ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-emerald-500', 'bg-orange-500'][i]
                    )}>
                        {letter}
                    </div>
                ))}
                {card.numbers.map((row, r) => (
                    <React.Fragment key={r}>
                        {row.map((num, c) => {
                            const isCenter = r === 2 && c === 2;
                            return (
                                <div
                                    key={`${r}-${c}`}
                                    className={cn(
                                        "aspect-square flex items-center justify-center rounded text-[8px] font-bold",
                                        isCenter ? "bg-emerald-500 text-white" : "bg-white text-slate-800"
                                    )}
                                >
                                    {isCenter ? '★' : num}
                                </div>
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
    const [previewCards, setPreviewCards] = useState<BingoCard[]>([]);

    // Game State
    const [calledNumbers, setCalledNumbers] = useState<Set<number>>(new Set());
    const [currentNumber, setCurrentNumber] = useState<number | null>(null);
    const [countdown, setCountdown] = useState(30);

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

    // Countdown timer for selection
    useEffect(() => {
        if (status === 'selection') {
            const timer = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [status]);

    const handleSelectCard = (id: number) => {
        if (selectedCards.includes(id)) {
            setSelectedCards(prev => prev.filter(c => c !== id));
            setPreviewCards(prev => prev.filter(c => c.id !== id));
        } else {
            if (selectedCards.length < 2) {
                setSelectedCards(prev => [...prev, id]);
                setPreviewCards(prev => [...prev, generateBingoCard(id)]);
            }
        }
    };

    const startGame = () => {
        if (selectedCards.length === 0) return;

        setMyCards(previewCards);
        setStatus('playing');

        // MOCK GAME LOGIC
        let count = 0;
        const usedNumbers = new Set<number>();
        const interval = setInterval(() => {
            if (count >= 75) {
                clearInterval(interval);
                return;
            }

            let num;
            do {
                num = Math.floor(Math.random() * 75) + 1;
            } while (usedNumbers.has(num));

            usedNumbers.add(num);
            setCurrentNumber(num);
            setCalledNumbers(prev => new Set(prev).add(num));

            count++;
        }, 3000);

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
            <div className="min-h-screen bg-[#1a1b2e] flex flex-col text-white overflow-hidden">
                {/* Header with Timer */}
                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-2 text-center border-b border-white/10">
                    <div className="flex items-center justify-center gap-4 text-sm">
                        <div><span className="text-white/70">Time:</span> <span className="font-black text-xl">{countdown}s</span></div>
                        <div className="h-4 w-px bg-white/20" />
                        <div><span className="text-white/70">Players:</span> <span className="font-bold">24</span></div>
                        <div className="h-4 w-px bg-white/20" />
                        <div><span className="text-white/70">Prize:</span> <span className="font-bold">1,200 Birr</span></div>
                    </div>
                </div>

                {/* Selection Grid */}
                <div className="flex-1 p-2 overflow-y-auto pb-[280px]">
                    <h2 className="text-center font-bold text-base mb-2">Select Your Cards (Max 2)</h2>

                    <div className="grid grid-cols-7 gap-1.5">
                        {availableCards.map(num => (
                            <button
                                key={num}
                                onClick={() => handleSelectCard(num)}
                                className={cn(
                                    "aspect-square rounded-lg flex items-center justify-center font-bold text-xs transition-all",
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
                {previewCards.length > 0 && (
                    <div className="fixed bottom-12 left-0 right-0 bg-slate-900/98 backdrop-blur-lg border-t border-slate-700 p-2 z-20">
                        <h3 className="text-xs font-bold mb-2 text-center">Your Selected Cards</h3>
                        <div className="flex gap-2 justify-center overflow-x-auto">
                            {previewCards.map(card => (
                                <MiniCard key={card.id} card={card} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Bottom Action */}
                <div className="fixed bottom-0 left-0 right-0 p-2 bg-slate-900 border-t border-slate-800 z-30">
                    <Button
                        onClick={startGame}
                        disabled={selectedCards.length === 0}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 h-10 text-base font-bold"
                    >
                        Confirm Selection ({selectedCards.length})
                    </Button>
                </div>
            </div>
        );
    }

    // PLAYING STATE - Match the screenshot exactly
    const getLetter = (num: number) => ['B', 'I', 'N', 'G', 'O'][Math.floor((num - 1) / 15)];

    return (
        <div className="min-h-screen bg-[#1a1b2e] flex flex-col text-white overflow-hidden">
            {/* Game Info Bar */}
            <div className="bg-[#2A1B3D] grid grid-cols-5 gap-1 p-1 border-b border-white/5">
                {[
                    { label: 'Game ID', val: gameId?.slice(-8) || 'BB543258' },
                    { label: 'Players', val: '22' },
                    { label: 'Bet', val: '10' },
                    { label: 'Derash', val: '176' },
                    { label: 'Called', val: calledNumbers.size.toString() },
                ].map((item, i) => (
                    <div key={i} className="bg-slate-800/50 rounded p-1 text-center">
                        <div className="text-[9px] text-slate-400 uppercase font-medium">{item.label}</div>
                        <div className="font-bold text-sm text-white">{item.val}</div>
                    </div>
                ))}
            </div>

            <div className="flex-1 overflow-hidden flex relative">
                {/* Left Panel: Master Board */}
                <div className="w-[35%] h-full p-1 bg-[#1a1b2e] shrink-0">
                    <MasterBoard calledNumbers={calledNumbers} lastCalled={currentNumber} />
                </div>

                {/* Right Panel: Play Area */}
                <div className="w-[65%] relative flex flex-col h-full overflow-hidden bg-[#1a1b2e]">

                    {/* Top Section: Current Call Display */}
                    <div className="bg-[#2A1B3D] p-2 border-b border-white/5">
                        <div className="flex items-center justify-between">
                            {/* Current Number Badge */}
                            <div className="bg-purple-600 text-white px-3 py-1 rounded-full font-bold text-sm">
                                {currentNumber ? `${getLetter(currentNumber)}-${currentNumber}` : 'N-45'}
                            </div>

                            {/* Volume Icon */}
                            <Volume2 size={20} className="text-slate-400" />
                        </div>

                        {/* Large Current Number Circle */}
                        <div className="flex justify-center my-3">
                            <AnimatePresence mode='wait'>
                                <motion.div
                                    key={currentNumber}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 1.2, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="relative w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 shadow-[0_0_30px_rgba(255,200,0,0.5)] flex items-center justify-center border-4 border-yellow-600/30"
                                >
                                    <div className="text-center">
                                        <div className="text-purple-700 font-black text-3xl drop-shadow-lg">
                                            {currentNumber ? `${getLetter(currentNumber)}-${currentNumber}` : 'N-45'}
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Scrollable Cards Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-gradient-to-b from-[#1a1b2e] to-[#2A1B3D] pb-16">
                        {myCards.map(card => (
                            <PlayingCard
                                key={card.id}
                                card={card}
                                calledNumbers={calledNumbers}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Actions - 3 Buttons */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#1a1b2e] border-t border-white/5">
                <Button
                    className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-4 rounded-lg shadow-lg"
                    onClick={() => navigate('/lobby')}
                >
                    Leave
                </Button>
                <Button
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-4 rounded-lg shadow-lg flex items-center justify-center gap-2"
                >
                    <RefreshCw size={18} />
                    Refresh
                </Button>
                <Button
                    className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black font-black py-4 rounded-lg shadow-lg text-lg"
                >
                    BINGO!
                </Button>
            </div>
        </div>
    );
};

export default GamePage;
