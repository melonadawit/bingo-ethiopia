import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { gameSocket } from '../services/socket';
import { Button } from '../components/ui/Button';
import { Loader2, Volume2, RefreshCw, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceCaller } from '../services/voiceCaller';
import { WinnerAnnouncement } from '../components/game/WinnerAnnouncement';
import { NoWinnerAnnouncement } from '../components/game/NoWinnerAnnouncement';
import { ConnectionStatus } from '../components/ui/ConnectionStatus';
import { checkWinningPattern } from '../utils/bingoLogic';
import type { GameMode } from '../utils/bingoLogic';
import toast from 'react-hot-toast';

// --- Types ---
type GameStatus = 'connecting' | 'waiting' | 'selection' | 'selecting' | 'countdown' | 'playing' | 'ended';
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
                                            "aspect-square flex items-center justify-center text-[10px] font-bold rounded transition-all duration-300",
                                            isLast ? "bg-yellow-400 text-black scale-125 shadow-lg shadow-yellow-400/50 animate-pulse" :
                                                isCalled ? "bg-green-600 text-white" : "bg-slate-700/50 text-slate-400"
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

const PlayingCard = ({ card, calledNumbers, highlightMode, manuallyMarkedCells, onCellClick }: {
    card: BingoCard,
    calledNumbers: Set<number>,
    highlightMode: 'auto' | 'manual',
    manuallyMarkedCells: Set<string>,
    onCellClick: (cardId: number, num: number) => void
}) => {
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
                            const cellKey = `${card.id}-${num}`;
                            const isManuallyMarked = manuallyMarkedCells.has(cellKey);
                            const isHighlighted = highlightMode === 'auto' ? isCalled : isManuallyMarked;

                            return (
                                <button
                                    key={`${r}-${c}`}
                                    disabled={isCenter}
                                    onClick={() => {
                                        if (highlightMode === 'manual' && isCalled && !isCenter) {
                                            onCellClick(card.id, num);
                                        }
                                    }}
                                    className={cn(
                                        "aspect-square flex items-center justify-center rounded-lg text-sm font-bold transition-all",
                                        isCenter
                                            ? "bg-emerald-500 text-white text-xl"
                                            : isHighlighted
                                                ? "bg-purple-600 text-white"
                                                : "bg-white text-slate-900",
                                        highlightMode === 'manual' && isCalled && !isCenter && "cursor-pointer hover:bg-purple-300"
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
    const { gameId: urlGameId } = useParams();
    const [currentGameId, setCurrentGameId] = useState(urlGameId || '');
    const gameId = currentGameId; // Use state-based gameId
    const navigate = useNavigate();
    const { user } = useAuth();

    const [status, setStatus] = useState<GameStatus>('connecting');
    const [selectedCards, setSelectedCards] = useState<number[]>([]);
    const [previewCards, setPreviewCards] = useState<BingoCard[]>([]);

    // Game State
    const [calledNumbers, setCalledNumbers] = useState<Set<number>>(new Set());
    const [currentNumber, setCurrentNumber] = useState<number | null>(null);
    const [countdown, setCountdown] = useState(30);
    const [isMuted, setIsMuted] = useState(false);
    const [winners, setWinners] = useState<any[]>([]);
    const [showNoWinner, setShowNoWinner] = useState(false);
    const [watchOnly, setWatchOnly] = useState(false);

    // Connection & Error Handling States
    const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'reconnecting'>('connecting');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [_reconnectAttempts, _setReconnectAttempts] = useState(0); // Prefix with _ to suppress unused warning

    // Real-time multiplayer card selection state
    const [_selectedCardsByPlayer, setSelectedCardsByPlayer] = useState<Record<number, string>>({});  // cardId -> userId
    const [realPlayerCount, setRealPlayerCount] = useState(0); // Real-time player count from server (USED in UI)
    const [_isSpectator, _setIsSpectator] = useState(false); // True if joined after game started
    const [highlightMode, setHighlightMode] = useState<'auto' | 'manual'>('auto');
    const [manuallyMarkedCells, setManuallyMarkedCells] = useState<Set<string>>(new Set());
    const [modeConflict, setModeConflict] = useState<{ activeMode: string, activeGameId: string, message: string } | null>(null);

    // Get game mode from URL or default to 'ande-zig'
    const [searchParams] = useSearchParams();
    const gameMode = (searchParams.get('mode') as GameMode) || 'ande-zig';

    // Mock initial data - 300 cards
    const availableCards = useMemo(() => Array.from({ length: 300 }, (_, i) => i + 1), []);

    // Use refs to store latest values for closure in countdown
    const previewCardsRef = useRef<BingoCard[]>([]);
    const selectedCardsRef = useRef<number[]>([]);
    const latestIsMuted = useRef(isMuted); // Ref to track mute state in closures
    const invalidToastShownRef = useRef(false); // Track invalid toast to prevent spam

    // Interval Ref for cleaning up the game loop
    const gameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Update refs whenever state changes
    useEffect(() => {
        previewCardsRef.current = previewCards;
        selectedCardsRef.current = selectedCards;
        latestIsMuted.current = isMuted;
    }, [previewCards, selectedCards, isMuted]);

    // Cleanup on unmount - disconnect socket
    useEffect(() => {
        return () => {
            console.log('🧹 Game component unmounting - disconnecting socket');
            if (gameId) {
                gameSocket.emit('leave_game', { gameId });
            }
            gameSocket.disconnect();
        };
    }, [gameId]);

    useEffect(() => {
        console.log('🚀 [GAME] Starting setup for game:', gameId);

        // 1. CLEANUP PREVIOUS LISTENERS
        const cleanupListeners = () => {
            console.log('🧹 [GAME] Cleaning up socket listeners');
            gameSocket.off('connect');
            gameSocket.off('joined_successfully');
            gameSocket.off('error');
            gameSocket.off('card_selected');
            gameSocket.off('card_deselected');
            gameSocket.off('selection_state');
            gameSocket.off('countdown_tick');
            gameSocket.off('number_called');
            gameSocket.off('game_started');
            gameSocket.off('game_state_changed');
            gameSocket.off('game_won');
            gameSocket.off('game_reset');
            gameSocket.off('game_ended');
            gameSocket.off('invalid_claim');
            gameSocket.off('no_winner');
            gameSocket.off('rejoin_active');
            gameSocket.off('watch_only');
            gameSocket.off('mode_conflict');
        };

        cleanupListeners();

        // 2. DEFINE LISTENERS (Register these BEFORE emitting join_game)
        const handleConnect = () => {
            console.log('✅ [SOCKET] Connected to server');
            setConnectionStatus('connected');
            _setReconnectAttempts(0);
            setError(null);

            const userId = user?.telegram_id ? user.telegram_id.toString() : `guest-${Date.now()}`;
            const username = user?.username || 'Guest';

            console.log('📡 [SOCKET] Sending join_game:', { gameId, userId, username });
            gameSocket.emit('join_game', { gameId, userId, username });
            gameSocket.emit('request_selection_state', { gameId });
        };

        // UI Update Listeners
        gameSocket.on('joined_successfully', ({ gameId: joinedGameId }: { gameId: string }) => {
            console.log('✅ [SUCCESS] Joined game:', joinedGameId, 'Moving to selection state');
            setStatus('selection');
        });

        gameSocket.on('mode_conflict', (data: any) => {
            console.log('🚫 [CONFLICT] MODE CONFLICT DETECTED:', data);
            setModeConflict(data);
        });

        gameSocket.on('game_won', (data: any) => {
            console.log('🏆 [WON] game_won received:', data);
            setWinners(data.winners);
            setStatus('ended');
            setIsLoading(false);
            if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
            voiceCaller.stop();
        });

        gameSocket.on('game_state_changed', ({ state }: { state: GameStatus }) => {
            console.log('🔄 [STATE] Changed to:', state);
            setStatus(state);
        });

        gameSocket.on('countdown_tick', ({ countdown }: { countdown: number }) => {
            setCountdown(countdown);
            setStatus('countdown');
        });

        gameSocket.on('number_called', ({ number, history }: { number: number; history: number[] }) => {
            setCurrentNumber(number);
            setCalledNumbers(new Set(history));
            if (!latestIsMuted.current) voiceCaller.callNumber(number).catch(() => { });
        });

        gameSocket.on('game_started', () => {
            console.log('🎮 [START] Game transitioned to playing');
            setStatus('playing');
            if (!latestIsMuted.current) voiceCaller.announceGameStart();
        });

        gameSocket.on('rejoin_active', (data: any) => {
            console.log('🔄 [REJOIN] Restoring state:', data);
            if (data.selectedCards?.length > 0) {
                const restoredCards = data.selectedCards.map((id: number) => generateBingoCard(id));
                setPreviewCards(restoredCards);
                setSelectedCards(data.selectedCards);
                previewCardsRef.current = restoredCards;
                selectedCardsRef.current = data.selectedCards;
            }
            setWatchOnly(false);
            setStatus('playing');
        });

        gameSocket.on('watch_only', (data: any) => {
            console.log('👁️ [WATCH] Mode activated');
            setWatchOnly(true);
        });

        // Online multiplayer listeners
        gameSocket.on('card_selected', (data: any) => {
            setSelectedCardsByPlayer(prev => ({ ...prev, [data.cardId]: data.userId }));
            setRealPlayerCount(data.playerCount);
        });
        gameSocket.on('card_deselected', (data: any) => {
            setSelectedCardsByPlayer(prev => {
                const next = { ...prev };
                delete next[data.cardId];
                return next;
            });
            setRealPlayerCount(data.playerCount);
        });
        gameSocket.on('selection_state', (data: any) => {
            setSelectedCardsByPlayer(data.selectedCards);
            setRealPlayerCount(data.playerCount);
            if (data.status) setStatus(data.status);
            if (data.countdown !== undefined) setCountdown(data.countdown);
        });
        gameSocket.on('error', (data: any) => {
            console.error('❌ [SOCKET ERROR]:', data.message);
            setError(data.message);
        });

        // 3. START CONNECTION
        gameSocket.on('connect', handleConnect);
        if (!gameSocket.connected && gameId) {
            gameSocket.connect(gameId);
        } else if (gameSocket.connected && gameId) {
            handleConnect(); // Join immediately if already re-mounted while connected
        }

        return () => {
            cleanupListeners();
            gameSocket.off('connect', handleConnect);
        };
    }, [user, navigate, gameId]);

    const handleNextGame = async () => {
        console.log('Starting next round...');
        if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
        voiceCaller.stop();

        // Leave the old ended game
        if (gameId) {
            gameSocket.emit('leave_game', { gameId });
            // Wait for server to process leave before creating new game
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Clear game state
        setWinners([]);
        setCalledNumbers(new Set());
        setCurrentNumber(null);
        setSelectedCards([]);
        setPreviewCards([]);

        // Reset to selection phase
        setStatus('selecting');
        setCountdown(30);

        // Use matchmaking to join/create game
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/game/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: gameMode || 'ande-zig',
                    entryFee: 10
                })
            });

            const data = await response.json();
            console.log('Joined/created game for round 2:', data.gameId);

            setCurrentGameId(data.gameId);
            window.history.replaceState(null, '', `/game/${data.gameId}`);

            if (user?.id) {
                gameSocket.emit('join_game', { gameId: data.gameId, userId: user.id });
                gameSocket.emit('request_selection_state', { gameId: data.gameId });
            }
        } catch (error) {
            console.error('Error joining next round:', error);
        }
    };

    const handleCellClick = (_cardId: number, num: number) => {
        if (highlightMode !== 'manual') return;
        setManuallyMarkedCells(prev => {
            const next = new Set(prev);
            selectedCards.forEach(selectedCardId => {
                const cellKey = `${selectedCardId}-${num}`;
                if (next.has(cellKey)) {
                    next.delete(cellKey);
                } else {
                    next.add(cellKey);
                }
            });
            return next;
        });
    };

    const handleSelectCard = (id: number) => {
        console.log(`🖱️ Card Clicked: ${id}`);
        if (!gameSocket?.connected) {
            toast.error("Connecting... please wait", { id: 'conn-toast' });
            return;
        }

        const mode = gameId?.split('-global-')[0] || 'ande-zig';
        const unitPrice = mode === 'ande-zig' ? 10 : mode === 'hulet-zig' ? 20 : 50;
        const userBalance = Number(user?.balance || 0);

        if (selectedCards.includes(id)) {
            setSelectedCards(prev => prev.filter(c => c !== id));
            setPreviewCards(prev => prev.filter(c => c.id !== id));
            const socketUserId = user?.telegram_id ? user.telegram_id.toString() : user?.id;
            gameSocket.emit('deselect_card', { cardId: id, userId: socketUserId });
            return;
        }

        if (userBalance < unitPrice) {
            toast.error(`Need ${unitPrice} Birr to play!`, { id: 'bal-err' });
            return;
        }

        if (selectedCards.length >= 2) {
            toast.error("Max 2 cards allowed", { id: 'max-cards' });
            return;
        }

        const newCard = generateBingoCard(id);
        setSelectedCards(prev => [...prev, id]);
        setPreviewCards(prev => [...prev, newCard]);
        const socketUserId = user?.telegram_id ? user.telegram_id.toString() : user?.id;
        gameSocket.emit('select_card', { cardId: id, userId: socketUserId });
    };

    const handleClaimBingo = () => {
        if (isLoading) return;
        setIsLoading(true);

        const currentCards = selectedCards.map(id =>
            previewCards.find(c => c.id === id) || generateBingoCard(id)
        );

        if (currentCards.length === 0 || !gameId || !user?.id) {
            setIsLoading(false);
            return;
        }

        const winningCards = currentCards.filter(card => {
            const result = checkWinningPattern(card.numbers, calledNumbers, gameMode);
            return result.isWinner;
        });

        if (winningCards.length > 0) {
            winningCards.forEach(card => {
                gameSocket.emit('claim_bingo', {
                    cardId: card.id,
                    card: { id: card.id, numbers: card.numbers }
                });
            });
        } else {
            setIsLoading(false);
            if (!invalidToastShownRef.current) {
                invalidToastShownRef.current = true;
                toast("❌ Not yet!", { id: 'local-invalid-claim' });
                setTimeout(() => invalidToastShownRef.current = false, 2000);
            }
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

    // Unified check for Selection/Countdown phase
    if (status === 'waiting' || status === 'selection' || status === 'selecting' || status === 'countdown') {
        return (
            <div className="min-h-screen bg-[#1a1b2e] flex flex-col text-white overflow-hidden">
                <ConnectionStatus status={connectionStatus} error={error} />

                {/* Header - MOBILE OPTIMIZED */}
                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-1.5 sm:p-2 text-center border-b border-white/10">
                    <div className="flex items-center justify-between px-2 sm:px-4">
                        <div className="flex justify-center">
                            <button onClick={() => navigate('/lobby')} className="flex items-center gap-1 px-3 py-2 bg-white/20 hover:bg-white/30 rounded-md text-xs font-bold">
                                <span>Back</span>
                            </button>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <span className="font-black text-2xl text-white">{countdown}s</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <span className="text-white/80">Players:</span>
                            <span className="font-bold text-lg text-white">{realPlayerCount}</span>
                        </div>
                    </div>
                </div>

                {/* Selection Grid */}
                <div className="flex-1 p-2 overflow-y-auto pb-[200px]">
                    <h2 className="text-center font-bold text-base mb-2">Select Your Cards (Max 2)</h2>

                    <div className="grid grid-cols-8 gap-2 max-w-4xl mx-auto">
                        {availableCards.map(num => {
                            const isMyCard = selectedCards.includes(num);
                            // Normalize IDs to strings for comparison to avoid mismatch
                            const takenById = _selectedCardsByPlayer[num];
                            // CRITICAL FIX: Use the same ID logic as connection (TelegramID preferred, else UUID)
                            const mySocketId = user?.telegram_id ? user.telegram_id.toString() : user?.id;

                            // Only taken if ID exists AND it is NOT me
                            const isTakenByOther = takenById && String(takenById) !== String(mySocketId);

                            return (
                                <button
                                    key={num}
                                    onClick={() => handleSelectCard(num)}
                                    disabled={!!isTakenByOther}
                                    className={cn(
                                        "aspect-square rounded-lg flex items-center justify-center font-semibold text-base transition-all duration-200",
                                        isMyCard
                                            ? "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50 transform scale-110 border-2 border-green-300"
                                            : isTakenByOther
                                                ? "text-white cursor-not-allowed opacity-90 border-2"
                                                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:scale-105 border border-slate-700"
                                    )}
                                    style={isTakenByOther ? { backgroundColor: '#617a8f', borderColor: '#4a5f73' } : undefined}
                                >
                                    {num}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Cards Preview */}
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

                {/* Mode Conflict Modal Overlay (Duplicate for early return path) */}
                <AnimatePresence>
                    {modeConflict && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                                className="bg-[#2A1B3D] border-2 border-yellow-500/30 rounded-2xl p-6 max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center relative overflow-hidden"
                            >
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 animate-gradient-x" />
                                <div className="mb-6 mt-2 flex justify-center">
                                    <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
                                        <RefreshCw className="text-yellow-400 animate-spin-slow" size={32} />
                                    </div>
                                </div>
                                <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Active Game Found!</h2>
                                <p className="text-slate-300 text-sm mb-8 leading-relaxed">
                                    {modeConflict.message || `You are already playing in a ${modeConflict.activeMode} room. Please finish that game first.`}
                                </p>
                                <div className="flex flex-col gap-3">
                                    <Button
                                        className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 to-orange-400 text-black font-black py-4 rounded-xl"
                                        onClick={() => {
                                            window.location.href = `/game/${modeConflict.activeGameId}?mode=${modeConflict.activeMode}`;
                                        }}
                                    >
                                        BACK TO ACTIVE GAME
                                    </Button>
                                    <Button
                                        className="w-full bg-[#1A1B2E] text-slate-300 border border-white/10 py-3 rounded-xl"
                                        onClick={() => {
                                            setModeConflict(null);
                                            navigate('/lobby');
                                        }}
                                    >
                                        RETURN TO LOBBY
                                    </Button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // PLAYING STATE
    const getLetter = (num: number) => ['B', 'I', 'N', 'G', 'O'][Math.floor((num - 1) / 15)];
    const recentCalls = [...calledNumbers].slice(-4, -1).reverse();

    // Compute myCards from current state (CRITICAL for rejoin to work!)
    const myCards = selectedCards.map(id =>
        previewCards.find(c => c.id === id) || generateBingoCard(id)
    );
    console.log('🎴 myCards computed:', myCards.length, 'cards');

    return (
        <div className="h-screen bg-[#1a1b2e] flex flex-col text-white overflow-hidden">
            {/* Game Info Bar - Compact */}
            <div className="bg-[#2A1B3D] grid grid-cols-5 gap-0.5 p-0.5 border-b border-white/5 h-12 shrink-0">
                {(() => {
                    // Extract mode from gameId (e.g., "ande-zig-global-v24" -> "ande-zig")
                    const mode = gameId?.split('-global-')[0] || 'ande-zig';
                    const unitPrice = mode === 'ande-zig' ? 10 : mode === 'hulet-zig' ? 20 : 50;
                    // Calculate total cards selected (from selectedCardsByPlayer Map)
                    const totalCardsSelected = Object.keys(_selectedCardsByPlayer).length;
                    // DERASH = (total cards × unit price) - 15% house fee
                    const derash = Math.floor(totalCardsSelected * unitPrice * 0.85);

                    return [
                        { label: 'GAME ID', val: gameId?.slice(0, 8) || 'ic-bingo' },
                        { label: 'BALANCE', val: user?.balance?.toString() || '0' }, // ADDED Balance
                        { label: 'BET', val: unitPrice.toString() },
                        { label: 'DERASH', val: derash.toString() }, // Prize pool after 15% fee
                        { label: 'CALLED', val: calledNumbers.size.toString() },
                    ].map((item, i) => (
                        <div key={i} className="bg-slate-800/50 rounded p-0.5 text-center">
                            <div className="text-[8px] text-slate-400 uppercase font-medium">{item.label}</div>
                            <div className="font-bold text-xs text-white">{item.val}</div>
                        </div>
                    ));
                })()}
            </div>

            {/* Main Game Area */}
            <div className="flex-1 overflow-hidden flex relative gap-0.5">
                {/* Left Panel: Master Board - 50% */}
                <div className="w-1/2 h-full p-0.5 bg-[#1a1b2e] shrink-0 relative">
                    <MasterBoard calledNumbers={calledNumbers} lastCalled={currentNumber} />

                    {/* Highlighting Mode Toggle - FLOATING ABSOLUTE POSITION (LEFT SIDE) */}
                    <div className="absolute bottom-0 left-1 z-50 pointer-events-none">
                        <div className="flex items-center gap-1 bg-slate-900/95 backdrop-blur-sm rounded-t-lg px-2 py-1 border border-slate-700 border-b-0 pointer-events-auto">
                            <span className="text-[10px] text-slate-400 font-medium">Highlight:</span>
                            <button
                                onClick={() => setHighlightMode('auto')}
                                className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold transition-all",
                                    highlightMode === 'auto'
                                        ? "bg-green-600 text-white shadow-lg"
                                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                )}
                            >
                                Auto
                            </button>
                            <button
                                onClick={() => setHighlightMode('manual')}
                                className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold transition-all",
                                    highlightMode === 'manual'
                                        ? "bg-blue-600 text-white shadow-lg"
                                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                )}
                            >
                                Manual
                            </button>
                        </div>
                    </div>
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
                                        <div key={i} className={`px-2 py-1 rounded-full bg-gradient-to-r ${colors[letter as keyof typeof colors]} text-white text-[11px] font-bold text-center`}>
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
                                            {currentNumber ? `${getLetter(currentNumber)}-${currentNumber}` : '--'}
                                        </div>
                                    </div>
                                </motion.div>
                            </AnimatePresence>

                            {/* Mute/Unmute Button */}
                            <button
                                onClick={() => {
                                    const newMutedState = !isMuted;
                                    setIsMuted(newMutedState);
                                    voiceCaller.setMuted(newMutedState);
                                }}
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
                                        የዚህ ዙር ጨዋታ<br />
                                        ተጀምሯል። አዲስ ዙር<br />
                                        እስኪጀምር እዚሁ<br />
                                        ይጠብቁ።
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
                                            highlightMode={highlightMode}
                                            manuallyMarkedCells={manuallyMarkedCells}
                                            onCellClick={handleCellClick}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Actions - Simple Static Menu (No Collapsible) */}
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
                    onClick={() => {
                        console.log('🔄 Refreshing game state...');
                        gameSocket.emit('request_selection_state');
                        toast('Refreshing...', {
                            duration: 1000,
                            position: 'top-center',
                        });
                    }}
                >
                    <RefreshCw size={14} />
                    Refresh
                </Button>
                <Button
                    className="w-full h-full text-2xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black shadow-[0_0_20px_rgba(251,191,36,0.5)] animate-pulse border-none"
                    onClick={handleClaimBingo}
                    disabled={status !== 'playing' || isLoading || watchOnly}
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

            {/* No Winner Announcement Overlay */}
            {showNoWinner && (
                <NoWinnerAnnouncement onNextGame={handleNextGame} />
            )}

            {/* Mode Conflict Modal Overlay */}
            <AnimatePresence>
                {modeConflict && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            className="bg-[#2A1B3D] border-2 border-yellow-500/30 rounded-2xl p-6 max-w-sm w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] text-center relative overflow-hidden"
                        >
                            {/* Animated Background Glow */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 animate-gradient-x" />

                            <div className="mb-6 mt-2 flex justify-center">
                                <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center">
                                    <RefreshCw className="text-yellow-400 animate-spin-slow" size={32} />
                                </div>
                            </div>

                            <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Active Game Found!</h2>
                            <p className="text-slate-300 text-sm mb-8 leading-relaxed">
                                {modeConflict.message || `You are already playing in a ${modeConflict.activeMode} room. Please finish that game first.`}
                            </p>

                            <div className="flex flex-col gap-3">
                                <Button
                                    className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 to-orange-400 text-black font-black py-4 rounded-xl shadow-[0_4px_15px_rgba(245,158,11,0.3)] transition-all active:scale-95"
                                    onClick={() => {
                                        window.location.href = `/game/${modeConflict.activeGameId}?mode=${modeConflict.activeMode}`;
                                    }}
                                >
                                    BACK TO ACTIVE GAME
                                </Button>

                                <Button
                                    className="w-full bg-[#1A1B2E] hover:bg-[#252642] text-slate-300 border border-white/10 py-3 rounded-xl transition-all active:scale-95"
                                    onClick={() => {
                                        setModeConflict(null);
                                        navigate('/lobby');
                                    }}
                                >
                                    RETURN TO LOBBY
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default GamePage;
