import { Telegraf } from 'telegraf';
import { ICommand } from '../../core/interfaces/ICommand';
import { StartCommand } from './StartCommand';
import { PlayCommand } from './PlayCommand';
import { BalanceCommand } from './BalanceCommand';
import { DepositCommand, WithdrawCommand, HelpCommand } from './WalletCommands';
import { DailyCommand } from './DailyCommand';
import { HistoryCommand } from './HistoryCommand';

/**
 * Command Registry - Factory Pattern
 * Centralizes command creation and management
 */
export class CommandRegistry {
    private commands: Map<string, ICommand> = new Map();

    constructor(
        private bot: Telegraf,
        private webAppUrl: string
    ) {
        this.registerCommands();
    }

    /**
     * Register all bot commands
     */
    private registerCommands(): void {
        // Create command instances
        const commands: ICommand[] = [
            new StartCommand(this.webAppUrl),
            new PlayCommand(this.webAppUrl),
            new BalanceCommand(),
            new DepositCommand(),
            new WithdrawCommand(),
            new HelpCommand(),
            new DailyCommand(),
            new HistoryCommand(),
        ];

        // Register with bot and store in map
        commands.forEach(cmd => {
            this.commands.set(cmd.name, cmd);
            this.bot.command(cmd.name, async (ctx) => {
                await cmd.execute(ctx);
            });
        });

        // Set bot commands for Telegram menu
        this.setBotCommands();
    }

    /**
     * Set command list in Telegram UI
     */
    private async setBotCommands(): Promise<void> {
        try {
            const commandList = Array.from(this.commands.values()).map(cmd => ({
                command: cmd.name,
                description: cmd.description
            }));

            await this.bot.telegram.setMyCommands(commandList);
            console.log('✅ Bot commands registered:', commandList.length);
        } catch (error) {
            console.error('❌ Failed to set bot commands:', error);
        }
    }

    /**
     * Get command by name
     */
    getCommand(name: string): ICommand | undefined {
        return this.commands.get(name);
    }

    /**
     * Get all registered commands
     */
    getAllCommands(): ICommand[] {
        return Array.from(this.commands.values());
    }
}
