// Core domain interface for commands
export interface ICommand {
    readonly name: string;
    readonly description: string;
    execute(ctx: any): Promise<void>;
}

// Command execution result
export interface CommandResult {
    success: boolean;
    message?: string;
    error?: Error;
}

// User entity interface
export interface IUser {
    id: string;
    telegramId: number;
    username?: string;
    firstName?: string;
    balance: number;
    createdAt: Date;
    lastActive: Date;
}

// Game entity interface
export interface IGame {
    id: string;
    mode: 'and-zig' | 'hulet-zig' | 'mulu-zig';
    entryFee: number;
    maxPlayers: number;
    currentPlayers: number;
    status: 'waiting' | 'in-progress' | 'completed';
    startTime?: Date;
}

// Notification interface
export interface INotification {
    userId: string;
    telegramId: number;
    message: string;
    type: 'game_start' | 'win' | 'daily_reward' | 'tournament';
    priority: 'low' | 'normal' | 'high';
}
