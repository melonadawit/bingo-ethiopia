// Payment configuration with exact Amharic content


export interface BotFlows {
    onboarding: {
        welcome: string;
        welcome_back?: string;
        registration_success: string;
    };
    financials: {
        // Kept for backward compatibility if needed, but preferably move to specific sections
    };
    deposit: {
        prompt_amount: string;
        prompt_bank: string;
        pending_message: string;
        success_message: string; // For admin approval
        declined_message: string;
        invalid_amount: string;
    };
    withdrawal: {
        prompt_amount: string;
        prompt_bank: string;
        prompt_phone: string; // For telebirr
        prompt_account: string; // For banks
        pending_message: string;
        success_message: string;
        declined_message: string;
        min_error: string;
        max_error: string;
        balance_error: string;
    };
    errors: {
        unknown_command: string;
        invalid_input: string;
        process_error: string;
    };
    referral: {
        share_message: string;
        referrer_bonus: string;
        referred_bonus: string;
    };
    support: {
        contact_message: string;
        instructions: string;
    };
}


export interface BotConfig {
    methods: Record<string, any>;
    prompts: Record<string, string>;
    instructions: string;
    support: string;
    limits: {
        minDeposit: number;
        minWithdrawal: number;
        maxWithdrawal: number;
        withdrawalFee: number;
    };
    adminIds: number[];
    // Dynamic Payment Methods
    botPaymentMethods?: {
        key: string;
        label: string;
        enabled: boolean;
    }[];
    referral: {
        referrerReward: number;
        referredReward: number;
    };
    dailyRewards: Record<string, number>;
    // CMS Configs
    botMenuButtons?: any[][];
    botCommands?: Record<string, string>;
    botSettings?: {
        welcome_message?: string;
        menu_button_text?: string;
        open_now_text?: string;
    };
    botFinancials?: any;
    botFlows?: BotFlows;

    // Phase 34: Dynamic Features
    gameRules?: {
        commissionPct: number; // Percentage fee (e.g. 15 for 15%)
    };
    flowSequences?: {
        // Defines the step order e.g. ['amount', 'bank']
        deposit: string[];
        withdrawal: string[];
    };
}

export const PAYMENT_CONFIG_Values = {

    // Payment methods
    methods: {
        telebirr: {
            name: 'Telebirr',
            account: '0931503559',
            accountName: 'Tadese',
            instructions: {
                en: 'Transfer to Telebirr account',
                am: '1. ከታች ባለው የቴሌብር አካውንት {amount} ብር ያስገቡ\n     Phone: 0931503559\n     Name: Tadese\n\n'
            },
            enabled: true
        },
        cbe: {
            name: 'CBE',
            account: '1000123456789',
            accountName: 'Tadese',
            instructions: {
                en: 'Transfer to CBE account',
                am: '1. ከታች ባለው የCBE አካውንት {amount} ብር ያስገቡ\n     Account: 1000123456789\n     Name: Tadese\n\n'
            },
            enabled: true
        },
        abyssinia: {
            name: 'Abyssinia',
            account: '123456789',
            accountName: 'Tadese',
            instructions: {
                en: 'Transfer to Abyssinia Bank account',
                am: '1. ከታች ባለው የAbyssinia Bank አካውንት {amount} ብር ያስገቡ\n     Account: 123456789\n     Name: Tadese\n\n'
            },
            enabled: true
        },
        awash: {
            name: 'Awash',
            account: '123456789',
            accountName: 'Tadese',
            instructions: {
                en: 'Transfer to Awash Bank account',
                am: '1. ከታች ባለው የAwash Bank አካውንት {amount} ብር ያስገቡ\n     Account: 123456789\n     Name: Tadese\n\n'
            },
            enabled: true
        }
    },

    // Prompts in Amharic
    // Prompts in Amharic
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
        withdrawDeclined: '❌ Withdrawal Declined\n\nYour withdrawal of {amount} Birr was declined and refunded.\n\n💳 Current Balance: {balance} Birr\n\nPlease contact support if you believe this was an error.',

        depositInstructionFooter: 'የሚያጋጥማቹ የክፍያ ችግር:\n@onlineetbingosupport\n@onlineetbingosupport1 ላይ ፃፉልን።\n\n2. የከፈሉበትን አጭር የጹሁፍ መልዕክት(message) copy በማድረግ እዚ ላይ Past አድረገው ያስገቡና ይላኩት👇👇👇'
    },

    // Instructions content
    instructions: `📘 የቢንጎ ጨዋታ ህጎች

🃏 መጫወቻ ካርድ

1. ጨዋታውን ለመጀመር ከሚመጣልን ከ1-300 የመጫወቻ ካርድ ውስጥ አንዱን እንመርጣለን።

2. የመጫወቻ ካርዱ ላይ በቀይ ቀለም የተመረጡ ቁጥሮች የሚያሳዩት መጫወቻ ካርድ በሌላ ተጫዋች መመረጡን ነው።

3. የመጫወቻ ካርድ ስንነካው ከታች በኩል ካርድ ቁጥሩ የሚይዘዉን መጫወቻ ካርድ ያሳየናል።

4. ወደ ጨዋታው ለመግባት የምንፈልገዉን ካርድ ከመረጥን ለምዝገባ የተሰጠው ሰኮንድ ዜሮ ሲሆን ቀጥታ ወደ ጨዋታ ያስገባናል።

🎮 ጨዋታ

1. ወደ ጨዋታው ስንገባ በመረጥነው የካርድ ቁጥር መሰረት የመጫወቻ ካርድ እናገኛለን።

2. ጨዋታው ሲጀምር የተለያዪ ቁጥሮች ከ1 እስከ 75 መጥራት ይጀምራል።

3. የሚጠራው ቁጥር የኛ መጫወቻ ካርድ ውስጥ ካለ የተጠራውን ቁጥር ክሊክ በማረግ መምረጥ እንችላለን።

4. የመረጥነውን ቁጥር ማጥፋት ከፈለግን መልሰን እራሱን ቁጥር ክሊክ በማረግ ማጥፋት እንችላለን።

🏆 አሸናፊ

1. ቁጥሮቹ ሲጠሩ ከመጫወቻ ካርዳችን ላይ እየመረጥን ወደጎን ወይም ወደታች ወይም ወደሁለቱም አግዳሚ ወይም አራቱን ማእዘናት ከመረጥን ወዲያውኑ ከታች በኩል bingo የሚለውን በመንካት ማሸነፍ እንችላለን።

2. ወደጎን ወይም ወደታች ወይም ወደሁለቱም አግዳሚ ወይም አራቱን ማእዘናት ሳይጠሩ bingo የሚለውን ክሊክ ካደረግን ከጨዋታው እንታገዳለን።

3. ሁለት ወይም ከዚያ በላይ ተጫዋቾች እኩል ቢያሸንፉ ደራሹ ለቁጥራቸው ይካፈላል።`,

    // Support contact
    support: `📞 Contact Support

📱 Phone: +251-931-50-35-59
📧 Email: support@onlineetbingo.et
💬 Telegram: @onlineet_bingo_support

⏰ Support Hours:
   Monday - Sunday: 9 AM - 9 PM

We're here to help!`,

    // Payment limits
    limits: {
        minDeposit: 10,
        minWithdrawal: 100,
        maxWithdrawal: 20000,
        withdrawalFee: 5
    },

    // Admin ID
    adminId: 336997351,

    // Referral system
    referral: {
        referrerReward: 10,  // Birr for person who referred
        referredReward: 10,  // Birr for new user (welcome bonus)
    },

    // Daily bonus rewards by streak day
    dailyRewards: {
        1: 10,
        2: 15,
        3: 20,
        4: 25,
        5: 30,
        6: 35,
        7: 50,  // Week bonus
    }
};

// Export alias at the end to ensure initialization
export const PAYMENT_CONFIG = PAYMENT_CONFIG_Values;

// Helper function to get payment method details
export function getPaymentMethod(method: string) {
    return PAYMENT_CONFIG.methods[method as keyof typeof PAYMENT_CONFIG.methods];
}

// Helper function to format payment instructions with amount
export function formatInstructions(method: string, amount: number, lang: 'en' | 'am' = 'en'): string {
    const paymentMethod = getPaymentMethod(method);
    if (!paymentMethod) return '';

    const instruction = paymentMethod.instructions[lang].replace('{amount}', amount.toString());
    return instruction;
}
