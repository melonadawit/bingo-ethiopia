import { Context } from 'telegraf';
import { BaseCommand } from './BaseCommand';
import { KeyboardBuilder } from '../../utils/KeyboardBuilder';
import { EMOJI } from '../../config/constants';

/**
 * /play command - Show available games and let user join
 */
export class PlayCommand extends BaseCommand {
    readonly name = 'play';
    readonly description = 'Join a game';

    constructor(private webAppUrl: string) {
        super();
    }

    protected async handle(ctx: Context): Promise<void> {
        const message = `
${EMOJI.GAME} *Choose Your Game Mode:*

🎯 *Ande Zeg (አንድ ዘግ)*
Win with ONE horizontal line
Entry: 10-50 Birr

🎯🎯 *Hulet Zeg (ሁለት ዘግ)*  
Win with TWO horizontal lines
Entry: 20-100 Birr

🎯🎯🎯 *Mulu Zeg (ሙሉ ዘግ)*
Win with FULL CARD
Entry: 50-500 Birr

${EMOJI.POINT_RIGHT} Select below or tap "Play Game" for quick join:
    `.trim();

        const keyboard = new KeyboardBuilder()
            .addWebAppButton(`${EMOJI.GAME} Play Game (Quick Join)`, this.webAppUrl + '/lobby')
            .addButton('🎯 Ande Zeg Games', 'mode_and-zig')
            .addButton('🎯🎯 Hulet Zeg Games', 'mode_hulet-zig')
            .addButton('🎯🎯🎯 Mulu Zeg Games', 'mode_mulu-zig')
            .addButtonRow([
                { text: '🏆 Tournaments', data: 'tournaments' },
                { text: '🚪 Private Room', data: 'private' },
            ])
            .build();

        await this.sendReply(ctx, message, keyboard);
    }
}
