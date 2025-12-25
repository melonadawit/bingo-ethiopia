import { Env } from '../types';
import { getSupabase } from '../utils';

import { BotConfig, PAYMENT_CONFIG } from './config';

// Default fallback config (hardcoded values as safety net)
const DEFAULT_CONFIG: BotConfig = {
    methods: {}, // Should be populated from DB or empty
    prompts: {
        depositAmount: '💰 ማስገባት የሚፈልጉትን መጠን ከ10 ብር ጀምሮ ያስገቡ።',
        selectDepositBank: 'እባክዎት ማስገባት የሚፈልጉበትን ባንክ ይምረጡ።',
        depositPending: '✅ Your deposit Request have been sent to admins please wait 1 min.',
        depositApproved: '✅ Your deposit of {amount} ETB is confirmed.\n🧾 Ref: {ref}',
        depositDeclined: '❌ Your deposit of {amount} ETB is Declined.',
        withdrawAmount: '💰 ማውጣት የሚፈልጉትን የገንዘብ መጠን ያስገቡ ?',
        withdrawMinError: 'ዝቅተኛው ማውጣት የምትችሉት መጠን {min} ብር ነው።',
        withdrawMaxError: 'ከፍተኛው ማውጣት የምትችሉት መጠን {max}ብር ነው።',
        withdrawBalanceError: '❌ በቂ ባላንስ የለዎትም!\n\n💳 የእርስዎ ባላንስ: {balance} ብር\n💰 የጠየቁት መጠን: {amount} ብር',
        selectWithdrawBank: 'እባክዎን የሚያወጡበትን ባንክ ይምረጡ',
        enterPhone: 'እባክዎን ስልክ ቁጥርን ያስገቡ',
        enterAccount: 'እባክዎን አካውንት ቁጥርን ያስገቡ',
        withdrawPending: '✅ Your withdrawal Request have been sent to admins please wait 1 min.',
        withdrawApproved: '✅ Your withdrawal of {amount} ETB is confirmed.\n🧾 Ref: {ref}',
        withdrawDeclined: '❌ Withdrawal Declined\n\nYour withdrawal of {amount} Birr was declined and refunded.\n\n💳 Current Balance: {balance} Birr',
        paymentIssue: 'የሚያጋጥማቹ የክፍያ ችግር:\n@onlineetbingosupport\n'
    },
    instructions: 'Loading instructions...',
    support: 'Contact Support...',
    limits: {
        minDeposit: 10,
        minWithdrawal: 100,
        maxWithdrawal: 20000,
        withdrawalFee: 5
    },
    adminIds: [336997351],
    referral: {
        referrerReward: 10,
        referredReward: 10,
    },
    dailyRewards: {
        1: 10, 2: 15, 3: 20, 4: 25, 5: 30, 6: 35, 7: 50
    },
    botFlows: {
        onboarding: {
            welcome: '👋 Welcome to Bingo Ethiopia!\n\nPlease register first by clicking the button below:',
            registration_success: '✅ Registration successful! You can now deposit and play.'
        },
        financials: {},
        deposit: {
            prompt_amount: '💰 ማስገባት የሚፈልጉትን መጠን ከ10 ብር ጀምሮ ያስገቡ።',
            prompt_bank: 'እባክዎት ማስገባት የሚፈልጉበትን ባንክ ይምረጡ።',
            pending_message: '✅ Your deposit Request have been sent to admins please wait 1 min.',
            success_message: '✅ Your deposit of {amount} ETB is confirmed.\n🧾 Ref: {ref}',
            declined_message: '❌ Your deposit of {amount} ETB is Declined.',
            invalid_amount: '❌ Invalid Amount. Minimum deposit is {min} ETB.'
        },
        withdrawal: {
            prompt_amount: '💰 ማውጣት የሚፈልጉትን የገንዘብ መጠን ያስገቡ ?',
            prompt_bank: 'እባክዎን የሚያወጡበትን ባንክ ይምረጡ',
            prompt_phone: 'እባክዎን ስልክ ቁጥርን ያስገቡ',
            prompt_account: 'እባክዎን አካውንት ቁጥርን ያስገቡ',
            pending_message: '✅ Your withdrawal Request have been sent to admins please wait 1 min.',
            success_message: '✅ Your withdrawal of {amount} ETB is confirmed.\n🧾 Ref: {ref}',
            declined_message: '❌ Withdrawal Declined\n\nYour withdrawal of {amount} Birr was declined and refunded.\n\n💳 Current Balance: {balance} Birr\n\nPlease contact support if you believe this was an error.',
            min_error: 'ዝቅተኛው ማውጣት የምትችሉት መጠን {min} ብር ነው።',
            max_error: 'ከፍተኛው ማውጣት የምትችሉት መጠን {max}ብር ነው።',
            balance_error: '❌ በቂ ባላንስ የለዎትም!\n\n💳 የእርስዎ ባላንስ: {balance} ብር\n💰 የጠየቁት መጠን: {amount} ብር'
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
            contact_message: '📞 Contact Support\n\n📱 Phone: +251-931-50-35-59\n📧 Email: support@onlinebingo.et\n💬 Telegram: @online_bingo_support\n\n⏰ Support Hours:\n   Monday - Sunday: 9 AM - 9 PM\n\nWe\'re here to help!',
            instructions: '📘 የቢንጎ ጨዋታ ህጎች\n\n🃏 መጫወቻ ካርድ\n\n1. ጨዋታውን ለመጀመር ከሚመጣልን ከ1-300 የመጫወቻ ካርድ ውስጥ አንዱን እንመርጣለን።\n\n2. የመጫወቻ ካርዱ ላይ በቀይ ቀለም የተመረጡ ቁጥሮች የሚያሳዩት መጫወቻ ካርድ በሌላ ተጫዋች መመረጡን ነው።\n\n3. የመጫወቻ ካርድ ስንነካው ከታች በኩል ካርድ ቁጥሩ የሚይዘዉን መጫወቻ ካርድ ያሳየናል።\n\n4. ወደ ጨዋታው ለመግባት የምንፈልገዉን ካርድ ከመረጥን ለምዝገባ የተሰጠው ሰኮንድ ዜሮ ሲሆን ቀጥታ ወደ ጨዋታ ያስገባናል።\n\n🎮 ጨዋታ\n\n1. ወደ ጨዋታው ስንገባ በመረጥነው የካርድ ቁጥር መሰረት የመጫወቻ ካርድ እናገኛለን።\n\n2. ጨዋታው ሲጀምር የተለያዪ ቁጥሮች ከ1 እስከ 75 መጥራት ይጀምራል።\n\n3. የሚጠራው ቁጥር የኛ መጫወቻ ካርድ ውስጥ ካለ የተጠራውን ቁጥር ክሊክ በማረግ መምረጥ እንችላለን።\n\n4. የመረጥነውን ቁጥር ማጥፋት ከፈለግን መልሰን እራሱን ቁጥር ክሊክ በማረግ ማጥፋት እንችላለን።\n\n🏆 አሸናፊ\n\n1. ቁጥሮቹ ሲጠሩ ከመጫወቻ ካርዳችን ላይ እየመረጥን ወደጎን ወይም ወደታች ወይም ወደሁለቱም አግዳሚ ወይም አራቱን ማእዘናት ከመረጥን ወዲያውኑ ከታች በኩል bingo የሚለውን በመንካት ማሸነፍ እንችላለን።\n\n2. ወደጎን ወይም ወደታች ወይም ወደሁለቱም አግዳሚ ወይም አራቱን ማእዘናት ሳይጠሩ bingo የሚለውን ክሊክ ካደረግን ከጨዋታው እንታገዳለን።\n\n3. ሁለት ወይም ከዚያ በላይ ተጫዋቾች እኩል ቢያሸንፉ ደራሹ ለቁጥራቸው ይካፈላል።'
        }
    },
    gameRules: {
        commissionPct: 15 // Default 15% fee
    },
    flowSequences: {
        deposit: ['amount', 'bank'],
        withdrawal: ['amount', 'bank', 'account']
    }
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
                depositAmount: getVal('msg_deposit_prompt', DEFAULT_CONFIG.prompts.depositAmount),
                selectDepositBank: DEFAULT_CONFIG.prompts.selectDepositBank, // Not yet in DB?
                depositPending: getVal('msg_deposit_pending', DEFAULT_CONFIG.prompts.depositPending),
                depositApproved: DEFAULT_CONFIG.prompts.depositApproved,
                depositDeclined: DEFAULT_CONFIG.prompts.depositDeclined,
                withdrawAmount: getVal('msg_withdraw_prompt', DEFAULT_CONFIG.prompts.withdrawAmount),
                withdrawMinError: DEFAULT_CONFIG.prompts.withdrawMinError,
                withdrawMaxError: DEFAULT_CONFIG.prompts.withdrawMaxError,
                withdrawBalanceError: DEFAULT_CONFIG.prompts.withdrawBalanceError,
                selectWithdrawBank: DEFAULT_CONFIG.prompts.selectWithdrawBank,
                enterPhone: DEFAULT_CONFIG.prompts.enterPhone,
                enterAccount: DEFAULT_CONFIG.prompts.enterAccount,
                withdrawPending: DEFAULT_CONFIG.prompts.withdrawPending,
                withdrawApproved: DEFAULT_CONFIG.prompts.withdrawApproved,
                withdrawDeclined: DEFAULT_CONFIG.prompts.withdrawDeclined,
                paymentIssue: DEFAULT_CONFIG.prompts.paymentIssue
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
            // CMS Configs
            botMenuButtons: getJson('bot_menu_buttons', []),
            botCommands: getJson('bot_commands', {}),
            botSettings: getJson('bot_settings', {
                welcome_message: DEFAULT_CONFIG.prompts.depositAmount,
                menu_button_text: '🎮',
                open_now_text: '🎮 Play Now'
            }),
            botFinancials: getJson('bot_financials', {}),
            botPaymentMethods: getJson('bot_payment_methods', {}),
            botFlows: getJson('bot_flows', DEFAULT_CONFIG.botFlows)
        };

        // Overlay dynamic values on top of structure
        // Payment Methods (Banks)
        if (finalConfig.botPaymentMethods && Object.keys(finalConfig.botPaymentMethods).length > 0) {
            finalConfig.methods = finalConfig.botPaymentMethods;
        }

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
