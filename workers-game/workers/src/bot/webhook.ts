import type { Env } from '../types';
import { getSupabase, jsonResponse } from '../utils';
import { BotConfigService } from './configService'; // [NEW]
import {
    sendMessage,
    answerCallback,
    updateBotMenuButton,
    setPersonalizedMenuButton,
    getMainKeyboard,
    generateRefCode,
    generateUniqueReferralCode,
    getWebAppUrl
} from './utils';
import { FlowManager } from './flowManager';
import { handleTournaments, handleEvents, handleTournamentCallbacks } from './tournamentHandlers';

// User state tracking
const userStates = new Map<number, { action: string; data?: any; flow?: string; stepIndex?: number }>();

export async function handleBotWebhook(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const update = await request.json() as any;
    const supabase = getSupabase(env);

    // [NEW] Load Dynamic Config
    const configService = new BotConfigService(env);
    const config = await configService.getConfig();

    // DIAGNOSTIC LOGGING
    console.log('Update received:', JSON.stringify(update, null, 2));

    try {
        // Handle messages
        if (update.message) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            const username = update.message.from.username || update.message.from.first_name;
            const userId = update.message.from.id;

            console.log(`Processing message from ${userId}: ${text}`);

            // Handle contact sharing (registration)
            if (update.message.contact) {
                await handleContactShare(update.message, env, supabase);
                return jsonResponse({ ok: true });
            }

            // Handle text commands
            if (text) {
                await handleCommand(chatId, userId, text, username, env, supabase, config); // Pass config
            }
        }

        // Handle callback queries (inline button clicks)
        if (update.callback_query) {
            console.log('Processing callback query:', update.callback_query.data);
            await handleCallbackQuery(update.callback_query, env, supabase, config); // Pass config
        }
    } catch (e) {
        console.error('CRITICAL BOT ERROR:', e);
        // Attempt to notify admin of error if possible
        try {
            for (const adminId of config.adminIds) {
                await sendMessage(adminId, `⚠️ <b>Bot Critical Error</b>\n\n<pre>${JSON.stringify(e, Object.getOwnPropertyNames(e))}</pre>`, env);
            }
        } catch (inner) {
            console.error('Failed to report error to admin', inner);
        }
    }

    return jsonResponse({ ok: true });
}

async function handleCommand(chatId: number, userId: number, text: string, username: string, env: Env, supabase: any, config: any) {
    // Check if user is registered - use maybeSingle() instead of single() to avoid errors
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', userId)
        .maybeSingle();

    // Log for debugging
    console.log('User lookup:', { userId, found: !!user, is_registered: user?.is_registered, error });

    // If not registered, handle /start with param or show registration
    if (!user || user.is_registered === false) {
        if (text.startsWith('/start')) {
            const param = text.split(' ')[1]; // Extract payload
            await handleStart(chatId, userId, username, env, supabase, param);
        } else {
            await sendMessage(
                chatId,
                config.botFlows?.onboarding?.welcome || config.botSettings?.welcome_message || '👋 Welcome to Bingo Ethiopia!',
                env,
                {
                    keyboard: [[{ text: '📝 Register', request_contact: true }]],
                    resize_keyboard: true,
                    one_time_keyboard: true
                }
            );
        }
        return;
    }

    const userState = userStates.get(userId);

    // Check if user is in a conversation flow
    if (userState) {
        await handleUserInput(chatId, userId, text, userState, env, supabase, config);
        return;
    }

    // Handle commands
    // Handle /start explicitly first to capture params even for registered users (logging them in again)
    if (text.startsWith('/start')) {
        await handleStart(chatId, userId, username, env, supabase);
        return;
    }

    // [NEW] Check Custom Commands
    if (config.botCommands && config.botCommands[text]) {
        await sendMessage(chatId, config.botCommands[text], env);
        return;
    }

    switch (text) {
        // REMOVED /start case from here as it is handled via if-statement above

        case '/balance':
        case '💰 Balance':
            await handleBalance(chatId, userId, env, supabase);
            break;

        case '/deposit':
        case '💳 Deposit':
            {
                const flowManager = new FlowManager();
                const state = await flowManager.startFlow({
                    chatId, userId, text, userState: null, env, config, supabase
                }, 'deposit');
                if (state) userStates.set(userId, state);
            }
            break;

        case '/withdraw':
        case '💸 Withdraw':
            {
                const flowManager = new FlowManager();
                const state = await flowManager.startFlow({
                    chatId, userId, text, userState: null, env, config, supabase
                }, 'withdrawal');
                if (state) userStates.set(userId, state);
            }
            break;

        case '/transactions':
        case '/history':
        case '📜 Transactions':
            await handleTransactions(chatId, userId, env, supabase);
            break;

        case '/my_stats':
        case '📊 My Stats':
            await handleStats(chatId, userId, env, supabase);
            break;

        case '/instruction':
        case '/help':
        case '📘 Instructions':
            await sendMessage(chatId, config.botFlows?.support?.instructions || config.instructions, env);
            break;

        case '/support':
        case '📞 Support':
            await sendMessage(chatId, config.botFlows?.support?.contact_message || config.support, env);
            break;

        case '/referral':
        case '🎁 Referral':
            await handleReferral(chatId, userId, env, supabase, config);
            break;

        case '/daily_bonus':
        case '🎁 Daily Bonus':
            await handleDailyBonus(chatId, userId, env, supabase, config);
            break;

        case '/tournament':
        case '🏆 Tournaments':
            await handleTournaments(chatId, userId, env, supabase);
            break;


        case '/events':
        case '🎉 Events':
            await handleEvents(chatId, userId, env, supabase);
            break;

        // Admin commands
        case '/admin':
            if (config.adminIds.includes(userId)) {
                await handleAdminPanel(chatId, env, supabase);
            }
            break;

        case '/pending':
            if (config.adminIds.includes(userId)) {
                await handlePendingPayments(chatId, env, supabase, config);
            }
            break;

        default:
            // Debug logging
            console.log('=== COMMAND DEBUG ===');
            console.log('Received text:', text);
            console.log('User ID:', userId);
            console.log('User registered:', user?.is_registered);
            console.log('====================');

            // Check if it's a referral code
            if (text.startsWith('BINGO')) {
                await handleReferralCode(chatId, userId, text, env, supabase, config);
            } else {
                await sendMessage(chatId, config.botFlows?.errors?.unknown_command || '❓ Unknown command. Try /start for help.', env);
            }
    }
}

async function handleUserInput(chatId: number, userId: number, text: string, userState: any, env: Env, supabase: any, config: any) {
    // NEW DYNAMIC FLOW HANDLING
    if (userState.flow) {
        const flowManager = new FlowManager();
        const newState = await flowManager.handleInput({
            chatId, userId, text, userState, env, config, supabase
        });

        if (newState) {
            userStates.set(userId, newState);
        } else {
            userStates.delete(userId); // Flow complete or cancelled
        }
        return;
    }

    // LEGACY DEPOSIT FLOW (Fallback/Transition)
    if (userState.action === 'deposit_amount') {
        const amount = parseFloat(text);

        if (isNaN(amount) || amount < config.limits.minDeposit) {
            await sendMessage(chatId, `❌ ${config.botFlows?.deposit?.invalid_amount || 'Invalid Amount'}`, env);
            return;
        }

        userStates.set(userId, { action: 'deposit_bank', data: { amount } });
        await showBankSelection(chatId, 'deposit', env, config);
    }
    else if (userState.action === 'deposit_message') {
        const message = text;
        const amount = userState.data.amount;
        const method = userState.data.method;
        const methodName = config.methods[method]?.name || method;
        const refCode = generateRefCode('DEP');

        const { data: insertedPayment, error: insertError } = await supabase
            .from('payment_requests')
            .insert({
                user_id: userId,
                type: 'deposit',
                amount,
                status: 'pending',
                reference_code: refCode,
                screenshot_url: message,
                telebirr_phone: method === 'telebirr' ? 'N/A' : null,
                created_at: new Date().toISOString(),
            })
            .select('*')
            .single();

        console.log('Payment inserted:', { paymentId: insertedPayment?.id, raw: insertedPayment, error: insertError });

        if (insertError || !insertedPayment) {
            console.error('Failed to insert payment:', insertError);
            await sendMessage(chatId, '❌ Failed to create payment request. Please try again.', env);
            userStates.delete(userId);
            return;
        }

        if (!insertedPayment.id) {
            console.error('[CRITICAL] Payment inserted but ID is missing:', insertedPayment);
        }

        userStates.delete(userId);

        await sendMessage(chatId, config.botFlows?.deposit?.pending_message || '✅ Deposit Request Created!', env, getMainKeyboard(userId, config));

        // Get user info for admin notification
        const { data: user } = await supabase
            .from('users')
            .select('username, phone_number')
            .eq('telegram_id', userId)
            .single();

        // Notify all admins
        for (const adminId of config.adminIds) {
            await sendMessage(
                adminId,
                `💵 <b>New Deposit Request (Text Receipt)</b>\n\n` +
                `👤 User: ${user?.username || 'Unknown'}\n` +
                `📱 Phone: ${user?.phone_number || 'N/A'}\n` +
                `💰 Amount: ${amount} Birr\n` +
                `🏦 Bank: ${methodName}\n` +
                `🧾 Ref: ${refCode}\n` +
                `📝 Receipt:\n${message}\n` +
                `🆔 Transaction ID: ${insertedPayment.id || 'ERROR'}`,
                env,
                {
                    inline_keyboard: [[
                        { text: '✅ Approve', callback_data: `approve:${insertedPayment.id}` },
                        { text: '❌ Decline', callback_data: `reject:${insertedPayment.id}` }
                    ]]
                }
            );
        }
    }
    // WITHDRAWAL FLOW
    else if (userState.action === 'withdraw_amount') {
        const amount = parseFloat(text);

        if (isNaN(amount)) {
            await sendMessage(chatId, config.prompts.withdrawAmount, env);
            return;
        }

        if (amount < config.limits.minWithdrawal) {
            await sendMessage(
                chatId,
                (config.botFlows?.withdrawal?.min_error || 'Min withdrawal is {min}').replace('{min}', config.limits.minWithdrawal.toString()),
                env
            );
            userStates.delete(userId);
            return;
        }

        if (amount > config.limits.maxWithdrawal) {
            await sendMessage(
                chatId,
                (config.botFlows?.withdrawal?.max_error || 'Max withdrawal is {max}').replace('{max}', config.limits.maxWithdrawal.toString()),
                env
            );
            userStates.delete(userId);
            return;
        }

        const { data: user } = await supabase
            .from('users')
            .select('balance')
            .eq('telegram_id', userId)
            .single();

        if (!user || user.balance < amount) {
            await sendMessage(
                chatId,
                (config.botFlows?.withdrawal?.balance_error || 'Insufficient balance: {balance}').replace('{balance}', (user?.balance || 0).toString())
                    .replace('{amount}', amount.toString()),
                env
            );
            userStates.delete(userId);
            return;
        }

        userStates.set(userId, { action: 'withdraw_bank', data: { amount } });
        await showBankSelection(chatId, 'withdraw', env, config);
    }
    else if (userState.action === 'withdraw_account') {

        const accountNumber = text.trim();
        const amount = userState.data.amount;
        const method = userState.data.method;
        const refCode = generateRefCode('WTH');

        // DIAGNOSTIC: Check table structure
        try {
            const { data: sampleRow, error: sampleError } = await supabase
                .from('payment_requests')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (sampleRow) {
                console.log('📋 Existing Table Columns:', Object.keys(sampleRow));
            } else {
                console.log('📋 Table is empty or error:', sampleError);
            }
        } catch (e) {
            console.error('Diagnostic failed:', e);
        }

        // Try to insert with fallback column names if schema assumes different names
        let insertedPayment = null;
        let insertError = null;

        // Attempt 1: Standard Schema (bank_account_number)
        try {
            const res = await supabase
                .from('payment_requests')
                .insert({
                    user_id: userId,
                    type: 'withdraw',
                    amount,
                    payment_method: method,
                    bank_account_number: accountNumber,
                    status: 'pending',
                    reference_code: refCode,
                    created_at: new Date().toISOString(),
                })
                .select('*')
                .single();

            insertedPayment = res.data;
            insertError = res.error;
        } catch (e) {
            console.warn('Attempt 1 failed:', e);
        }

        // Attempt 2: Fallback to 'account_number' if column missing
        if ((!insertedPayment && insertError?.code === 'PGRST204') || (!insertedPayment && !insertError)) {
            console.log('🔄 Retrying withdrawal with "account_number" column...');
            const res = await supabase
                .from('payment_requests')
                .insert({
                    user_id: userId,
                    type: 'withdraw',
                    amount,
                    payment_method: method,
                    account_number: accountNumber, // Fallback column name
                    status: 'pending',
                    reference_code: refCode,
                    created_at: new Date().toISOString(),
                })
                .select('*')
                .single();

            if (!res.error) {
                insertedPayment = res.data;
                insertError = null;
            } else {
                console.warn('Attempt 2 failed:', res.error);
                // Attempt 3: Fallback to 'admin_note' if all else fails
                if ((!insertedPayment && insertError?.code === 'PGRST204') || (!insertedPayment && !insertError)) {
                    console.log('🔄 Retrying withdrawal with "admin_note" storage...');
                    const res = await supabase
                        .from('payment_requests')
                        .insert({
                            user_id: userId,
                            type: 'withdraw',
                            amount,
                            payment_method: method,
                            admin_note: `Account: ${accountNumber}`, // Store in note
                            status: 'pending',
                            reference_code: refCode,
                            created_at: new Date().toISOString(),
                        })
                        .select('*')
                        .single();

                    insertedPayment = res.data;
                    insertError = res.error;
                }

                // Attempt 4: Bare Minimum (Nuclear Option)
                if (!insertedPayment) {
                    console.log('☢️ Retrying BARE MINIMUM insert...');
                    // Try assuming 'payment_method' itself is the issue (maybe column is named 'method'?)
                    // Or maybe 'admin_note' is missing too?
                    // Just try strict mandatory fields
                    const res = await supabase
                        .from('payment_requests')
                        .insert({
                            user_id: userId,
                            type: 'withdraw',
                            amount,
                            status: 'pending',
                            created_at: new Date().toISOString(),
                        })
                        .select('*')
                        .single();

                    if (!res.error) {
                        insertedPayment = res.data;
                        insertError = null;
                        // Since we couldn't save details, we MUST send them to admin chat text manually
                        // We'll handle this in the notification part
                    } else {
                        console.error('Attempt 4 failed:', res.error);
                    }
                }

                console.log('Withdrawal inserted:', { paymentId: insertedPayment?.id, raw: insertedPayment, error: insertError });

                if (insertError || !insertedPayment || !insertedPayment.id) {
                    console.error('[CRITICAL] Withdrawal insert failed or ID is missing:', { error: insertError, payment: insertedPayment });
                    await sendMessage(chatId, '❌ Failed to create withdrawal request. Please try again.', env);
                    userStates.delete(userId);
                    return;
                }

                userStates.delete(userId);

                await sendMessage(chatId, config.botFlows?.withdrawal?.pending_message || '✅ Withdrawal Request Created!', env, getMainKeyboard(userId, config));

                // Get user info for admin notification
                const { data: user } = await supabase
                    .from('users')
                    .select('username, phone_number')
                    .eq('telegram_id', userId)
                    .single();

                // Notify all admins
                const methodName = config.methods[method as string]?.name || method;
                for (const adminId of config.adminIds) {
                    await sendMessage(
                        adminId,
                        `💸 <b>New Withdrawal Request </b>\n\n` +
                        `👤 User: ${user?.username || 'Unknown'}\n` +
                        `📱 Phone: ${user?.phone_number || 'N/A'}\n` +
                        `💰 Amount: ${amount} Birr\n` +
                        `🏦 Bank: ${methodName}\n` +
                        `💳 Account: ${accountNumber}\n` +
                        `🧾 Ref: ${refCode}\n` +
                        `🆔 Transaction ID: ${insertedPayment.id}\n`,
                        env,
                        {
                            inline_keyboard: [[
                                { text: '✅ Approve', callback_data: `approve:${insertedPayment.id}` },
                                { text: '❌ Decline', callback_data: `reject:${insertedPayment.id}` }
                            ]]
                        }
                    );
                }
            }
        }
    }
}

async function handleCallbackQuery(callbackQuery: any, env: Env, supabase: any, config: any) {
    const chatId = callbackQuery.message.chat.id;
    const userId = callbackQuery.from.id;
    const data = callbackQuery.data;

    console.log('Callback received:', { data, userId });

    await answerCallback(callbackQuery.id, env);

    const [action, ...params] = data.split(':');
    console.log('Parsed callback:', { action, params, paramsLength: params.length });

    switch (action) {
        case 'deposit_bank':
        case 'withdraw_bank':
            const method = params[0];
            const state = userStates.get(userId);

            if (state && (state.action === 'deposit_bank' || state.action === 'withdraw_bank')) {
                const amount = state.data.amount;

                // If deposit, show instructions
                if (action === 'deposit_bank') {
                    // Need config-aware helper
                    // Helper: const instruction = config.methods[method]?.instructions['am'].replace('{amount}', amount);
                    const methodConfig = config.methods[method];
                    if (methodConfig) {
                        const instruction = methodConfig.instructions['am'].replace('{amount}', amount.toString());
                        // Use default or maybe add a generic 'Bank Instruction Header' later if needed
                        const msg = instruction;
                        await sendMessage(chatId, msg, env);
                        userStates.set(userId, { action: 'deposit_message', data: { amount, method } });
                    } else {
                        await sendMessage(chatId, 'Error: Bank config not found', env);
                    }
                }
                // If withdraw, ask for account
                else if (action === 'withdraw_bank') {
                    const prompt = method === 'telebirr'
                        ? config.botFlows?.withdrawal?.prompt_phone || '📱 Enter phone number:'
                        : config.botFlows?.withdrawal?.prompt_account || '🔢 Enter account number:';
                    await sendMessage(chatId, prompt, env);
                    userStates.set(userId, { action: 'withdraw_account', data: { amount, method } });
                }
            }
            break;

        case 'approve':
            console.log('Approve callback:', { userId, adminIds: config.adminIds, paymentId: params[0] });
            if (config.adminIds.includes(userId)) {
                const paymentId = params[0];
                await handleApprovePayment(chatId, paymentId, env, supabase, config);
            } else {
                console.log('User is not admin, ignoring approve');
            }
            break;

        case 'bank_select': // NEW FlowManager callback
            const bankKey = params[0];
            const currentState = userStates.get(userId);
            if (currentState && currentState.flow) {
                // Update state with bank selection
                currentState.data.bank = bankKey;
                currentState.stepIndex = (currentState.stepIndex || 0) + 1; // Manually advance since this is a callback, not text input

                // Trigger next step via FlowManager
                const flowManager = new FlowManager();
                // We need to re-trigger the "next step" logic. 
                // Since handleInput expects text, let's just use internal helper or simulate input?
                // Better: Just manually call sendPrompt for next step.

                // Hack: Reuse sendPrompt logic by accessing private method? No.
                // Solution: Create a public 'next' method or simulation.
                // For now, let's assume FlowManager.handleInput handles validation. 
                // We'll just pass dummy text? No.

                // Let's rely on FlowManager to handle the flow progression.
                // We can't easily call 'handleInput' because it runs 'bank' handler which fails on text.
                // WE NEED TO UPDATE FlowManager.ts to have 'handleCallback'.
                // FOR NOW: Let's assume we update FlowManager to allow skipping validation if data is present.

                // Let's try calling handleInput with the bank key as text?
                // If I updated FlowManager 'bank' handler to accept text matching keys, it would work.

                // Temporary Fix: Manually advance.
                const sequence = flowManager.getSequence(config, currentState.flow!);
                if (currentState.stepIndex < sequence.length) {
                    const nextStep = sequence[currentState.stepIndex];
                    // We need context to send prompt
                    await flowManager.sendPrompt({
                        chatId, userId, text: '', userState: currentState, env, config, supabase: null
                    }, nextStep, currentState.flow!);

                    userStates.set(userId, currentState);
                } else {
                    await flowManager.finalize({
                        chatId, userId, text: '', userState: currentState, env, config, supabase: null
                    }, currentState.flow!, currentState.data);
                    userStates.delete(userId);
                }
            }
            break;


    }
}

async function showBankSelection(chatId: number, type: 'deposit' | 'withdraw', env: Env, config: any) {
    const message = type === 'deposit'
        ? config.botFlows?.deposit?.prompt_bank || '🏦 Select Bank:'
        : config.botFlows?.withdrawal?.prompt_bank || '🏦 Select Bank:';

    // Dynamically build keyboard from config.methods
    const banks = Object.keys(config.methods).map(key => ({
        text: `🏦 ${config.methods[key].name}`,
        callback_data: `${type}_bank:${key}`
    }));

    // Chunk into pairs
    const keyboard = {
        inline_keyboard: [] as any[]
    };

    for (let i = 0; i < banks.length; i += 2) {
        keyboard.inline_keyboard.push(banks.slice(i, i + 2));
    }

    await sendMessage(chatId, message, env, keyboard);
}

// Referral system
async function handleReferral(chatId: number, userId: number, env: Env, supabase: any, config: any) {
    const { data: user } = await supabase
        .from('users')
        .select('referral_code, referral_count, referral_earnings')
        .eq('telegram_id', userId)
        .single();

    if (!user) return;

    const message = (config.botFlows?.referral?.share_message || '🎁 Use my code!') + `\n\n` +
        `📋 Your Code: <code>${user.referral_code}</code>\n` +
        `👥 Referrals: ${user.referral_count || 0} friends\n` +
        `💰 Earned: ${user.referral_earnings || 0} Birr\n\n` +
        `<b>How it works:</b>\n` +
        `• Share your code with friends\n` +
        `• They register using your code\n` +
        `• You get ${config.referral.referrerReward} Birr\n` +
        `• They get ${config.referral.referredReward} Birr bonus!\n\n` +
        `Share your code: <code>${user.referral_code}</code>`;

    await sendMessage(chatId, message, env, {
        inline_keyboard: [[
            { text: '📤 Share Code', switch_inline_query: `Join Bingo Ethiopia with my code: ${user.referral_code}` }
        ]]
    });
}

async function handleReferralCode(chatId: number, userId: number, code: string, env: Env, supabase: any, config: any) {
    // Check if user already used a referral code
    const { data: user } = await supabase
        .from('users')
        .select('referred_by')
        .eq('telegram_id', userId)
        .single();

    if (user?.referred_by) {
        await sendMessage(chatId, '❌ You have already used a referral code.', env);
        return;
    }

    // Find referrer
    const { data: referrer } = await supabase
        .from('users')
        .select('telegram_id, referral_count, referral_earnings')
        .eq('referral_code', code)
        .single();

    if (!referrer) {
        await sendMessage(chatId, '❌ Invalid referral code.', env);
        return;
    }

    if (referrer.telegram_id === userId) {
        await sendMessage(chatId, '❌ You cannot use your own referral code.', env);
        return;
    }

    // Apply referral rewards
    await supabase.rpc('increment_balance', {
        user_telegram_id: userId,
        amount: config.referral.referredReward
    });

    await supabase.rpc('increment_balance', {
        user_telegram_id: referrer.telegram_id,
        amount: config.referral.referrerReward
    });

    // Update referral tracking
    await supabase
        .from('users')
        .update({
            referred_by: referrer.telegram_id,
        })
        .eq('telegram_id', userId);

    await supabase
        .from('users')
        .update({
            referral_count: (referrer.referral_count || 0) + 1,
            referral_earnings: (referrer.referral_earnings || 0) + config.referral.referrerReward
        })
        .eq('telegram_id', referrer.telegram_id);

    // Record referral
    await supabase
        .from('referrals')
        .insert({
            referrer_id: referrer.telegram_id,
            referred_id: userId,
            reward_amount: config.referral.referrerReward,
            created_at: new Date().toISOString()
        });

    await sendMessage(
        chatId,
        `✅ <b>Referral Applied!</b>\n\n` +
        `You received ${config.referral.referredReward} Birr bonus!\n` +
        `Your referrer received ${config.referral.referrerReward} Birr!`,
        env
    );

    // Notify referrer
    await sendMessage(
        referrer.telegram_id,
        `🎉 <b>New Referral!</b>\n\n` +
        `Someone used your code!\n` +
        `You earned ${config.referral.referrerReward} Birr! 💰`,
        env
    );
}


// Daily bonus system
async function handleDailyBonus(chatId: number, userId: number, env: Env, supabase: any, config: any) {
    const { data: user } = await supabase
        .from('users')
        .select('last_daily_claim, daily_streak')
        .eq('telegram_id', userId)
        .single();

    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const lastClaim = user.last_daily_claim;

    // Check if already claimed today
    if (lastClaim === today) {
        const nextDay = new Date();
        nextDay.setDate(nextDay.getDate() + 1);
        await sendMessage(
            chatId,
            `⏰ <b>Already Claimed Today!</b>\n\n` +
            `Come back tomorrow to claim your next reward!\n` +
            `Current streak: ${user.daily_streak || 0} days`,
            env
        );
        return;
    }

    // Calculate new streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let newStreak = 1;
    if (lastClaim === yesterdayStr) {
        newStreak = (user.daily_streak || 0) + 1;
        if (newStreak > 7) newStreak = 1; // Reset after 7 days
    }

    // Access dailyRewards string keys safely
    const reward = config.dailyRewards[newStreak.toString()] || 10;

    // Update balance and streak
    await supabase.rpc('increment_balance', {
        user_telegram_id: userId,
        amount: reward
    });

    await supabase
        .from('users')
        .update({
            last_daily_claim: today,
            daily_streak: newStreak,
            total_daily_earned: (user.total_daily_earned || 0) + reward
        })
        .eq('telegram_id', userId);

    // Record claim
    await supabase
        .from('daily_claims')
        .insert({
            user_id: userId,
            claim_date: today,
            reward_amount: reward,
            streak_day: newStreak,
            created_at: new Date().toISOString()
        });

    const nextReward = config.dailyRewards[((newStreak % 7) + 1).toString()] || 10;

    await sendMessage(
        chatId,
        `🎁 <b>Daily Bonus Claimed!</b>\n\n` +
        `💰 Reward: ${reward} Birr\n` +
        `🔥 Streak: ${newStreak} day${newStreak > 1 ? 's' : ''}\n` +
        `📅 Next reward: ${nextReward} Birr\n\n` +
        `Come back tomorrow to continue your streak!`,
        env
    );
}

// Admin functions
async function handlePendingPayments(chatId: number, env: Env, supabase: any, config: any) {
    const { data: payments } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    if (!payments || payments.length === 0) {
        await sendMessage(chatId, '✅ No pending payments', env);
        return;
    }

    for (const payment of payments) {
        // Get user info
        const { data: user } = await supabase
            .from('users')
            .select('username, phone_number')
            .eq('telegram_id', payment.user_id)
            .single();

        const methodName = config.methods[payment.payment_method as string]?.name || payment.payment_method;

        let message = '';
        if (payment.type === 'deposit') {
            message = `💵 <b>New Deposit Request (Text Receipt)</b>\n\n` +
                `👤 User: ${user?.username || 'Unknown'}\n` +
                `📱 Phone: ${user?.phone_number || 'N/A'}\n` +
                `💰 Amount: ${payment.amount} Birr\n` +
                `🏦 Bank: ${methodName}\n` +
                `🧾 Ref: ${payment.reference_code}\n` +
                `📝 Receipt:\n${payment.screenshot_url}\n` +
                `🆔 Transaction ID: ${payment.id}`;
        } else {
            message = `💸 <b>New Withdrawal Request</b>\n\n` +
                `👤 User: ${user?.username || 'Unknown'}\n` +
                `📱 Phone: ${user?.phone_number || 'N/A'}\n` +
                `💰 Amount: ${payment.amount} Birr\n` +
                `🏦 Bank: ${methodName}\n` +
                `💳 Account: ${payment.bank_account_number}\n` +
                `🧾 Ref: ${payment.reference_code}\n` +
                `🆔 Transaction ID: ${payment.id}`;
        }

        const keyboard = {
            inline_keyboard: [[
                { text: '✅ Approve', callback_data: `approve:${payment.id}` },
                { text: '❌ Decline', callback_data: `reject:${payment.id}` }
            ]]
        };

        await sendMessage(chatId, message, env, keyboard);
    }
}

async function handleApprovePayment(chatId: number, paymentId: string, env: Env, supabase: any, config: any) {
    const { data: payment } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('id', paymentId)
        .single();

    if (!payment) {
        await sendMessage(chatId, '❌ Payment not found', env);
        return;
    }

    await supabase
        .from('payment_requests')
        .update({ status: 'approved', processed_at: new Date().toISOString() })
        .eq('id', paymentId);

    if (payment.type === 'deposit') {
        await supabase.rpc('increment_balance', {
            user_telegram_id: payment.user_id,
            amount: payment.amount
        });
    } else {
        await supabase.rpc('decrement_balance', {
            user_telegram_id: payment.user_id,
            amount: payment.amount
        });
    }

    // Get updated balance
    const { data: user } = await supabase
        .from('users')
        .select('balance')
        .eq('telegram_id', payment.user_id)
        .single();

    await sendMessage(chatId, `✅ Payment approved: ${paymentId}`, env);

    const message = payment.type === 'deposit'
        ? (config.botFlows?.deposit?.success_message || '✅ Deposit confirmed.')
            .replace('{amount}', payment.amount.toString())
            .replace('{ref}', payment.reference_code)
        : (config.botFlows?.withdrawal?.success_message || '✅ Withdrawal confirmed.')
            .replace('{amount}', payment.amount.toString())
            .replace('{ref}', payment.reference_code);

    await sendMessage(payment.user_id, message, env);

    // Broadcast balance update for real-time sync
    console.log(`Balance updated for user ${payment.user_id}: ${user?.balance}`);
}

async function handleRejectPayment(chatId: number, paymentId: string, env: Env, supabase: any, config: any) {
    const { data: payment } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('id', paymentId)
        .single();

    if (!payment) {
        await sendMessage(chatId, '❌ Payment not found', env);
        return;
    }

    await supabase
        .from('payment_requests')
        .update({ status: 'rejected', processed_at: new Date().toISOString() })
        .eq('id', paymentId);

    await sendMessage(chatId, `❌ Payment rejected: ${paymentId}`, env);

    const { data: user } = await supabase
        .from('users')
        .select('balance')
        .eq('telegram_id', payment.user_id)
        .single();

    const message = payment.type === 'deposit'
        ? (config.botFlows?.deposit?.declined_message || '❌ Deposit declined.').replace('{amount}', payment.amount.toString())
        : (config.botFlows?.withdrawal?.declined_message || '❌ Withdrawal declined.')
            .replace('{amount}', payment.amount.toString())
            .replace('{balance}', (user?.balance || 0).toFixed(2));

    await sendMessage(payment.user_id, message, env);
}

// Other handlers
// Helper to resolve referrer from param (ID or Code)
async function resolveReferrer(param: string, supabase: any) {
    // Try as Telegram ID
    if (/^\d+$/.test(param)) {
        const { data } = await supabase.from('users').select('telegram_id').eq('telegram_id', param).single();
        if (data) return data.telegram_id;
    }
    // Try as Referral Code
    const { data } = await supabase.from('users').select('telegram_id').eq('referral_code', param).single();
    if (data) return data.telegram_id;

    return null;
}

async function handleStart(chatId: number, userId: number, username: string, env: Env, supabase: any, referrerParam?: string) {
    // Check if user exists
    const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', userId)
        .maybeSingle();

    const isRegistered = existingUser && existingUser.is_registered;

    if (!isRegistered) {
        // NEW USER FLOW

        // Handle Referral if param exists
        if (referrerParam) {
            const referrerId = await resolveReferrer(referrerParam, supabase);

            // Only apply if valid referrer and NOT self
            if (referrerId && referrerId != userId) {
                // Upsert user with pending referral
                // We generate a code for them now to ensure the row exists
                let myRefCode = existingUser?.referral_code;
                if (!myRefCode) {
                    myRefCode = await generateUniqueReferralCode(supabase);
                }

                await supabase.from('users').upsert({
                    telegram_id: userId,
                    username: username,
                    first_name: username, // Fallback
                    referral_code: myRefCode,
                    referred_by: referrerId,
                    is_registered: false,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'telegram_id' });

                console.log(`Deep Link Referral: Stored pending referral for ${userId} from ${referrerId}`);
            }
        }

        // Request contact
        await sendMessage(
            chatId,
            '🎮 <b>Welcome to Ethiopian Bingo!</b>\n\n' +
            'To get started, please share your contact information:',
            env,
            {
                keyboard: [[{ text: '📱 Share Contact', request_contact: true }]],
                resize_keyboard: true,
                one_time_keyboard: true
            }
        );
        return;
    }

    // Existing user - show welcome with WebApp button
    const message =
        `🎮 <b>Welcome back to Ethiopian Bingo!</b>\n\n` +
        `💰 Balance: ${existingUser.balance} Birr\n` +
        `🎁 Referral Code: <code>${existingUser.referral_code}</code>\n\n` +
        `Click the button below to start playing!`;

    // Set personalized Menu Button for this user (so bottom-left button works with auth)
    await setPersonalizedMenuButton(existingUser.telegram_id, env);

    await sendMessage(chatId, message, env, {
        inline_keyboard: [[
            { text: '🎮 Play Now', web_app: { url: getWebAppUrl(existingUser.telegram_id) } }
        ]]
    });

    // Send keyboard menu separately with personalized URL
    await sendMessage(chatId, 'Choose an option:', env, getMainKeyboard(existingUser.telegram_id));
}

async function handleBalance(chatId: number, userId: number, env: Env, supabase: any) {
    const { data: user } = await supabase
        .from('users')
        .select('balance')
        .eq('telegram_id', userId)
        .single();

    if (!user) {
        await sendMessage(chatId, '❌ Please use /start to register first.', env);
        return;
    }

    await sendMessage(
        chatId,
        `💰 <b>Your Balance</b>\n\nCurrent Balance: <b>${user.balance} Birr</b>`,
        env
    );
}

async function handleTransactions(chatId: number, userId: number, env: Env, supabase: any) {
    const { data: payments } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

    if (!payments || payments.length === 0) {
        await sendMessage(chatId, '📜 No transactions yet.', env);
        return;
    }

    let message = '📜 <b>Recent Transactions</b>\n\n';

    for (const payment of payments) {
        const icon = payment.type === 'deposit' ? '💳' : '💸';
        const status = payment.status === 'approved' ? '✅' : payment.status === 'rejected' ? '❌' : '⏳';
        message += `${icon} ${payment.type.toUpperCase()} - ${payment.amount} Birr ${status}\n`;
    }

    await sendMessage(chatId, message, env);
}

async function handleStats(chatId: number, userId: number, env: Env, supabase: any) {
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', userId)
        .single();

    if (!user) {
        await sendMessage(chatId, '❌ User not found', env);
        return;
    }

    await sendMessage(
        chatId,
        `📊 <b>Your Statistics</b>\n\n` +
        `👤 Username: ${user.username}\n` +
        `💰 Balance: ${user.balance} Birr\n` +
        `🎁 Referrals: ${user.referral_count || 0}\n` +
        `🔥 Daily Streak: ${user.daily_streak || 0} days\n` +
        `📅 Joined: ${new Date(user.created_at).toLocaleDateString()}`,
        env
    );
}

async function handleAdminPanel(chatId: number, env: Env, supabase: any) {
    const { data: stats } = await supabase
        .from('payment_requests')
        .select('status')
        .eq('status', 'pending');

    await sendMessage(
        chatId,
        `👑 <b>Admin Panel</b>\n\n` +
        `📊 Pending Payments: ${stats?.length || 0}\n\n` +
        `Commands:\n` +
        `/pending - View pending payments`,
        env
    );
}

async function handleContactShare(message: any, env: Env, supabase: any) {
    const chatId = message.chat.id;
    const contact = message.contact;

    if (contact.user_id !== message.from.id) {
        await sendMessage(chatId, '❌ Please share your own contact.', env);
        return;
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', contact.user_id)
        .maybeSingle();

    let refCode = existingUser?.referral_code;

    // Generate referral code only if user doesn't have one
    if (!refCode) {
        refCode = await generateUniqueReferralCode(supabase);
    }

    // Upsert user with is_registered = true
    const { error: upsertError } = await supabase
        .from('users')
        .upsert({
            telegram_id: contact.user_id,
            username: message.from.username || contact.first_name,
            phone_number: contact.phone_number,
            first_name: contact.first_name,
            balance: existingUser?.balance || 100,
            referral_code: refCode,
            is_registered: true,
            updated_at: new Date().toISOString(),
        }, {
            onConflict: 'telegram_id'
        });

    if (upsertError) {
        console.error('Registration error:', upsertError);
        await sendMessage(chatId, '❌ Registration failed. Please try again.', env);
        return;
    }

    console.log('User registered successfully:', contact.user_id);

    await sendMessage(
        chatId,
        `✅ <b>Registration Complete!</b>\n\n` +
        `Welcome bonus: ${existingUser ? '0' : '100'} Birr\n` +
        `Your referral code: <code>${refCode}</code>\n\n` +
        `Use the menu below to get started!`,
        env,
        getMainKeyboard(contact.user_id)
    );
}

// Helper functions moved to utils.ts
