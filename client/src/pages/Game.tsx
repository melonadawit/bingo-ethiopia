import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { socket } from '../services/socket';
import { Button } from '../components/ui/Button';
import { Loader2, Volume2, RefreshCw, VolumeX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { voiceCaller } from '../services/voiceCaller';
import { WinnerAnnouncement } from '../components/game/WinnerAnnouncement';
import { checkWinningPattern, type GameMode } from '../utils/bingoLogic';
import toast from 'react-hot-toast';

// --- Types ---
type GameStatus = 'connecting' | 'selection' | 'selecting' | 'countdown' | 'playing' | 'ended';
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
    const { gameId: urlGameId } = useParams();
    const [currentGameId, setCurrentGameId] = useState(urlGameId || '');
    const gameId = currentGameId; // Use state-based gameId
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

    // Real-time multiplayer card selection state
    const [_selectedCardsByPlayer, setSelectedCardsByPlayer] = useState<Record<number, string>>({});  // cardId -> userId
    const [realPlayerCount, setRealPlayerCount] = useState(0); // Real-time player count from server (USED in UI)
    const [_isSpectator, _setIsSpectator] = useState(false); // True if joined after game started




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
    const gameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

        console.log('Game component setup for game:', gameId);

        // Aggressively clean up any existing listeners first
        socket.off('card_selected');
        socket.off('card_deselected');
        socket.off('selection_state');
        socket.off('countdown_tick');
        socket.off('number_called');
        socket.off('game_started');
        socket.off('game_state_changed');
        socket.off('game_won');
        socket.off('game_ended');

        console.log('Game component mounted, starting connection phase');

        // CONNECT SOCKET FIRST
        if (!socket.connected) {
            console.log('Connecting socket to server...');
            socket.connect();
        }

        // Wait a bit for socket to connect, then join game
        const joinTimer = setTimeout(() => {
            if (gameId && user?.id) {
                console.log('Joining game room:', gameId);
                socket.emit('join_game', { gameId, userId: user.id });

                // Request current selection state
                socket.emit('request_selection_state', { gameId });
            }
        }, 500); // Wait 500ms for socket connection

        // Listen for successful join
        socket.on('joined_successfully', ({ gameId: joinedGameId }) => {
            console.log('✅ Successfully joined game:', joinedGameId);
            setStatus('selection');
        });

        // Listen for join errors and retry
        socket.on('error', ({ message }) => {
            console.log('❌ Join error:', message);
            if (message === 'Game not found') {
                console.log('Retrying join in 1 second...');
                setTimeout(() => {
                    if (gameId && user?.id) {
                        socket.emit('join_game', { gameId, userId: user.id });
                        socket.emit('request_selection_state', { gameId });
                    }
                }, 1000);
            }
        });

        return () => {
            clearTimeout(joinTimer);
            socket.off('joined_successfully');
            socket.off('error');
        };
    }, [user, navigate, gameId]);

    // Auto-start countdown if no cards selected after a short delay (useful for testing)
    useEffect(() => {
        if (status === 'selection' && previewCards.length === 0 && countdown === 0) {
            const timer = setTimeout(() => {
                console.log('Auto-starting countdown (no cards selected)');
                socket.emit('start_countdown', { gameId });
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [status, previewCards, countdown, gameId]);

    // Listen for real game win events
    useEffect(() => {
        socket.on('game_won', (data) => {
            console.log('Game Won!', data);
            setWinners(data.winners);
            setStatus('ended');
            // Clear any game intervals immediately
            if (gameIntervalRef.current) {
                clearInterval(gameIntervalRef.current);
                gameIntervalRef.current = null;
            }
            // Stop processing any further number calls
            voiceCaller.stop();
        });

        // Real-time card selection events
        socket.on('card_selected', ({ cardId, userId, playerCount }) => {
            console.log('Card selected:', cardId, 'by', userId);
            setSelectedCardsByPlayer((prev) => ({ ...prev, [cardId]: userId }));
            setRealPlayerCount(playerCount);
        });

        socket.on('card_deselected', ({ cardId, playerCount }) => {
            console.log('Card deselected:', cardId);
            setSelectedCardsByPlayer((prev) => {
                const next = { ...prev };
                delete next[cardId];
                return next;
            });
            setRealPlayerCount(playerCount);
        });

        socket.on('selection_state', ({ selectedCards, playerCount, status: serverStatus, countdown: serverCountdown, drawnNumbers }) => {
            console.log('Got selection state:', selectedCards, playerCount, serverStatus, serverCountdown);
            setSelectedCardsByPlayer(selectedCards);
            setRealPlayerCount(playerCount);

            // Set status based on server payload or default to selection phase
            if (serverStatus) {
                setStatus(serverStatus);
                // If still in selecting phase and countdown hasn't started, trigger start
                if (serverStatus === 'selecting' && (serverCountdown === undefined || serverCountdown === 30)) {
                    console.log('Fallback: emitting start_countdown from client');
                    socket.emit('start_countdown', { gameId });
                }
            } else {
                setStatus('selection');
            }
            if (serverCountdown !== undefined) setCountdown(serverCountdown);
            if (drawnNumbers && drawnNumbers.length > 0) {
                setCalledNumbers(new Set(drawnNumbers));
                setCurrentNumber(drawnNumbers[drawnNumbers.length - 1]);
            }
        });

        // SERVER-CONTROLLED COUNTDOWN
        socket.on('countdown_tick', ({ countdown }) => {
            console.log('Server countdown:', countdown);
            setCountdown(countdown);
            // Transition to countdown UI
            setStatus('countdown');
        });

        // SERVER-CONTROLLED NUMBER CALLING
        // SERVER-CONTROLLED NUMBER CALLING
        socket.on('number_called', ({ number, history }) => {
            try {
                console.log('Server called number:', number);
                setCurrentNumber(number);
                setCalledNumbers(new Set(history));

                // CALL NUMBER WITH VOICE!
                if (!isMuted) {
                    voiceCaller.callNumber(number).catch(err => {
                        console.error('Voice caller error (non-fatal):', err);
                    });
                }
            } catch (err) {
                console.error('Critical error in number_called listener:', err);
            }
        });

        // SERVER GAME START
        // SERVER GAME START
        socket.on('game_started', () => {
            console.log('Server started game');

            // PROMOTE PREVIEW CARDS TO ACTIVE CARDS
            const currentPreview = previewCardsRef.current;
            if (currentPreview.length > 0) {
                console.log('Promoting preview cards to active:', currentPreview);
                setMyCards([...currentPreview]);
            } else {
                console.log('No cards selected - Spectator Mode');
                setMyCards([]);
            }

            setStatus('playing');

            // Announce start
            if (!latestIsMuted.current) {
                voiceCaller.announceGameStart();
            }
        });

        socket.on('game_state_changed', ({ state }) => {
            console.log('Game state changed to:', state);
            setStatus(state);
        });

        return () => {
            console.log('🧹 Cleaning up socket listeners');
            socket.off('card_selected');
            socket.off('card_deselected');
            socket.off('selection_state');
            socket.off('countdown_tick');
            socket.off('number_called');
            socket.off('game_started');
            socket.off('game_state_changed');
            socket.off('game_won');
            socket.off('game_ended');

        };
    }, [gameId]);

    // CLIENT COUNTDOWN REMOVED - Server fully controls countdown, game start, and number calling.
    // Client listens for 'countdown_tick', 'game_started', and 'number_called' events.


    const handleNextGame = async () => {
        console.log('Starting next round...');
        if (gameIntervalRef.current) clearInterval(gameIntervalRef.current);
        voiceCaller.stop();

        // Leave the old ended game
        if (gameId) {
            socket.emit('leave_game', { gameId });
            // Wait for server to process leave before creating new game
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Clear game state
        setWinners([]);
        setCalledNumbers(new Set());
        setCurrentNumber(null);
        setSelectedCards([]);
        setPreviewCards([]);
        setMyCards([]);

        // Reset to selection phase
        setStatus('selecting');
        setCountdown(30);

        // Use matchmaking to join/create game (ensures all players in same game)
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/game/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: gameMode || 'and-zig',
                    entryFee: 10
                })
            });

            const data = await response.json();
            console.log('Joined/created game for round 2:', data.gameId);

            // Update gameId in state (no navigation = no remount = no duplicate listeners)
            setCurrentGameId(data.gameId);
            window.history.replaceState(null, '', `/game/${data.gameId}`);

            // Join the new game
            if (user?.id) {
                socket.emit('join_game', { gameId: data.gameId, userId: user.id });
                socket.emit('request_selection_state', { gameId: data.gameId });
            }
        } catch (error) {
            console.error('Error joining next round:', error);
        }
    };

    const handleSelectCard = (id: number) => {
        console.log('handleSelectCard called with id:', id);
        console.log('Current selectedCards:', selectedCards);
        console.log('Current previewCards:', previewCards);

        if (selectedCards.includes(id)) {
            console.log('Deselecting card', id);
            setSelectedCards(prev => prev.filter(c => c !== id));
            setPreviewCards(prev => prev.filter(c => c.id !== id));

            // EMIT DESELECT TO SERVER
            socket.emit('deselect_card', {
                gameId,
                cardId: id,
                userId: user?.id
            });
        } else {
            if (selectedCards.length < 2) {
                console.log('Selecting card', id);
                const newCard = generateBingoCard(id);
                console.log('Generated card:', newCard);
                setSelectedCards(prev => [...prev, id]);
                setPreviewCards(prev => [...prev, newCard]);

                // EMIT SELECT TO SERVER
                socket.emit('select_card', {
                    gameId,
                    cardId: id,
                    userId: user?.id
                });
            } else {
                console.log('Cannot select more than 2 cards');
            }
        }
    };

    // startGame REMOVED - Server controls game start via 'game_started' event

    const handleBingoClaim = () => {
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
            // Valid Claim! Send to server for validation
            console.log('🎯 Sending BINGO claim to server');

            // Send claim to server with first winning card
            const winningCard = myCards.find(card => {
                const result = checkWinningPattern(card.numbers, currentCalled, gameMode);
                return result.isWinner;
            });

            if (winningCard && gameId && user?.id) {
                socket.emit('claim_bingo', {
                    gameId,
                    userId: user.id,
                    cardId: winningCard.id,
                    board: winningCard.numbers, // 2D array
                    markedNumbers: Array.from(currentCalled) // Convert Set to Array
                });
            }
        } else {
            // Invalid Claim - game continues
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

    // Unified check for Selection/Countdown phase
    if (status === 'selection' || status === 'selecting' || status === 'countdown') {
        return (
            <div className="min-h-screen bg-[#1a1b2e] flex flex-col text-white overflow-hidden">
                {/* Header with Timer */}
                <div className="bg-gradient-to-r from-orange-500 to-red-600 p-2 text-center border-b border-white/10">
                    <div className="flex items-center justify-center gap-4 text-sm">
                        <div><span className="text-white/70">Time:</span> <span className="font-black text-xl">{countdown}s</span></div>
                        <div className="h-4 w-px bg-white/20" />
                        <div><span className="text-white/70">Players:</span> <span className="font-bold">{realPlayerCount}</span></div>
                        <div className="h-4 w-px bg-white/20" />
                        <div><span className="text-white/70">Prize:</span> <span className="font-bold">{(() => {
                            const unitPrice = gameMode === 'and-zig' ? 50 : gameMode === 'hulet-zig' ? 100 : 150;
                            const totalCards = Object.keys(_selectedCardsByPlayer).length;
                            const derash = Math.floor(totalCards * unitPrice * 0.85);
                            return `${derash.toLocaleString()} Birr`;
                        })()}</span></div>
                    </div>
                </div>

                {/* Selection Grid */}
                <div className="flex-1 p-2 overflow-y-auto pb-[200px]">
                    <h2 className="text-center font-bold text-base mb-2">Select Your Cards (Max 2)</h2>

                    <div className="grid grid-cols-7 gap-1.5">
                        {availableCards.map(num => {
                            const isMyCard = selectedCards.includes(num);
                            const isTakenByOther = _selectedCardsByPlayer[num] && _selectedCardsByPlayer[num] !== user?.id;

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
                                                ? "bg-slate-700/50 text-slate-600 cursor-not-allowed opacity-50"
                                                : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:scale-105 border border-slate-700"
                                    )}
                                >
                                    {num}
                                </button>
                            );
                        })}
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
                {(() => {
                    const unitPrice = gameMode === 'and-zig' ? 50 : gameMode === 'hulet-zig' ? 100 : 150;
                    // Calculate total cards selected (from selectedCardsByPlayer Map)
                    const totalCardsSelected = Object.keys(_selectedCardsByPlayer).length;
                    // DERASH = (total cards × unit price) - 15% house fee
                    const derash = Math.floor(totalCardsSelected * unitPrice * 0.85);

                    return [
                        { label: 'GAME ID', val: gameId?.slice(0, 8) || 'ic-bingo' },
                        { label: 'PLAYERS', val: realPlayerCount.toString() || '0' },
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
                                            {currentNumber ? `${getLetter(currentNumber)}-${currentNumber}` : '--'}
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
