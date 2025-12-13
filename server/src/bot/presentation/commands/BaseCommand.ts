import { Context } from 'telegraf';
import { ICommand, CommandResult } from '../../core/interfaces/ICommand';
import { BOT_CONFIG, ERROR_MESSAGES } from '../../config/constants';

/**
 * Abstract base class for all bot commands
 * Implements Command Pattern with error handling and validation
 */
export abstract class BaseCommand implements ICommand {
    abstract readonly name: string;
    abstract readonly description: string;

    /**
     * Main execution method with error handling
     */
    async execute(ctx: Context): Promise<void> {
        try {
            // Validate command usage
            if (this.validate && !this.validate(ctx)) {
                await ctx.reply(ERROR_MESSAGES.INVALID_AMOUNT);
                return;
            }

            // Set timeout for command execution
            const timeoutPromise = new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), BOT_CONFIG.COMMAND_TIMEOUT)
            );

            // Race between command execution and timeout
            await Promise.race([
                this.handle(ctx),
                timeoutPromise
            ]);

        } catch (error) {
            await this.handleError(ctx, error as Error);
        }
    }

    /**
     * Override this method to implement command logic
     */
    protected abstract handle(ctx: Context): Promise<void>;

    /**
     * Override this for custom validation
     */
    protected validate?(ctx: Context): boolean;

    /**
     * Centralized error handling
     */
    protected async handleError(ctx: Context, error: Error): Promise<void> {
        console.error(`Error in ${this.name} command:`, error);

        const errorMessage = this.getErrorMessage(error);
        await ctx.reply(errorMessage);
    }

    /**
     * Map errors to user-friendly messages
     */
    protected getErrorMessage(error: Error): string {
        if (error.message === 'Timeout') {
            return ERROR_MESSAGES.COMMAND_TIMEOUT;
        }
        if (error.message.includes('balance')) {
            return ERROR_MESSAGES.INSUFFICIENT_BALANCE;
        }
        if (error.message.includes('full')) {
            return ERROR_MESSAGES.GAME_FULL;
        }
        return ERROR_MESSAGES.GENERIC;
    }

    /**
     * Helper to send formatted reply
     */
    protected async sendReply(
        ctx: Context,
        message: string,
        options?: any
    ): Promise<void> {
        // Truncate message if too long
        const truncated = message.length > BOT_CONFIG.MAX_MESSAGE_LENGTH
            ? message.substring(0, BOT_CONFIG.MAX_MESSAGE_LENGTH - 3) + '...'
            : message;

        await ctx.reply(truncated, {
            parse_mode: 'Markdown',
            ...options
        });
    }
}
