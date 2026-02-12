
export interface RiskResult {
    userId: string;
    riskScore: number; // 0-100
    flags: string[];
}

export function analyzePlayerRisk(games: any[]): RiskResult | null {
    if (!games || games.length < 5) return null; // Need sample size

    let wins = 0;
    let consecutiveWins = 0;
    let maxConsecutiveStats = 0;

    for (const game of games) {
        if (game.result === 'win') {
            wins++;
            consecutiveWins++;
        } else {
            consecutiveWins = 0;
        }
        maxConsecutiveStats = Math.max(maxConsecutiveStats, consecutiveWins);
    }

    const winRate = wins / games.length;
    let score = 0;
    const flags: string[] = [];

    // Rule 1: Impossible Win Rate (>60% in 4-player game is highly suspicious)
    if (winRate > 0.6) {
        score += 50;
        flags.push(`High Win Rate: ${(winRate * 100).toFixed(1)}%`);
    }

    // Rule 2: Win Streak
    if (maxConsecutiveStats >= 5) {
        score += 30;
        flags.push(`Win Streak: ${maxConsecutiveStats} games`);
    }

    if (score > 0) {
        return {
            userId: games[0].user_id, // Assuming grouped by user
            riskScore: Math.min(score, 100),
            flags
        };
    }

    return null;
}
