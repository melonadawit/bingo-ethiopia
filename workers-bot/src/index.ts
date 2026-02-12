import type { Env } from './types';
import { getSupabase, jsonResponse } from './utils';
import { sendMessage, getMainKeyboard, generateRefCode } from './bot-utils';
import { GAME_INSTRUCTIONS } from './instructions';

// Simple user state tracking
const userStates = new Map<number, {
    action: string;
    data?: any;
}>();


// Bot configuration (will be loaded from Supabase)
interface BotConfig {
    adminIds: number[];
    limits: {
        minDeposit: number;
        minWithdrawal: number;
        maxWithdrawal: number;
    };
    paymentMethods: {
        [key: string]: {
            name: string;
            account: string;
            accountName: string;
        };
    };
    prompts: {
        welcome: string;
        deposit: {
            start: string;
            method: string;
            instructions: string;
            confirm: string;
            success: string;
            declined: string;
        };
        withdrawal: {
            start: string;
            minErr: string;
            maxErr: string;
            balErr: string;
            bank: string;
            phone: string;
            account: string;
            confirm: string;
            success: string;
            declined: string;
        };
        referral: {
            invite: string;
        };
        game: {
            waiting: string;
            start: string;
            win: string;
        };
    };
    _rawConfig?: Record<string, string>;
}

// Default config
const DEFAULT_CONFIG: BotConfig = {
    adminIds: [1328849351], // Replace with actual admin Telegram IDs
    limits: {
        minDeposit: 10,
        minWithdrawal: 50,
        maxWithdrawal: 10000,
    },
    paymentMethods: {
        telebirr: {
            name: 'Telebirr',
            account: '0931503559',
            accountName: 'Tadese',
        },
        cbe: {
            name: 'CBE',
            account: '1000123456789',
            accountName: 'Bingo Ethiopia',
        },
        boa: {
            name: 'BOA',
            account: '2000987654321',
            accountName: 'Bingo Ethiopia',
        },
    },
    prompts: {
        welcome: '👋 እንኳን ወደ ቢንጎ ኢትዮጵያ በደህና መጡ!\\n\\nእባክዎ መጀመሪያ ይመዝገቡ።',
        deposit: {
            start: '💰 ማስገባት የሚፈልጉትን መጠን ከ10 ብር ጀምሮ ያስገቡ።',
            method: 'እባክዎት ማስገባት የሚፈልጉበትን ባንክ ይምረጡ።',
            instructions: 'የሚያጋጥማቹ የክፍያ ችግር:\\n@onlineetbingosupport\\n@onlineetbingosupport1 ላይ ፃፉልን።\\n\\n1. ከታች ባለው የ{bank} አካውንት {amount} ብር ያስገቡ\\n     Phone: {account}\\n     Name: {name}\\n\\n2. የከፈሉበትን አጭር የጹሁፍ መልዕክት(message) copy በማድረግ እዚ ላይ Past አድረገው ያስገቡና ይላኩት👇👇👇',
            confirm: '✅ Your deposit Request have been sent to admins please wait 1 min.',
            success: '✅ Your deposit of {amount} ETB is confirmed.\\n🧾 Ref: {ref}',
            declined: '❌ Your deposit of {amount} ETB is Declined.',
        },
        withdrawal: {
            start: '💰 ማውጣት የሚፈልጉትን የገንዘብ መጠን ያስገቡ ?',
            minErr: 'ዝቅተኛው ማውጣት የምትችሉት መጠን {min} ብር ነው።',
            maxErr: 'ከፍተኛው ማውጣት የምትችሉት መጠን {max} ብር ነው።',
            balErr: '❌ በቂ ባላንስ የለዎትም!\\n\\n💳 የእርስዎ ባላንስ: {balance} ብር\\n💰 የጠየቁት መጠን: {amount} ብር',
            bank: 'እባክዎን የሚያወጡበትን ባንክ ይምረጡ',
            phone: 'እባክዎን ስልክ ቁጥርን ያስገቡ',
            account: 'እባክዎን አካውንት ቁጥርን ያስገቡ',
            confirm: '✅ Your withdrawal Request have been sent to admins please wait 1 min.',
            success: '✅ Your withdrawal of {amount} ETB is confirmed.\\n🧾 Ref: {ref}',
            declined: '❌ Withdrawal Declined\\n\\nYour withdrawal of {amount} Birr was declined and refunded.\\n\\n💳 Current Balance: {balance} Birr\\n\\nPlease contact support if you believe this was an error.',
        },
        referral: {
            invite: '🎉 Use my referral link to join Bingo Ethiopia!',
        },
        game: {
            waiting: '⏳ Waiting for players to join...',
            start: '🎮 Game Started! Good luck!',
            win: '🏆 BINGO! {winner} won the game!',
        }
    }
};


// Load config from Supabase
async function loadConfig(env: Env): Promise<BotConfig> {
    console.log('Loading bot config from Supabase...');
    const supabase = getSupabase(env);

    try {
        const { data, error } = await supabase
            .from('bot_configs')
            .select('key, value');

        if (error || !data) {
            console.error('Failed to load bot config:', error);
            return DEFAULT_CONFIG;
        }

        console.log(`Successfully loaded ${data.length} config keys`);

        const configMap = data.reduce((acc: any, curr: any) => {
            // Fix unescaped newlines coming from DB/Dashboard
            let value = curr.value;
            if (typeof value === 'string') {
                value = value.replace(/\\n/g, '\n');
            }
            acc[curr.key] = value;
            return acc;
        }, {});

        // Parse JSON fields
        let paymentMethods = DEFAULT_CONFIG.paymentMethods;
        if (configMap.payment_methods) {
            try {
                paymentMethods = JSON.parse(configMap.payment_methods);
            } catch (e) {
                console.error('Failed to parse payment_methods:', e);
            }
        }

        let adminIds = DEFAULT_CONFIG.adminIds;
        if (configMap.admin_ids) {
            try {
                adminIds = JSON.parse(configMap.admin_ids);
            } catch (e) {
                console.error('Failed to parse admin_ids:', e);
            }
        }

        return {
            adminIds,
            limits: {
                minDeposit: parseFloat(configMap.limit_min_deposit) || DEFAULT_CONFIG.limits.minDeposit,
                minWithdrawal: parseFloat(configMap.limit_min_withdrawal) || DEFAULT_CONFIG.limits.minWithdrawal,
                maxWithdrawal: parseFloat(configMap.limit_max_withdrawal) || DEFAULT_CONFIG.limits.maxWithdrawal,
            },
            paymentMethods,
            // Add prompts to config object to be used in handlers
            prompts: {
                welcome: configMap.welcome_message || DEFAULT_CONFIG.prompts.welcome,
                deposit: {
                    start: configMap.msg_dep_start || DEFAULT_CONFIG.prompts.deposit.start,
                    method: configMap.msg_dep_method || DEFAULT_CONFIG.prompts.deposit.method,
                    instructions: configMap.msg_dep_instructions || DEFAULT_CONFIG.prompts.deposit.instructions,
                    confirm: configMap.msg_dep_confirm || DEFAULT_CONFIG.prompts.deposit.confirm,
                    success: configMap.msg_dep_success || DEFAULT_CONFIG.prompts.deposit.success,
                    declined: configMap.msg_dep_declined || DEFAULT_CONFIG.prompts.deposit.declined,
                },
                withdrawal: {
                    start: configMap.msg_wd_start || DEFAULT_CONFIG.prompts.withdrawal.start,
                    minErr: configMap.msg_wd_min_err || DEFAULT_CONFIG.prompts.withdrawal.minErr,
                    maxErr: configMap.msg_wd_max_err || DEFAULT_CONFIG.prompts.withdrawal.maxErr,
                    balErr: configMap.msg_wd_bal_err || DEFAULT_CONFIG.prompts.withdrawal.balErr,
                    bank: configMap.msg_wd_bank || DEFAULT_CONFIG.prompts.withdrawal.bank,
                    phone: configMap.msg_wd_phone || DEFAULT_CONFIG.prompts.withdrawal.phone,
                    account: configMap.msg_wd_account || DEFAULT_CONFIG.prompts.withdrawal.account,
                    confirm: configMap.msg_wd_confirm || DEFAULT_CONFIG.prompts.withdrawal.confirm,
                    success: configMap.msg_wd_success || DEFAULT_CONFIG.prompts.withdrawal.success,
                    declined: configMap.msg_wd_declined || DEFAULT_CONFIG.prompts.withdrawal.declined,
                },
                referral: {
                    invite: configMap.referral_message || DEFAULT_CONFIG.prompts.referral.invite,
                },
                game: {
                    waiting: configMap.msg_game_waiting || DEFAULT_CONFIG.prompts.game.waiting,
                    start: configMap.msg_game_start || DEFAULT_CONFIG.prompts.game.start,
                    win: configMap.msg_game_win || DEFAULT_CONFIG.prompts.game.win,
                }
            },
            _rawConfig: configMap
        };
    } catch (e) {
        console.error('Error in loadConfig:', e);
        return DEFAULT_CONFIG;
    }
}

export async function handleBotWebhook(request: Request, env: Env): Promise<Response> {
    console.log(`Incoming request: ${request.method} ${request.url}`);
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const update = await request.json() as any;
    const supabase = getSupabase(env);
    const config = await loadConfig(env);

    console.log('Loaded Prompts:', JSON.stringify(config.prompts, null, 2));
    console.log('Bot update:', JSON.stringify(update, null, 2));

    try {
        // Handle messages
        if (update.message) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            const userId = update.message.from.id;
            const username = update.message.from.username || update.message.from.first_name;

            // Handle contact sharing (registration)
            if (update.message.contact) {
                await handleRegistration(update.message, env, supabase);
                return jsonResponse({ ok: true });
            }

            if (text) {
                console.log(`Handling message: "${text}" for chat ${chatId}`);
                await handleMessage(chatId, userId, text, username, env, supabase, config);
                console.log(`Done handling message: "${text}"`);
            }
        }

        // Handle callback queries (button clicks)
        if (update.callback_query) {
            await handleCallback(update.callback_query, env, supabase, config);
        }
    } catch (error) {
        console.error('CRITICAL Bot error:', error);
        // Log the stack trace
        if (error instanceof Error) {
            console.error(error.stack);
        }
        // Notify admins
        try {
            for (const adminId of config.adminIds) {
                await sendMessage(
                    adminId,
                    `⚠️ Bot Error:\n\n<pre>${JSON.stringify(error, Object.getOwnPropertyNames(error))}</pre>`,
                    env
                );
            }
        } catch (adminError) {
            console.error('Failed to notify admins of bot error:', adminError);
        }
    }

    return jsonResponse({ ok: true });
}

async function handleMessage(
    chatId: number,
    userId: number,
    text: string,
    username: string,
    env: Env,
    supabase: any,
    config: BotConfig
) {
    // Check if user is registered
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', userId)
        .maybeSingle();

    // If not registered, show registration
    if (!user || !user.is_registered) {
        if (text.startsWith('/start')) {
            await handleStart(chatId, userId, username, env, supabase, config);
        } else {
            await sendMessage(
                chatId,
                config.prompts.welcome || '👋 እንኳን ወደ ቢንጎ ኢትዮጵያ በደህና መጡ!\\n\\nእባክዎ መጀመሪያ ይመዝገቡ።',
                env,
                {
                    keyboard: [[{ text: '📝 Register', request_contact: true }]],
                    resize_keyboard: true,
                    one_time_keyboard: true,
                }
            );
        }
        return;
    }

    // Check if user is in a flow
    const state = userStates.get(userId);
    if (state) {
        await handleUserInput(chatId, userId, text, state, user, env, supabase, config);
        return;
    }

    // Handle commands
    switch (text) {
        case '/start':
            await handleStart(chatId, userId, username, env, supabase, config);
            break;

        case '/balance':
        case '💰 Balance':
            await sendMessage(
                chatId,
                `💳 <b>የእርስዎ ባላንስ</b>\\n\\n💰 ${user.balance || 0} ብር`,
                env
            );
            break;

        case '/deposit':
        case '💳 Deposit':
            userStates.set(userId, { action: 'deposit_amount' });
            await sendMessage(chatId, config.prompts.deposit.start, env);
            break;

        case '/withdraw':
        case '💸 Withdraw':
            userStates.set(userId, { action: 'withdraw_amount' });
            await sendMessage(chatId, config.prompts.withdrawal.start, env);
            break;

        case '/referral':
        case '🎁 Referral':
            await sendMessage(
                chatId,
                config.prompts.referral?.invite || '🎉 Use my referral link to join Bingo Ethiopia!',
                env
            );
            if (user?.referral_code) {
                await sendMessage(chatId, `Your Referral Code: <code>${user.referral_code}</code>\nLink: https://t.me/bingo_ethiopia_bot?start=${user.referral_code}`, env);
            }
            break;

        case '🎁 Daily Bonus':
            await sendMessage(chatId, '🎁 Daily bonus coming soon!', env);
            break;

        case '/instruction':
        case '📘 Instructions':
            await sendMessage(chatId, GAME_INSTRUCTIONS, env);
            break;

        case '/support':
        case '📞 Support':
            await sendMessage(
                chatId,
                '📞 <b>የድጋፍ አገልግሎት</b>\\n\\n' +
                'የሚያጋጥማቹ ችግር:\\n' +
                '@onlineetbingosupport\\n' +
                '@onlineetbingosupport1 ላይ ፃፉልን።',
                env
            );
            break;

        default:
            await sendMessage(chatId, '❓ Unknown command. Use /start for help.', env);
    }
}


async function handleRegistration(message: any, env: Env, supabase: any) {
    const contact = message.contact;
    const chatId = message.chat.id;
    const userId = contact.user_id; // This is a number

    // Log registration attempt
    console.log(`Registering user: ${userId}, Phone: ${contact.phone_number}`);

    // Check if already registered
    const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', userId)
        .maybeSingle();

    if (fetchError) {
        console.error('Error fetching user for registration:', fetchError);
    }

    if (existingUser && existingUser.is_registered) {
        await sendMessage(chatId, '✅ You are already registered!', env, getMainKeyboard(userId, await loadConfig(env)));
        return;
    }

    // Generate referral code
    const refCode = await generateUniqueReferralCode(supabase);

    // Register user
    const { error: upsertError } = await supabase
        .from('users')
        .upsert({
            telegram_id: userId,
            username: message.from.username || message.from.first_name,
            phone_number: contact.phone_number,
            is_registered: true,
            balance: existingUser ? existingUser.balance : 100, // Welcome bonus
            referral_code: refCode,
            created_at: existingUser?.created_at || new Date().toISOString(),
        });

    if (upsertError) {
        console.error('Registration Upsert Error:', upsertError);
        await sendMessage(chatId, '❌ Registration failed. Please try again later.', env);
        return;
    }

    // Load fresh config for the keyboard
    const config = await loadConfig(env);

    await sendMessage(
        chatId,
        `✅ <b>Registration Complete!</b>\\n\\n` +
        `Welcome bonus: ${existingUser ? '0' : '100'} Birr\\n` +
        `Your referral code: <code>${refCode}</code>\\n\\n` +
        `Use the menu below to get started!`,
        env,
        getMainKeyboard(userId, config)
    );
}

async function handleUserInput(
    chatId: number,
    userId: number,
    text: string,
    state: any,
    user: any,
    env: Env,
    supabase: any,
    config: BotConfig
) {
    // DEPOSIT FLOW
    if (state.action === 'deposit_amount') {
        const amount = parseFloat(text);

        if (isNaN(amount) || amount < config.limits.minDeposit) {
            await sendMessage(chatId, `❌ Invalid Amount. Min: ${config.limits.minDeposit}`, env);
            return;
        }

        userStates.set(userId, { action: 'deposit_bank', data: { amount } });
        await showBankSelection(chatId, config, env);
    }
    else if (state.action === 'deposit_receipt') {
        const receipt = text;
        const { amount, bank } = state.data;
        const refCode = generateRefCode('DEP');

        // Save to database
        const { data: payment, error } = await supabase
            .from('payment_requests')
            .insert({
                user_id: userId,
                type: 'deposit',
                amount,
                payment_method: bank,
                status: 'pending',
                reference_code: refCode,
                screenshot_url: receipt, // Text receipt stored here
                created_at: new Date().toISOString(),
            })
            .select('*')
            .single();

        if (error || !payment) {
            await sendMessage(chatId, '❌ Failed to create deposit request. Please try again.', env);
            userStates.delete(userId);
            return;
        }

        userStates.delete(userId);

        await sendMessage(
            chatId,
            config.prompts.deposit.confirm,
            env,
            getMainKeyboard(userId, config)
        );

        // Notify admins via Telegram
        const { data: userData } = await supabase
            .from('users')
            .select('username, phone_number')
            .eq('telegram_id', userId)
            .single();

        const bankName = config.paymentMethods[bank]?.name || bank;

        for (const adminId of config.adminIds) {
            await sendMessage(
                adminId,
                `💵 <b>New Deposit Request (Text Receipt)</b>\\n\\n` +
                `👤 User: ${userData?.username || 'Unknown'}\\n` +
                `📱 Phone: ${userData?.phone_number || 'N/A'}\\n` +
                `💰 Amount: ${amount} Birr\\n` +
                `🏦 Bank: ${bankName}\\n` +
                `🧾 Ref: ${refCode}\\n` +
                `📝 Receipt:\\n${receipt}\\n` +
                `🆔 Transaction ID: ${payment.id}`,
                env,
                {
                    inline_keyboard: [[
                        { text: '✅ Approve', callback_data: `approve:${payment.id}` },
                        { text: '❌ Decline', callback_data: `decline:${payment.id}` }
                    ]]
                }
            );
        }
    }
    // WITHDRAWAL FLOW
    else if (state.action === 'withdraw_amount') {
        const amount = parseFloat(text);

        if (isNaN(amount)) {
            await sendMessage(chatId, '❌ Invalid amount. Please enter a number.', env);
            return;
        }

        // Validate minimum
        if (amount < config.limits.minWithdrawal) {
            await sendMessage(
                chatId,
                config.prompts.withdrawal.minErr.replace('{min}', config.limits.minWithdrawal.toString()),
                env
            );
            userStates.delete(userId);
            return;
        }

        // Validate maximum
        if (amount > config.limits.maxWithdrawal) {
            await sendMessage(
                chatId,
                config.prompts.withdrawal.maxErr.replace('{max}', config.limits.maxWithdrawal.toString()),
                env
            );
            userStates.delete(userId);
            return;
        }

        // Validate balance
        if (amount > user.balance) {
            await sendMessage(
                chatId,
                config.prompts.withdrawal.balErr
                    .replace('{balance}', user.balance.toString())
                    .replace('{amount}', amount.toString()),
                env
            );
            userStates.delete(userId);
            return;
        }

        userStates.set(userId, { action: 'withdraw_bank', data: { amount } });
        await showBankSelection(chatId, config, env);
    }
    else if (state.action === 'withdraw_account') {
        const account = text.trim();
        const { amount, bank } = state.data;
        const refCode = generateRefCode('WTH');

        // Save to database
        const { data: payment, error } = await supabase
            .from('payment_requests')
            .insert({
                user_id: userId,
                type: 'withdraw',
                amount,
                payment_method: bank,
                bank_account_number: account,
                status: 'pending',
                reference_code: refCode,
                created_at: new Date().toISOString(),
            })
            .select('*')
            .single();

        if (error || !payment) {
            await sendMessage(chatId, '❌ Failed to create withdrawal request. Please try again.', env);
            userStates.delete(userId);
            return;
        }

        userStates.delete(userId);

        await sendMessage(
            chatId,
            config.prompts.withdrawal.confirm,
            env,
            getMainKeyboard(userId, config)
        );

        // Notify admins via Telegram
        const { data: userData } = await supabase
            .from('users')
            .select('username, phone_number')
            .eq('telegram_id', userId)
            .single();

        const bankName = config.paymentMethods[bank]?.name || bank;

        for (const adminId of config.adminIds) {
            await sendMessage(
                adminId,
                `💸 <b>New Withdrawal Request</b>\\n\\n` +
                `👤 User: ${userData?.username || 'Unknown'}\\n` +
                `📱 Phone: ${userData?.phone_number || 'N/A'}\\n` +
                `💰 Amount: ${amount} Birr\\n` +
                `🏦 Bank: ${bankName}\\n` +
                `💳 Account: ${account}\\n` +
                `🧾 Ref: ${refCode}\\n` +
                `🆔 Transaction ID: ${payment.id}`,
                env,
                {
                    inline_keyboard: [[
                        { text: '✅ Approve', callback_data: `approve:${payment.id}` },
                        { text: '❌ Decline', callback_data: `decline:${payment.id}` }
                    ]]
                }
            );
        }
    }
}

async function handleCallback(callbackQuery: any, env: Env, supabase: any, config: BotConfig) {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    // Answer callback to remove loading state
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQuery.id }),
    });

    const [action, param] = data.split(':');

    // Bank selection
    if (action === 'bank') {
        const bank = param;
        const state = userStates.get(userId);

        if (!state) return;

        if (state.action === 'deposit_bank') {
            const { amount } = state.data;
            const bankConfig = config.paymentMethods[bank];

            if (!bankConfig) {
                await sendMessage(chatId, '❌ Bank not found', env);
                return;
            }

            const customInstructionKey = `methods.${bank}.instructions.am`;
            const customInstruction = config._rawConfig?.[customInstructionKey];

            const rawInstruction = customInstruction || config.prompts.deposit.instructions;
            const instruction = rawInstruction
                .replace('{bank}', bankConfig.name)
                .replace('{amount}', amount.toString())
                .replace('{account}', bankConfig.account)
                .replace('{name}', bankConfig.accountName);

            await sendMessage(chatId, instruction, env);
            userStates.set(userId, { action: 'deposit_receipt', data: { amount, bank } });
        }
        else if (state.action === 'withdraw_bank') {
            const { amount } = state.data;
            const prompt = bank === 'telebirr'
                ? config.prompts.withdrawal.phone
                : config.prompts.withdrawal.account;

            await sendMessage(chatId, prompt, env);
            userStates.set(userId, { action: 'withdraw_account', data: { amount, bank } });
        }
    }
    // Admin approval/decline
    else if (action === 'approve' || action === 'decline') {
        if (!config.adminIds.includes(userId)) {
            await sendMessage(chatId, '❌ Unauthorized', env);
            return;
        }

        const paymentId = param;

        // Get payment details
        const { data: payment } = await supabase
            .from('payment_requests')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (!payment) {
            await sendMessage(chatId, '❌ Payment not found', env);
            return;
        }

        if (payment.status !== 'pending') {
            await sendMessage(chatId, `❌ Payment already ${payment.status}`, env);
            return;
        }

        if (action === 'approve') {
            // Update payment status
            await supabase
                .from('payment_requests')
                .update({ status: 'approved', updated_at: new Date().toISOString() })
                .eq('id', paymentId);

            // Update user balance
            if (payment.type === 'deposit') {
                await supabase.rpc('increment_balance', {
                    user_telegram_id: payment.user_id,
                    amount: payment.amount
                });
            } else if (payment.type === 'withdraw') {
                await supabase.rpc('increment_balance', {
                    user_telegram_id: payment.user_id,
                    amount: -payment.amount
                });
            }

            // Notify user
            const message = payment.type === 'deposit'
                ? config.prompts.deposit.success
                    .replace('{amount}', payment.amount.toString())
                    .replace('{ref}', payment.reference_code)
                : config.prompts.withdrawal.success
                    .replace('{amount}', payment.amount.toString())
                    .replace('{ref}', payment.reference_code);

            await sendMessage(payment.user_id, message, env);

            // Notify admin
            await sendMessage(chatId, `✅ Payment ${paymentId} approved`, env);
        }
        else if (action === 'decline') {
            // Update payment status
            await supabase
                .from('payment_requests')
                .update({ status: 'declined', updated_at: new Date().toISOString() })
                .eq('id', paymentId);

            // Get user balance for withdrawal decline
            let balanceMsg = '';
            if (payment.type === 'withdraw') {
                const { data: user } = await supabase
                    .from('users')
                    .select('balance')
                    .eq('telegram_id', payment.user_id)
                    .single();

                balanceMsg = `\\n\\n💳 Current Balance: ${user?.balance || 0} Birr\\n\\nPlease contact support if you believe this was an error.`;
            }

            // Notify user
            const message = payment.type === 'deposit'
                ? config.prompts.deposit.declined.replace('{amount}', payment.amount.toString())
                : config.prompts.withdrawal.declined
                    .replace('{amount}', payment.amount.toString())
                    .replace('{balance}', '0'); // Note: The updated SQL has a hardcoded balance placeholder, handled below

            // Better handling for the complex decline message
            let msg = message;
            if (payment.type === 'withdraw' && balanceMsg) {
                // If the custom balance message is needed
                // The default message from SQL already includes {balance} placeholder if strict
                // But let's handle the replacement if it exists
                const { data: user } = await supabase.from('users').select('balance').eq('telegram_id', payment.user_id).single();
                msg = msg.replace('{balance}', user?.balance || '0');
            }

            await sendMessage(payment.user_id, msg, env);

            // Notify admin
            await sendMessage(chatId, `❌ Payment ${paymentId} declined`, env);
        }
    }
}

async function showBankSelection(chatId: number, config: BotConfig, env: Env) {
    const banks = Object.keys(config.paymentMethods).map(key => ({
        text: `🏦 ${config.paymentMethods[key].name}`,
        callback_data: `bank:${key}`
    }));

    const keyboard = {
        inline_keyboard: [] as any[]
    };

    // Chunk into pairs
    for (let i = 0; i < banks.length; i += 2) {
        keyboard.inline_keyboard.push(banks.slice(i, i + 2));
    }

    await sendMessage(chatId, 'እባክዎት ማስገባት የሚፈልጉበትን ባንክ ይምረጡ።', env, keyboard);
}

async function handleStart(chatId: number, userId: number, username: string, env: Env, supabase: any, config: BotConfig) {
    await sendMessage(
        chatId,
        config.prompts.welcome || '👋 እንኳን ወደ ቢንጎ ኢትዮጵያ በደህና መጡ!\\n\\nእባክዎ መጀመሪያ ይመዝገቡ።',
        env,
        {
            keyboard: [[{ text: '📝 Register', request_contact: true }]],
            resize_keyboard: true,
            one_time_keyboard: true,
        }
    );
}


async function generateUniqueReferralCode(supabase: any): Promise<string> {
    let code = '';
    let exists = true;

    while (exists) {
        code = 'BINGO' + Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data } = await supabase
            .from('users')
            .select('referral_code')
            .eq('referral_code', code)
            .maybeSingle();
        exists = !!data;
    }

    return code;
}

// Cloudflare Worker Entry Point
export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        try {
            const url = new URL(request.url);

            // Health check
            if (url.pathname === '/health' || url.pathname === '/') {
                return jsonResponse({
                    status: 'ok',
                    service: 'bingo-bot-worker',
                    version: 'v2-exact-flows-logging',
                    timestamp: new Date().toISOString(),
                });
            }

            // Bot webhook
            const WEBHOOK_PATH = '/webhook-v2-secure-99';
            if (url.pathname === WEBHOOK_PATH || url.pathname.startsWith('/bot')) {
                return handleBotWebhook(request, env);
            }

            return jsonResponse({ error: 'Not found' }, 404);
        } catch (e: any) {
            console.error('TOP LEVEL ERROR:', e);
            return jsonResponse({
                error: e.message,
                stack: e.stack,
                status: 'error'
            }, 500);
        }
    },
};
