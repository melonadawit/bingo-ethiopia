'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdmin, LiveGame } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Pause, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function GamesPage() {
    const queryClient = useQueryClient();

    const { data: games, isLoading } = useQuery<{ games: LiveGame[] }>({
        queryKey: ['live-games'],
        queryFn: () => fetchAdmin('/games/live'),
        refetchInterval: 5000, // Real-time pulse
    });

    const actionMutation = useMutation({
        mutationFn: async ({ gameId, action }: { gameId: string, action: 'pause' | 'resume' | 'abort' }) => {
            return fetchAdmin(`/games/${gameId}/action`, {
                method: 'POST',
                body: JSON.stringify({ action }),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['live-games'] });
        },
    });

    if (isLoading) {
        return <div className="p-8 text-center">Loading live games...</div>;
    }

    const liveGames = games?.games || [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">Live Games</h1>
                <Badge variant={liveGames.length > 0 ? "default" : "secondary"}>
                    {liveGames.length} Active
                </Badge>
            </div>

            {liveGames.length === 0 ? (
                <Card className="bg-muted/50">
                    <CardContent className="flex flex-col items-center justify-center p-12 space-y-4">
                        <div className="rounded-full bg-background p-4">
                            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">No active games running right now.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {liveGames.map((game) => (
                        <GameCard
                            key={game.id}
                            game={game}
                            onAction={(action) => actionMutation.mutate({ gameId: game.id, action })}
                            isPending={actionMutation.isPending}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function GameCard({
    game,
    onAction,
    isPending
}: {
    game: LiveGame,
    onAction: (a: 'pause' | 'resume' | 'abort') => void,
    isPending: boolean
}) {
    return (
        <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30 pb-4">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                            {game.mode}
                            <StatusBadge status={game.status} />
                        </CardTitle>
                        <CardDescription className="text-xs font-mono">
                            ID: {game.id.slice(0, 8)}...
                        </CardDescription>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold">{game.player_count}</div>
                        <div className="text-xs text-muted-foreground">Players</div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
                <div className="text-xs text-muted-foreground">
                    Started {game.started_at ? formatDistanceToNow(new Date(game.started_at)) + ' ago' : 'Waiting...'}
                </div>

                <div className="flex gap-2 justify-end">
                    {game.status === 'active' ? (
                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => onAction('pause')}
                            disabled={isPending}
                        >
                            <Pause className="w-4 h-4 mr-1" /> Pause
                        </Button>
                    ) : game.status === 'waiting' ? (
                        <Button
                            size="sm"
                            variant="outline"
                            disabled
                        >
                            Waiting
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onAction('resume')}
                            disabled={isPending}
                        >
                            <Play className="w-4 h-4 mr-1" /> Resume
                        </Button>
                    )}

                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onAction('abort')}
                        disabled={isPending}
                    >
                        Abort
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'active') return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
    if (status === 'waiting') return <Badge variant="secondary">Waiting</Badge>;
    return <Badge variant="outline">{status}</Badge>;
}
