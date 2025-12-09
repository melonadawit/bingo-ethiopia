import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { socket } from '../services/socket';
import { BingoBoard } from '../components/game/BingoBoard';
import { NumberDisplay } from '../components/game/NumberDisplay';
import { Button } from '../components/ui/Button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Helper to generate a random board (Mock for now, should ideally be validated)
const generateBoard = (): number[][] => {
    // Simplified generation logic
    const board = Array(5).fill(0).map(() => Array(5).fill(0));
    // Fill with random numbers... (omitted for brevity, assume valid 1-75)
    // Detailed generator will be added later
    for (let i = 0; i < 5; i++) {
        for (let j = 0; j < 5; j++) {
            if (i === 2 && j === 2) continue; // Free space
            board[i][j] = Math.floor(Math.random() * 75) + 1;
        }
    }
    return board;
};

const GamePage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    const gameId = location.state?.gameId; // Passed from Lobby

    const [board] = useState<number[][]>(generateBoard());
    const [marked, setMarked] = useState<boolean[][]>(
        Array(5).fill(0).map((_, r) => Array(5).fill(false).map((_, c) => (r === 2 && c === 2)))
    );
    const [currentNumber, setCurrentNumber] = useState<number | null>(null);
    const [history, setHistory] = useState<number[]>([]);
    const [status, setStatus] = useState<'connecting' | 'waiting' | 'playing' | 'ended'>('connecting');

    useEffect(() => {
        if (!gameId || !user) {
            navigate('/lobby');
            return;
        }

        socket.connect();
        setStatus('connecting');

        socket.emit('join_game', { gameId, userId: user.id });

        socket.on('joined_successfully', () => {
            console.log('Joined game:', gameId);
            setStatus('waiting');
            // Testing: Auto-start for now
            socket.emit('start_test_game', { gameId });
        });


        socket.on('game_started', () => {
            setStatus('playing');
        });

        socket.on('number_drawn', (data: { number: number, history: number[] }) => {
            setCurrentNumber(data.number);
            setHistory(data.history);

            // Auto-mark logic (optional, for now user clicks)
        });

        return () => {
            socket.off('joined_successfully');
            socket.off('game_started');
            socket.off('number_drawn');
            socket.disconnect();
        };
    }, [gameId, user, navigate]);

    const handleCellClick = (r: number, c: number) => {
        // Toggle mark
        const newMarked = [...marked];
        newMarked[r][c] = !newMarked[r][c];
        setMarked(newMarked);
    };

    if (status === 'connecting') {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-white/60">Connecting to Game...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 flex flex-col">
            <header className="flex items-center justify-between mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate('/lobby')}>
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <div className="text-right">
                    <p className="text-sm text-white/60">Game ID</p>
                    <p className="font-mono text-xs text-white/40">...{gameId?.slice(-4)}</p>
                </div>
            </header>

            <main className="flex-1 max-w-lg mx-auto w-full">
                {status === 'waiting' && (
                    <div className="text-center py-10 animate-pulse">
                        <h2 className="text-2xl font-bold text-white mb-2">Waiting for Players...</h2>
                        <p className="text-white/60">Game will start momentarily.</p>
                    </div>
                )}

                {status === 'playing' && (
                    <>
                        <NumberDisplay currentNumber={currentNumber} history={history} />
                        <BingoBoard board={board} marked={marked} onCellClick={handleCellClick} />

                        <div className="mt-8">
                            <Button
                                className="w-full py-6 text-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-lg shadow-green-500/25"
                            >
                                BINGO!
                            </Button>
                        </div>
                    </>
                )}
            </main>
        </div>
    );
};

export default GamePage;
