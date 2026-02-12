import { Env } from '../types';
import { getSupabase } from '../utils';

import { BotConfig, PAYMENT_CONFIG } from './config';

// Default fallback config (hardcoded values as safety net)
const DEFAULT_CONFIG: BotConfig = {
    ...PAYMENT_CONFIG, // Use the updated Amharic values from config.ts
    adminIds: [PAYMENT_CONFIG.adminId],
    // Keep legacy structures for compatibility if needed, but prompts are now authoritative in PAYMENT_CONFIG
    botFlows: {
        onboarding: {
            welcome: '👋 Welcome to Bingo Ethiopia!\n\nPlease register first by clicking the button below:',
            welcome_back: '👋 Welcome back! We missed you.',
            registration_success: '✅ Registration successful! You can now deposit and play.'
        },
        financials: {},
        deposit: {
            prompt_amount: PAYMENT_CONFIG.prompts.depositAmount,
            prompt_bank: PAYMENT_CONFIG.prompts.selectDepositBank,
            pending_message: PAYMENT_CONFIG.prompts.depositPending,
            success_message: PAYMENT_CONFIG.prompts.depositApproved,
            declined_message: PAYMENT_CONFIG.prompts.depositDeclined,
            invalid_amount: '❌ Invalid Amount.',
            instructions: PAYMENT_CONFIG.prompts.depositInstructionFooter
        },
        withdrawal: {
            prompt_amount: PAYMENT_CONFIG.prompts.withdrawAmount,
            prompt_bank: PAYMENT_CONFIG.prompts.selectWithdrawBank,
            prompt_phone: PAYMENT_CONFIG.prompts.enterPhone,
            prompt_account: PAYMENT_CONFIG.prompts.enterAccount,
            pending_message: PAYMENT_CONFIG.prompts.withdrawPending,
            success_message: PAYMENT_CONFIG.prompts.withdrawApproved,
            declined_message: PAYMENT_CONFIG.prompts.withdrawDeclined,
            min_error: PAYMENT_CONFIG.prompts.withdrawMinError,
            max_error: PAYMENT_CONFIG.prompts.withdrawMaxError,
            balance_error: PAYMENT_CONFIG.prompts.withdrawBalanceError
        },
        game: {
            lobby_waiting: '🎮 Waiting for players to join...',
            game_started: '🚀 Game Started! Good luck everyone!',
            winner_announcement: '🎉 BINGO! We have a winner!'
        },
        errors: {
            unknown_command: '❓ Unknown command. Try /start for help.',
            invalid_input: '❌ Invalid input. Please try again.',
            process_error: '❌ An error occurred. Please try again later.'
        },
        referral: {
            share_message: '🎁 Use my code to join Bingo Ethiopia!',
            referrer_bonus: '🎉 Someone used your code! You earned {amount} ETB!',
            referred_bonus: '✅ Referral applied! You earned {amount} ETB bonus.'
        },
        support: {
            contact_message: PAYMENT_CONFIG.prompts.depositInstructionFooter,
            instructions: PAYMENT_CONFIG.instructions
        }
    },
    // Add missing fields required by BotConfig interface
    botMenuButtons: [],
    botCommands: {},
    botSettings: {
        welcome_message: PAYMENT_CONFIG.prompts.depositAmount, // Placeholder
        menu_button_text: '🎮',
        open_now_text: '🎮 Play Now'
    },
    botFinancials: {},
    botPaymentMethods: []
};

export class BotConfigService {
    private env: Env;

    constructor(env: Env) {
        this.env = env;
    }

    async getConfig(): Promise<BotConfig> {
        const supabase = getSupabase(this.env);

        // Fetch all configs in one go
        const { data: configs, error } = await supabase!
            .from('bot_configs')
            .select('*');

        if (error || !configs) {
            console.error('Failed to load bot configs:', error);
            return DEFAULT_CONFIG;
        }

        // Map DB rows (key-value) back to structured object
        const configMap = new Map(configs.map(c => [c.key, c.value]));
        const getVal = (key: string, def: any) => {
            const val = configMap.get(key) || def;
            return typeof val === 'string' ? val.replace(/\\n/g, '\n') : val;
        };
        const getJson = (key: string, def: any) => {
            const val = configMap.get(key);
            if (!val) return def;
            try {
                return (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) ? JSON.parse(val) : val;
            } catch (e) {
                return def;
            }
        };

        // Fetch active game config for shared settings (daily rewards, etc.)
        const { data: gameConfig } = await supabase!
            .from('game_configs')
            .select('features')
            .eq('is_active', true)
            .maybeSingle();

        // 1. Build authoritative botFlows (Priority: visual flow keys > legacy keys)
        const botFlows = {
            onboarding: {
                welcome: getVal('welcome_message', getVal('bot_settings.welcome_message', getVal('botFlows.onboarding.welcome', DEFAULT_CONFIG.botFlows?.onboarding.welcome || ''))),
                welcome_back: getVal('msg_welcome_back', getVal('welcome_message', '')),
                registration_success: getVal('msg_reg_success', DEFAULT_CONFIG.botFlows?.onboarding.registration_success || ''),
                referral_message: getVal('referral_message', getVal('botFlows.referral.share_message', ''))
            },
            deposit: {
                prompt_amount: getVal('msg_dep_start', getVal('prompts.depositAmount', DEFAULT_CONFIG.botFlows?.deposit.prompt_amount || '')),
                prompt_bank: getVal('msg_dep_method', getVal('prompts.selectDepositBank', DEFAULT_CONFIG.botFlows?.deposit.prompt_bank || '')),
                pending_message: getVal('msg_dep_confirm', getVal('prompts.depositPending', DEFAULT_CONFIG.botFlows?.deposit.pending_message || '')),
                success_message: getVal('msg_dep_success', getVal('prompts.depositApproved', DEFAULT_CONFIG.botFlows?.deposit.success_message || '')),
                declined_message: getVal('msg_dep_declined', getVal('prompts.depositDeclined', DEFAULT_CONFIG.botFlows?.deposit.declined_message || '')),
                invalid_amount: getVal('msg_dep_invalid', '❌ Invalid Amount.'),
                instructions: getVal('msg_dep_instructions', getVal('prompts.paymentIssue', DEFAULT_CONFIG.botFlows?.deposit.instructions || ''))
            },
            withdrawal: {
                prompt_amount: getVal('msg_wd_start', getVal('prompts.withdrawAmount', DEFAULT_CONFIG.botFlows?.withdrawal.prompt_amount || '')),
                prompt_bank: getVal('msg_wd_bank', getVal('prompts.selectWithdrawBank', DEFAULT_CONFIG.botFlows?.withdrawal.prompt_bank || '')),
                prompt_phone: getVal('msg_wd_phone', getVal('prompts.enterPhone', DEFAULT_CONFIG.botFlows?.withdrawal.prompt_phone || '')),
                prompt_account: getVal('msg_wd_account', getVal('prompts.enterAccount', DEFAULT_CONFIG.botFlows?.withdrawal.prompt_account || '')),
                pending_message: getVal('msg_wd_confirm', getVal('prompts.withdrawPending', DEFAULT_CONFIG.botFlows?.withdrawal.pending_message || '')),
                success_message: getVal('msg_wd_success', getVal('prompts.withdrawApproved', DEFAULT_CONFIG.botFlows?.withdrawal.success_message || '')),
                declined_message: getVal('msg_wd_declined', getVal('prompts.withdrawDeclined', DEFAULT_CONFIG.botFlows?.withdrawal.declined_message || '')),
                min_error: getVal('msg_wd_min_err', getVal('prompts.withdrawMinError', DEFAULT_CONFIG.botFlows?.withdrawal.min_error || '')),
                max_error: getVal('msg_wd_max_err', getVal('prompts.withdrawMaxError', DEFAULT_CONFIG.botFlows?.withdrawal.max_error || '')),
                balance_error: getVal('msg_wd_bal_err', getVal('prompts.withdrawBalanceError', DEFAULT_CONFIG.botFlows?.withdrawal.balance_error || ''))
            },
            game: {
                lobby_waiting: getVal('msg_game_waiting', '🎮 Waiting for players to join...'),
                game_started: getVal('msg_game_start', '🚀 Game Started! Good luck everyone!'),
                winner_announcement: getVal('msg_game_win', '🎉 BINGO! We have a winner!')
            },
            referral: {
                share_message: getVal('referral_message', getVal('prompts.referralShare', DEFAULT_CONFIG.botFlows?.referral.share_message || '')),
                referrer_bonus: getVal('referral_reward_referrer', '10'),
                referred_bonus: getVal('referral_reward_referred', '5')
            },
            financials: DEFAULT_CONFIG.botFlows!.financials,
            errors: DEFAULT_CONFIG.botFlows!.errors,
            support: {
                contact_message: getVal('msg_support', DEFAULT_CONFIG.botFlows?.support.contact_message || ''),
                instructions: getVal('msg_instructions', DEFAULT_CONFIG.botFlows?.support.instructions || '')
            }
        };

        // Handle daily rewards merger: prefer game_configs array if present
        let dailyRewards = getJson('daily_rewards_structure', DEFAULT_CONFIG.dailyRewards);
        if (gameConfig?.features?.daily_rewards && Array.isArray(gameConfig.features.daily_rewards)) {
            // Convert array back to the object structure the bot expects if needed, 
            // but we'll update the bot to handle the array/object gracefully.
            const obj: Record<string, number> = {};
            gameConfig.features.daily_rewards.forEach((val: number, idx: number) => {
                obj[(idx + 1).toString()] = val;
            });
            dailyRewards = obj;
        }

        const finalConfig: BotConfig = {
            methods: getJson('payment_methods', DEFAULT_CONFIG.methods),
            prompts: {
                depositAmount: botFlows.deposit.prompt_amount,
                selectDepositBank: botFlows.deposit.prompt_bank,
                depositPending: botFlows.deposit.pending_message,
                depositApproved: botFlows.deposit.success_message,
                depositDeclined: botFlows.deposit.declined_message,
                withdrawAmount: botFlows.withdrawal.prompt_amount,
                withdrawMinError: botFlows.withdrawal.min_error,
                withdrawMaxError: botFlows.withdrawal.max_error,
                withdrawBalanceError: botFlows.withdrawal.balance_error,
                selectWithdrawBank: botFlows.withdrawal.prompt_bank,
                enterPhone: botFlows.withdrawal.prompt_phone,
                enterAccount: botFlows.withdrawal.prompt_account,
                withdrawPending: botFlows.withdrawal.pending_message,
                withdrawApproved: botFlows.withdrawal.success_message,
                withdrawDeclined: botFlows.withdrawal.declined_message,
                paymentIssue: botFlows.deposit.instructions,
                depositInstructionFooter: botFlows.deposit.instructions
            },
            instructions: getVal('msg_instructions', DEFAULT_CONFIG.instructions),
            support: getVal('msg_support', DEFAULT_CONFIG.support),
            limits: {
                minDeposit: Number(getVal('min_deposit', DEFAULT_CONFIG.limits.minDeposit)),
                minWithdrawal: Number(getVal('min_withdrawal', DEFAULT_CONFIG.limits.minWithdrawal)),
                maxWithdrawal: Number(getVal('max_withdrawal', DEFAULT_CONFIG.limits.maxWithdrawal)),
                withdrawalFee: Number(getVal('withdrawal_fee', DEFAULT_CONFIG.limits.withdrawalFee))
            },
            adminIds: getJson('admin_ids', DEFAULT_CONFIG.adminIds),
            referral: {
                referrerReward: Number(getVal('referral_reward_referrer', DEFAULT_CONFIG.referral.referrerReward)),
                referredReward: Number(getVal('referral_reward_referred', DEFAULT_CONFIG.referral.referredReward)),
            },
            dailyRewards: dailyRewards,
            // CMS Configs
            botMenuButtons: getJson('botMenuButtons', getJson('bot_menu_buttons', [])),
            botCommands: getJson('botCommands', getJson('bot_commands', {})),
            botSettings: {
                welcome_message: botFlows.onboarding.welcome,
                menu_button_text: getVal('bot_settings.menu_button_text', '🎮'),
                open_now_text: getVal('bot_settings.open_now_text', '🎮 Play Now'),
                web_app_url: getVal('bot_settings.web_app_url', 'https://main.bingo-ethiopia.pages.dev'),
                maintenance_mode: getVal('bot_settings.maintenance_mode', false)
            },
            botFinancials: getJson('botFinancials', getJson('bot_financials', {})),
            botPaymentMethods: getJson('botPaymentMethods', getJson('payment_methods', [])),
            botFlows: botFlows,
            dailyCheckinEnabled: gameConfig?.features?.daily_checkin_enabled !== false
        };

        console.log('[DEBUG_CONFIG] Initial Methods (Defaults):', JSON.stringify(finalConfig.methods));
        console.log('[DEBUG_CONFIG] DB botPaymentMethods (Raw):', finalConfig.botPaymentMethods);

        // Overlay dynamic values on top of structure
        // 1. Process botPaymentMethods (The simplified array used for the selection menu)
        if (finalConfig.botPaymentMethods && Array.isArray(finalConfig.botPaymentMethods)) {
            finalConfig.botPaymentMethods.forEach((m: any) => {
                const existing = finalConfig.methods[m.key];
                if (existing) {
                    finalConfig.methods[m.key].enabled = m.enabled !== undefined ? !!m.enabled : true;
                    if (m.label) finalConfig.methods[m.key].name = m.label;
                }
            });
        }

        // 2. Process legacy/detailed payment_methods object (for account details)
        const detailedMethods = getJson('payment_methods', null);
        if (detailedMethods && typeof detailedMethods === 'object' && !Array.isArray(detailedMethods)) {
            Object.entries(detailedMethods).forEach(([key, data]: [string, any]) => {
                if (finalConfig.methods[key]) {
                    finalConfig.methods[key] = {
                        ...finalConfig.methods[key],
                        ...data,
                        // If enabled is explicitly false in either place, it stays false
                        enabled: (data.enabled !== false && finalConfig.methods[key].enabled !== false)
                    };
                } else if (data.enabled !== false) {
                    finalConfig.methods[key] = {
                        ...data,
                        enabled: true,
                        instructions: data.instructions || { en: '', am: '' }
                    };
                }
            });
        }

        // Safety: Ensure all methods have correct instructions structure before loading custom ones
        Object.keys(finalConfig.methods).forEach(k => {
            if (!finalConfig.methods[k].instructions) {
                finalConfig.methods[k].instructions = { en: '', am: '' };
            }
        });

        // Load custom instructions for each bank from database
        Object.keys(finalConfig.methods).forEach(bankKey => {
            const customInstructions = getVal(`methods.${bankKey}.instructions.am`, null);
            if (customInstructions) {
                finalConfig.methods[bankKey].instructions.am = customInstructions;
            }
        });

        // Financial Limits & Referral
        if (finalConfig.botFinancials) {
            const financials = finalConfig.botFinancials as any;
            if (financials.minDeposit) finalConfig.limits.minDeposit = Number(financials.minDeposit);
            if (financials.minWithdrawal) finalConfig.limits.minWithdrawal = Number(financials.minWithdrawal);
            if (financials.maxWithdrawal) finalConfig.limits.maxWithdrawal = Number(financials.maxWithdrawal);
            if (financials.withdrawalFee) finalConfig.limits.withdrawalFee = Number(financials.withdrawalFee);

            if (financials.referrerReward) finalConfig.referral.referrerReward = Number(financials.referrerReward);
            if (financials.referredReward) finalConfig.referral.referredReward = Number(financials.referredReward);
        }

        return finalConfig;
    }
}
