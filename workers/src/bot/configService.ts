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
            invalid_amount: '❌ Invalid Amount.'
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
            contact_message: PAYMENT_CONFIG.prompts.paymentIssue,
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
    botPaymentMethods: {}
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
        const getVal = (key: string, def: any) => configMap.get(key) || def;
        const getJson = (key: string, def: any) => {
            const val = configMap.get(key);
            return val ? (typeof val === 'string' ? JSON.parse(val) : val) : def;
        };

        const finalConfig: BotConfig = {
            methods: getJson('payment_methods', DEFAULT_CONFIG.methods),
            prompts: {
                depositAmount: getVal('prompts.depositAmount', getVal('msg_deposit_prompt', DEFAULT_CONFIG.prompts.depositAmount)),
                selectDepositBank: getVal('prompts.selectDepositBank', DEFAULT_CONFIG.prompts.selectDepositBank),
                depositPending: getVal('prompts.depositPending', getVal('msg_deposit_pending', DEFAULT_CONFIG.prompts.depositPending)),
                depositApproved: getVal('prompts.depositApproved', DEFAULT_CONFIG.prompts.depositApproved),
                depositDeclined: getVal('prompts.depositDeclined', DEFAULT_CONFIG.prompts.depositDeclined),

                withdrawAmount: getVal('prompts.withdrawAmount', getVal('msg_withdraw_prompt', DEFAULT_CONFIG.prompts.withdrawAmount)),
                withdrawMinError: getVal('prompts.withdrawMinError', DEFAULT_CONFIG.prompts.withdrawMinError),
                withdrawMaxError: getVal('prompts.withdrawMaxError', DEFAULT_CONFIG.prompts.withdrawMaxError),
                withdrawBalanceError: getVal('prompts.withdrawBalanceError', DEFAULT_CONFIG.prompts.withdrawBalanceError),
                selectWithdrawBank: getVal('prompts.selectWithdrawBank', DEFAULT_CONFIG.prompts.selectWithdrawBank),
                enterPhone: getVal('prompts.enterPhone', DEFAULT_CONFIG.prompts.enterPhone),
                enterAccount: getVal('prompts.enterAccount', DEFAULT_CONFIG.prompts.enterAccount),
                withdrawPending: getVal('prompts.withdrawPending', DEFAULT_CONFIG.prompts.withdrawPending),
                withdrawApproved: getVal('prompts.withdrawApproved', DEFAULT_CONFIG.prompts.withdrawApproved),
                withdrawDeclined: getVal('prompts.withdrawDeclined', DEFAULT_CONFIG.prompts.withdrawDeclined),

                paymentIssue: getVal('prompts.paymentIssue', getVal('prompts.depositInstructionFooter', DEFAULT_CONFIG.prompts.depositInstructionFooter)),
                depositInstructionFooter: getVal('prompts.depositInstructionFooter', DEFAULT_CONFIG.prompts.depositInstructionFooter)
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
            dailyRewards: getJson('daily_rewards_structure', DEFAULT_CONFIG.dailyRewards),
            // CMS Configs - Keys must match what Admin Dashboard saves (camelCase)
            botMenuButtons: getJson('botMenuButtons', getJson('bot_menu_buttons', [])),
            botCommands: getJson('botCommands', getJson('bot_commands', {})),
            botSettings: getJson('botSettings', getJson('bot_settings', {
                welcome_message: DEFAULT_CONFIG.prompts.depositAmount,
                menu_button_text: '🎮',
                open_now_text: '🎮 Play Now'
            })),
            botFinancials: getJson('botFinancials', getJson('bot_financials', {})),
            botPaymentMethods: getJson('botPaymentMethods', getJson('bot_payment_methods', {})),
            botFlows: getJson('botFlows', getJson('bot_flows', DEFAULT_CONFIG.botFlows))
        };

        console.log('[DEBUG_CONFIG] Initial Methods (Defaults):', JSON.stringify(finalConfig.methods));
        console.log('[DEBUG_CONFIG] DB botPaymentMethods (Raw):', finalConfig.botPaymentMethods);

        // Overlay dynamic values on top of structure
        // Payment Methods (Banks)
        if (finalConfig.botPaymentMethods && Array.isArray(finalConfig.botPaymentMethods) && finalConfig.botPaymentMethods.length > 0) {
            // Merge logic: Start with defaults to keep instructions, then overlay admin settings
            // If botPaymentMethods is array (from Admin UI), we map it onto the methods object
            finalConfig.botPaymentMethods.forEach((m: any) => {
                const existing = finalConfig.methods[m.key];
                if (existing) {
                    console.log(`[DEBUG_CONFIG] Updating ${m.key}: enable=${m.enabled}`);
                    // Update enabled status and label (name)
                    finalConfig.methods[m.key] = {
                        ...existing,
                        name: m.label || existing.name,
                        enabled: m.enabled
                    };
                } else if (m.enabled) {
                    console.log(`[DEBUG_CONFIG] Adding NEW ${m.key}: enable=${m.enabled}`);
                    // If it's a new method not in defaults (unlikely given hardcoded nature, but distinct)
                    // We can add it, but it won't have instructions unless provided or default fallback used
                    finalConfig.methods[m.key] = {
                        name: m.label || m.key,
                        enabled: m.enabled,
                        instructions: { en: '', am: '' } // Fallback to avoid crashes
                    };
                }
            });
            console.log('[DEBUG_CONFIG] Final Methods after Merge:', JSON.stringify(finalConfig.methods));

            // Also ensure we don't accidentally enable methods NOT in the admin list if the admin list is meant to be exhaustive?
            // The Admin UI "Manage Payment Methods" maps the keys `telebirr`, `cbe`, etc.
            // If the user disabled one in UI, it comes as `enabled: false`. 
            // So the merge above handles it.
        } else if (finalConfig.botPaymentMethods && !Array.isArray(finalConfig.botPaymentMethods) && Object.keys(finalConfig.botPaymentMethods).length > 0) {
            // Legacy fallback if it was object
            finalConfig.methods = finalConfig.botPaymentMethods;
        }

        // Load custom instructions for each bank from database
        // Format: methods.telebirr.instructions.am, methods.cbe.instructions.am, etc.
        Object.keys(finalConfig.methods).forEach(bankKey => {
            const customInstructions = getVal(`methods.${bankKey}.instructions.am`, null);
            if (customInstructions) {
                console.log(`[DEBUG_CONFIG] Loading custom instructions for ${bankKey}`);
                finalConfig.methods[bankKey].instructions = {
                    ...finalConfig.methods[bankKey].instructions,
                    am: customInstructions
                };
            }
        });

        // Financial Limits & Referral
        if (finalConfig.botFinancials) {
            if (finalConfig.botFinancials.minDeposit) finalConfig.limits.minDeposit = Number(finalConfig.botFinancials.minDeposit);
            if (finalConfig.botFinancials.minWithdrawal) finalConfig.limits.minWithdrawal = Number(finalConfig.botFinancials.minWithdrawal);
            if (finalConfig.botFinancials.maxWithdrawal) finalConfig.limits.maxWithdrawal = Number(finalConfig.botFinancials.maxWithdrawal);
            if (finalConfig.botFinancials.withdrawalFee) finalConfig.limits.withdrawalFee = Number(finalConfig.botFinancials.withdrawalFee);

            if (finalConfig.botFinancials.referrerReward) finalConfig.referral.referrerReward = Number(finalConfig.botFinancials.referrerReward);
            if (finalConfig.botFinancials.referredReward) finalConfig.referral.referredReward = Number(finalConfig.botFinancials.referredReward);
        }

        return finalConfig;
    }
}
