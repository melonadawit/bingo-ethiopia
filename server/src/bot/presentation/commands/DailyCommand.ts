import { Context } from 'telegraf';
import { BaseCommand } from './BaseCommand';
import { KeyboardBuilder } from '../../utils/KeyboardBuilder';
import { EMOJI } from '../../config/constants';
import { dailyRewardService } from '../../infrastructure/services/DailyRewardService';
import { botUserService } from '../../infrastructure/services/BotIntegrationService';

/**
 * /daily command - Claim daily rewards
 */
export class DailyCommand extends BaseCommand {
    readonly name = 'daily';
    readonly description = 'Claim your daily reward';

    protected async handle(ctx: Context): Promise<void> {
        const user = ctx.from;
        if (!user) return;

        try {
            // Get streak info
            const streakInfo = await dailyRewardService.getStreakInfo(user.id);

            if (streakInfo.canClaim) {
                // Show claim button
                const message = this.getClaimableMessage(streakInfo);
                const keyboard = new KeyboardBuilder()
                    .addButton(`🎁 Claim ${streakInfo.nextReward} Birr`, 'daily_claim')
                    .addButton('🔙 Back to Menu', 'main_menu')
                    .build();

                await this.sendReply(ctx, message, keyboard);
            } else {
                // Already claimed
                const message = this.getAlreadyClaimedMessage(streakInfo);
                const keyboard = new KeyboardBuilder()
                    .addButton('🔙 Back to Menu', 'main_menu')
                    .build();

                await this.sendReply(ctx, message, keyboard);
            }
        } catch (error) {
            console.error('Error in daily command:', error);
            await ctx.reply('❌ Error loading daily rewards. Please try again.');
        }
    }

    private getClaimableMessage(info: any): string {
        const currentStreak = info.streakDays;
        const nextDay = currentStreak === 7 ? 1 : currentStreak + 1;

        return `
${EMOJI.GIFT} *Daily Reward Available!*

${EMOJI.FIRE} *Current Streak:* ${currentStreak} day${currentStreak !== 1 ? 's' : ''}
${EMOJI.MONEY} *Today's Reward:* ${info.nextReward} Birr
${EMOJI.CHART} *Total Claimed:* ${info.totalClaimed} Birr

*Reward Tiers:*
Day 1: 10 Birr
Day 2: 20 Birr
Day 3: 30 Birr
Day 4: 50 Birr
Day 5: 70 Birr
Day 6: 85 Birr
Day 7: 100 Birr ${EMOJI.CELEBRATE}

${nextDay === 1 ? `\n${EMOJI.POINT_RIGHT} *Starting fresh 7-day streak!*` : `\n${EMOJI.POINT_RIGHT} *Tomorrow:* ${this.getRewardForDay(nextDay + 1)} Birr`}

Claim within 24-48 hours to keep your streak!
    `.trim();
    }

    private getAlreadyClaimedMessage(info: any): string {
        return `
${EMOJI.CHECK} *Already Claimed Today!*

${EMOJI.FIRE} *Current Streak:* ${info.streakDays} day${info.streakDays !== 1 ? 's' : ''}
${EMOJI.MONEY} *Next Reward:* ${info.nextReward} Birr
${EMOJI.CHART} *Total Claimed:* ${info.totalClaimed} Birr

⏰ *Come back in:* ${info.timeUntilNext}

${EMOJI.GAME} Play games while you wait!
    `.trim();
    }

    private getRewardForDay(day: number): number {
        const tiers = [10, 20, 30, 50, 70, 85, 100];
        return tiers[day - 1] || 10;
    }
}
