import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { socket } from '../services/socket';
import { Button } from '../components/ui/Button';
import { Loader2, Volume2, RefreshCw, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceCaller } from '../services/voiceCaller';
import { WinnerAnnouncement } from '../components/WinnerAnnouncement';
import { checkWinningPattern, type GameMode } from '../utils/bingoLogic';
import toast from 'react-hot-toast';

// --- Types ---
type GameStatus = 'connecting' | 'selection' | 'playing' | 'ended';
type BingoCard = {
    id: number;
    numbers: number[][]; // 5x5
};

// --- Mock Data Generators ---
// Seeded random number generator for consistent card generation
const seededRandom = (seed: number) => {
    let state = seed;
    return () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
    };
};

const generateBingoCard = (id: number): BingoCard => {
    const card: number[][] = Array(5).fill(0).map(() => Array(5).fill(0));
    const used = new Set<number>();
    const random = seededRandom(id); // Use card ID as seed for consistency

    // B (1-15), I (16-30), N (31-45), G (46-60), O (61-75)
    for (let col = 0; col < 5; col++) {
        const min = col * 15 + 1;
        const max = min + 14;

        for (let row = 0; row < 5; row++) {
            if (col === 2 && row === 2) continue; // Free space

            let num;
            let attempts = 0;
            do {
                num = Math.floor(random() * (max - min + 1)) + min;
                attempts++;
                if (attempts > 100) break; // Safety check
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
        <div className="bg-[#2A1B3D] rounded-lg p-1 h-full overflow-hidden flex flex-col">
            <div className="grid grid-cols-5 gap-0.5 mb-1">
                {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
                    <div key={letter} className={cn(
                        "text-center text-white font-bold py-0.5 text-xs rounded",
                        ['bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-emerald-500', 'bg-orange-500'][i]
                    )}>{letter}</div>
                ))}
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-5 gap-0.5">
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
                                            "aspect-square flex items-center justify-center text-[10px] font-bold rounded transition-colors",
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
        <div className="bg-gradient-to-br from-indigo-900/90 to-blue-900/80 rounded-2xl p-2 border border-indigo-500/30 h-full flex flex-col shadow-2xl">
            <div className="bg-gradient-to-r from-yellow-600 to-orange-600 rounded-xl py-1 px-3 mb-2 text-center shrink-0">
                <span className="text-white font-bold text-xs">Cartela No: {card.id}</span>
            </div>

            <div className="grid grid-cols-5 gap-1 flex-1">
                {/* Headers */}
                {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
                    <div key={letter} className={cn(
                        "aspect-square flex items-center justify-center rounded-lg font-black text-white text-sm",
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
                                        "aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-all",
                                        isCenter
                                            ? "bg-emerald-500 text-white text-xl"
                                            : isCalled
                                                ? "bg-purple-600 text-white"
                                                : "bg-white text-slate-900"
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
        <div className="bg-[#2A1B3D] rounded-lg p-2 border border-purple-500/30 w-44">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-t py-1 px-2 mb-1">
                <span className="text-slate-900 font-bold text-[10px] uppercase">Cartela No: {card.id}</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
                {['B', 'I', 'N', 'G', 'O'].map((letter, i) => (
                    <div key={letter} className={cn(
                        "aspect-square flex items-center justify-center rounded text-white text-[9px] font-bold",
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
                                        "aspect-square flex items-center justify-center rounded text-[9px] font-bold",
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
    const [isMuted, setIsMuted] = useState(false);
    const [winners, setWinners] = useState<any[]>([]);

    // Get game mode from URL or default to 'and-zig'
    const [searchParams] = useSearchParams();
    const gameMode = (searchParams.get('mode') as GameMode) || 'and-zig';

    // Mock initial data - 300 cards
    const availableCards = useMemo(() => Array.from({ length: 300 }, (_, i) => i + 1), []);

    // Use refs to store latest values for closure in countdown
    const previewCardsRef = useRef<BingoCard[]>([]);
    const selectedCardsRef = useRef<number[]>([]);
    const latestIsMuted = useRef(isMuted); // Ref to track mute state in closures

    // Interval Ref for cleaning up the game loop
    const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Update refs whenever state changes
    useEffect(() => {
        previewCardsRef.current = previewCards;
        selectedCardsRef.current = selectedCards;
        latestIsMuted.current = isMuted;
    }, [previewCards, selectedCards, isMuted]);

    useEffect(() => {
        if (!user) {
            navigate('/lobby');
            return;
        }

        console.log('Game component mounted, starting connection phase');
        // Simulate Connection
        const timer = setTimeout(() => {
            console.log('Connection complete, switching to selection phase');
            setStatus('selection');
        }, 1000);

        return () => clearTimeout(timer);
    }, [user, navigate]);

    // Cleanup socket and interval on unmount
    useEffect(() => {
        return () => {
            if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
            socket.off('game_started');
            socket.off('number_drawn');
            socket.off('game_won');
        };
    }, []);

    // Listen for real game win events
    useEffect(() => {
        socket.on('game_won', (data) => {
            console.log('Game Won!', data);
            setWinners(data.winners);
            setStatus('ended');
            if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
        });
    }, []);

    // Countdown timer for selection - AUTO START GAME
    useEffect(() => {
        if (status === 'selection') {
            console.log('Selection phase started, countdown:', countdown);
            const timer = setInterval(() => {
                setCountdown(prev => {
                    console.log('Countdown:', prev);
                    if (prev <= 1) {
                        clearInterval(timer);
                        // AUTO START GAME when countdown reaches 0
                        console.log('Countdown finished, starting game');
                        startGame();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [status]); // Only depend on status, not startGame

    const handleNextGame = () => {
        console.log('Resetting game loop...');
        if (gameIntervalRef.current) clearInterval(gameIntervalRef.current); // STOP CALLER
        voiceCaller.stop(); // STOP AUDIO

        setWinners([]);
        setCalledNumbers(new Set());
        setCurrentNumber(null);

        // Reset selections
        setSelectedCards([]);
        setPreviewCards([]);
        setMyCards([]);

        // Reset to Selection Phase
        setStatus('selection');
        setCountdown(30); // 30s countdown as requested
    };

    const handleSelectCard = (id: number) => {
        console.log('handleSelectCard called with id:', id);
        console.log('Current selectedCards:', selectedCards);
        console.log('Current previewCards:', previewCards);

        if (selectedCards.includes(id)) {
            console.log('Deselecting card', id);
            setSelectedCards(prev => prev.filter(c => c !== id));
            setPreviewCards(prev => prev.filter(c => c.id !== id));
        } else {
            if (selectedCards.length < 2) {
                console.log('Selecting card', id);
                const newCard = generateBingoCard(id);
                console.log('Generated card:', newCard);
                setSelectedCards(prev => [...prev, id]);
                setPreviewCards(prev => [...prev, newCard]);
            } else {
                console.log('Cannot select more than 2 cards');
            }
        }
    };

    const startGame = () => {
        if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);

        // Use refs to get the LATEST values, not the stale closure values
        const latestSelectedCards = selectedCardsRef.current;
        const latestPreviewCards = previewCardsRef.current;

        console.log('Starting game with selectedCards:', latestSelectedCards);
        console.log('PreviewCards:', latestPreviewCards);

        // Set myCards from previewCards if any cards were selected
        if (latestPreviewCards.length > 0) {
            console.log('Setting myCards to:', latestPreviewCards);
            setMyCards([...latestPreviewCards]); // Create a new array to ensure state update
        } else {
            console.log('No cards selected - watching mode');
            setMyCards([]);
        }

        setStatus('playing');

        // Announce Game Start if not muted (Wait a bit for the UI to transition)
        setTimeout(() => {
            if (!latestIsMuted.current) {
                voiceCaller.announceGameStart();
            }
        }, 500);

        // MOCK GAME LOGIC
        let count = 0;
        const usedNumbers = new Set<number>();

        gameIntervalRef.current = setInterval(() => {
            if (count >= 75) {
                if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
                setStatus('ended'); // Game ends if all numbers are called without a winner
                return;
            }

            let num;
            do {
                num = Math.floor(Math.random() * 75) + 1;
            } while (usedNumbers.has(num));

            usedNumbers.add(num);
            setCurrentNumber(num);
            setCalledNumbers(prev => new Set(prev).add(num));

            // Call number in Amharic if not muted
            // Use ref for isMuted to ensure we get latest value inside interval
            if (!latestIsMuted.current) {
                voiceCaller.callNumber(num);
            }

            count++;
        }, 4000); // Slower interval (4s) to allow for voice announcements
    };

    const handleBingoClaim = () => {
        if (gameIntervalRef.current) clearInterval(gameIntervalRef.current); // IMMEDIATE STOP
        voiceCaller.stop(); // IMMEDIATE SILENCE

        // Validation: Verify if user actually has a bingo
        const myCards = selectedCardsRef.current.map(id =>
            previewCardsRef.current.find(c => c.id === id) || generateBingoCard(id)
        );

        const currentCalled = new Set(Array.from(calledNumbers)); // Snapshot
        let hasWinner = false;
        const newWinners: any[] = [];

        myCards.forEach(card => {
            const result = checkWinningPattern(card.numbers, currentCalled, gameMode);
            if (result.isWinner) {
                hasWinner = true;
                newWinners.push({
                    userId: 'me',
                    name: user?.firstName || 'You',
                    cartelaNumber: card.id,
                    card: card.numbers,
                    winningPattern: result.winningCells
                });
            }
        });

        if (hasWinner) {
            // Valid Claim!
            // Stop calling numbers immediately
            if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
            voiceCaller.stop();

            voiceCaller.announceWinner(newWinners[0].cartelaNumber); // Announce first card
            setWinners(newWinners);
            setStatus('ended');

            // In a real app, emit socket event here
            // socket.emit('claim_bingo', { gameId, winners: newWinners });
        } else {
            // Invalid Claim
            toast.error("Bogus Bingo! Keep playing.", {
                icon: '🚫',
                style: {
                    background: '#1f2937',
                    color: '#fff',
                }
            });
        }
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
                <div className="flex-1 p-2 overflow-y-auto pb-[200px]">
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
                    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/98 backdrop-blur-lg border-t border-slate-700 p-3 z-20">
                        <h3 className="text-sm font-bold mb-2 text-center">Your Selected Cards</h3>
                        <div className="flex gap-3 justify-center overflow-x-auto px-2">
                            {previewCards.map(card => (
                                <MiniCard key={card.id} card={card} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // PLAYING STATE
    const getLetter = (num: number) => ['B', 'I', 'N', 'G', 'O'][Math.floor((num - 1) / 15)];
    const recentCalls = [...calledNumbers].slice(-4, -1).reverse();

    return (
        <div className="h-screen bg-[#1a1b2e] flex flex-col text-white overflow-hidden">
            {/* Game Info Bar - Compact */}
            <div className="bg-[#2A1B3D] grid grid-cols-5 gap-0.5 p-0.5 border-b border-white/5 h-12 shrink-0">
                {[
                    { label: 'GAME ID', val: gameId?.slice(0, 8) || 'ic-bingo' },
                    { label: 'PLAYERS', val: '22' },
                    { label: 'BET', val: '10' },
                    { label: 'DERASH', val: '176' },
                    { label: 'CALLED', val: calledNumbers.size.toString() },
                ].map((item, i) => (
                    <div key={i} className="bg-slate-800/50 rounded p-0.5 text-center">
                        <div className="text-[8px] text-slate-400 uppercase font-medium">{item.label}</div>
                        <div className="font-bold text-xs text-white">{item.val}</div>
                    </div>
                ))}
            </div>

            {/* Main Game Area */}
            <div className="flex-1 overflow-hidden flex relative gap-0.5">
                {/* Left Panel: Master Board - 50% */}
                <div className="w-1/2 h-full p-0.5 bg-[#1a1b2e] shrink-0">
                    <MasterBoard calledNumbers={calledNumbers} lastCalled={currentNumber} />
                </div>

                {/* Right Panel: Play Area - 50% */}
                <div className="w-1/2 h-full flex flex-col overflow-hidden bg-[#1a1b2e]">

                    {/* Current Call Display - MINIMIZED */}
                    <div className="bg-[#2A1B3D] p-1 border-b border-white/5 shrink-0">
                        <div className="flex items-center justify-between gap-1">
                            {/* 3 Recent Numbers - Vertical Stack */}
                            <div className="flex flex-col gap-0.5">
                                {recentCalls.slice(0, 3).map((num, i) => {
                                    const letter = getLetter(num);
                                    const colors = {
                                        'B': 'from-blue-500 to-blue-600',
                                        'I': 'from-purple-500 to-purple-600',
                                        'N': 'from-pink-500 to-pink-600',
                                        'G': 'from-emerald-500 to-emerald-600',
                                        'O': 'from-orange-500 to-orange-600'
                                    };
                                    return (
                                        <div key={i} className={`px-1.5 py-0.5 rounded-full bg-gradient-to-r ${colors[letter as keyof typeof colors]} text-white text-[8px] font-bold text-center`}>
                                            {letter}-{num}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Current Number Circle - Compact */}
                            <AnimatePresence mode='wait'>
                                <motion.div
                                    key={currentNumber}
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 1.2, opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="relative w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 via-yellow-500 to-orange-500 shadow-[0_0_15px_rgba(255,200,0,0.4)] flex items-center justify-center border-2 border-yellow-600/30"
                                >
                                    <div className="text-center">
                                        <div className="text-purple-700 font-black text-lg drop-shadow-lg">
                                            {currentNumber ? `${getLetter(currentNumber)}-${currentNumber}` : 'I-24'}
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            {/* Mute/Unmute Button */}
                            <button
                                onClick={() => setIsMuted(!isMuted)}
                                className="p-1 hover:bg-slate-700/50 rounded transition-colors"
                                title={isMuted ? "Unmute voice" : "Mute voice"}
                            >
                                {isMuted ? (
                                    <VolumeX size={16} className="text-red-400" />
                                ) : (
                                    <Volume2 size={16} className="text-green-400" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Cards Area - WATCHING ONLY or PLAYING CARDS */}
                    <div className="flex-1 overflow-hidden p-2 bg-gradient-to-b from-[#1a1b2e] to-[#2A1B3D] flex flex-col">
                        {(() => {
                            return myCards.length === 0;
                        })() ? (
                            // WATCHING ONLY MODE
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center">
                                    <h2 className="text-3xl font-black text-white mb-4">Watching</h2>
                                    <h2 className="text-3xl font-black text-white mb-6">Only</h2>
                                    <p className="text-slate-400 text-sm leading-relaxed">
                                        ዝህ ዘር ፍቅርያት<br />
                                        ተደምራል፡፡ እልቦ ዘር<br />
                                        አስኪጅምር አዚሁ<br />
                                        ይጠብቁ፡፡
                                    </p>
                                </div>
                            </div>
                        ) : (
                            // PLAYING CARDS
                            <div className={cn(
                                "flex-1 flex gap-1",
                                myCards.length === 1 ? "justify-center items-center" : "flex-col"
                            )}>
                                {myCards.slice(0, 2).map(card => (
                                    <div key={card.id} className={cn(
                                        myCards.length === 1 ? "w-full h-1/2" : "flex-1 min-h-0"
                                    )}>
                                        <PlayingCard
                                            card={card}
                                            calledNumbers={calledNumbers}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Actions - Compact */}
            <div className="grid grid-cols-3 gap-0.5 p-0.5 bg-[#1a1b2e] border-t border-white/5 h-12 shrink-0">
                <Button
                    className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-lg shadow-lg text-sm"
                    onClick={() => {
                        voiceCaller.stop();
                        if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
                        navigate('/lobby');
                    }}
                >
                    Leave
                </Button>
                <Button
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-1 text-sm"
                >
                    <RefreshCw size={14} />
                    Refresh
                </Button>
                <Button
                    className="w-full h-full text-2xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.5)] animate-pulse border-none"
                    onClick={handleBingoClaim}
                    disabled={status !== 'playing'}
                >
                    BINGO!
                </Button>
            </div>

            {/* Winner Announcement Overlay */}
            {status === 'ended' && winners.length > 0 && (
                <WinnerAnnouncement
                    winners={winners}
                    calledNumbers={Array.from(calledNumbers)}
                    onNextGame={handleNextGame}
                />
            )}
        </div>
    );
};

export default GamePage;
