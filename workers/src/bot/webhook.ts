import type { Env } from '../types';
import { getSupabase, jsonResponse } from '../utils';
import { BotConfigService } from './configService'; // [NEW]
import {
    sendMessage,
    sendPhoto,
    answerCallback,
    updateBotMenuButton,
    setPersonalizedMenuButton,
    getMainKeyboard,
    generateRefCode,
    generateUniqueReferralCode,
    getWebAppUrl,
    deleteMessage
} from './utils';
import { FlowManager } from './flowManager';
import { handleTournaments, handleEvents, handleTournamentCallbacks } from './tournamentHandlers';

// [FIX] Simple Redis wrapper using raw fetch to avoid SDK's Cloudflare Worker compatibility issues
class SimpleRedis {
    constructor(private url: string, private token: string) { }

    private async runCommand(command: string[]): Promise<any> {
        const baseUrl = this.url.endsWith('/') ? this.url : `${this.url}/`;
        try {
            const res = await fetch(baseUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(command)
            });

            if (!res.ok) {
                const errText = await res.text();
                console.error(`Redis Error [${command[0]}]:`, errText);
                return null;
            }

            const data: any = await res.json();
            return data.result;
        } catch (e) {
            console.error(`Redis Exception [${command[0]}]:`, e);
            return null;
        }
    }

    async get(key: string): Promise<any> {
        const result = await this.runCommand(["GET", key]);
        if (result) {
            try {
                return JSON.parse(result);
            } catch {
                return result;
            }
        }
        return null;
    }

    async set(key: string, value: any, options?: { ex: number }): Promise<void> {
        const cmd = ["SET", key, JSON.stringify(value)];
        if (options?.ex) {
            cmd.push("EX", options.ex.toString());
        }
        await this.runCommand(cmd);
    }

    async del(key: string): Promise<void> {
        await this.runCommand(["DEL", key]);
    }
}

// function getRedis(env: Env) {
//     return new SimpleRedis(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN);
// }


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
                await handleContactShare(update.message, env, supabase, config);
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
            await handleStart(chatId, userId, username, env, supabase, config, param);
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

    // [FIX] Use Supabase 'last_name' column as a hack for state persistance since Redis is failing
    // and 'bot_state' column is missing.
    // 'user' variable is already fetched above.
    let userState: any = null;
    try {
        if (user?.last_name && user.last_name.startsWith('{')) {
            userState = JSON.parse(user.last_name);
        }
    } catch (e) {
        console.error('State parse error:', e);
    }

    console.log(`[DEBUG_STATE] Raw last_name for ${userId}:`, user?.last_name);
    console.log(`[DEBUG_STATE] Parsed userState:`, JSON.stringify(userState));

    // [FIX] Allow breaking out of flows with commands or menu buttons
    const isGlobalCommand = text.startsWith('/') ||
        ['💰 Balance', '💳 Deposit', '💸 Withdraw', '📜 Transactions', '📊 My Stats', '📘 Instructions', '📞 Support', '🎁 Referral', '🎁 Daily Bonus', '🏆 Tournaments', '🎉 Events'].includes(text);

    // Check if user is in a conversation flow
    if (userState) {
        if (isGlobalCommand) {
            console.log(`User ${userId} broke out of flow via command`);
            // Clear state in DB (Hack: last_name)
            await supabase.from('users').update({ last_name: null }).eq('telegram_id', userId);
            // Fall through to switch statement below
        } else {
            await handleUserInput(chatId, userId, text, userState, env, supabase, config);
            return;
        }
    }

    // Handle commands
    // Handle /start explicitly first to capture params even for registered users (logging them in again)
    if (text.startsWith('/start')) {
        await handleStart(chatId, userId, username, env, supabase, config);
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
                if (state) {
                    const { error: updateError } = await supabase.from('users').update({ last_name: JSON.stringify(state) }).eq('telegram_id', userId);
                    console.log('[DEBUG_STATE] Set Deposit State result:', updateError || 'Success');
                }
            }
            break;

        case '/withdraw':
        case '💸 Withdraw':
            {
                const flowManager = new FlowManager();
                const state = await flowManager.startFlow({
                    chatId, userId, text, userState: null, env, config, supabase
                }, 'withdrawal');
                if (state) {
                    const { error: updateError } = await supabase.from('users').update({ last_name: JSON.stringify(state) }).eq('telegram_id', userId);
                    console.log('[DEBUG_STATE] Set Withdraw State result:', updateError || 'Success');
                }
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
            await supabase.from('users').update({ last_name: JSON.stringify(newState) }).eq('telegram_id', userId);
        } else {
            // Flow complete or cancelled
            await supabase.from('users').update({ last_name: null }).eq('telegram_id', userId);
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

        await supabase.from('users').update({ last_name: JSON.stringify({ action: 'deposit_bank', data: { amount } }) }).eq('telegram_id', userId);
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
            await supabase.from('users').update({ last_name: null }).eq('telegram_id', userId);
            return;
        }

        if (!insertedPayment.id) {
            console.error('[CRITICAL] Payment inserted but ID is missing:', insertedPayment);
        }

        await supabase.from('users').update({ last_name: null }).eq('telegram_id', userId);

        await sendMessage(chatId, config.botFlows?.deposit?.pending_message || '✅ Deposit Request Created!', env, getMainKeyboard(userId, config));

        // Get user info for admin notification
        const { data: user } = await supabase
            .from('users')
            .select('username, phone_number')
            .eq('telegram_id', userId)
            .single();

        // Notify all admins
        const adminMessages: Record<string, number> = {};
        console.log('Target Admin IDs:', config.adminIds);
        for (const adminId of config.adminIds) {
            console.log(`Sending Deposit Notification to: ${adminId}`);
            const res = await sendMessage(
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
            if (res && (res as any).result && (res as any).result.message_id) {
                adminMessages[adminId] = (res as any).result.message_id;
            }
        }
        // Save captured message IDs for sync
        if (insertedPayment.id && Object.keys(adminMessages).length > 0) {
            await supabase.from('payment_requests').update({ admin_messages: adminMessages }).eq('id', insertedPayment.id);
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
            await supabase.from('users').update({ last_name: null }).eq('telegram_id', userId);
            return;
        }

        if (amount > config.limits.maxWithdrawal) {
            await sendMessage(
                chatId,
                (config.botFlows?.withdrawal?.max_error || 'Max withdrawal is {max}').replace('{max}', config.limits.maxWithdrawal.toString()),
                env
            );
            await supabase.from('users').update({ last_name: null }).eq('telegram_id', userId);
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
            await supabase.from('users').update({ last_name: null }).eq('telegram_id', userId);
            return;
        }

        await supabase.from('users').update({ last_name: JSON.stringify({ action: 'withdraw_bank', data: { amount } }) }).eq('telegram_id', userId);
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
                    await supabase.from('users').update({ last_name: null }).eq('telegram_id', userId);
                    return;
                }

                await supabase.from('users').update({ last_name: null }).eq('telegram_id', userId);

                await sendMessage(chatId, config.botFlows?.withdrawal?.pending_message || '✅ Withdrawal Request Created!', env, getMainKeyboard(userId, config));

                // Get user info for admin notification
                const { data: user } = await supabase
                    .from('users')
                    .select('username, phone_number')
                    .eq('telegram_id', userId)
                    .single();

                // Notify all admins
                // Notify all admins
                const methodName = config.methods[method as string]?.name || method;
                const adminMessages: Record<string, number> = {};
                console.log('Target Admin IDs (Withdrawal):', config.adminIds);
                for (const adminId of config.adminIds) {
                    console.log(`Sending Withdrawal Notification to: ${adminId}`);
                    const res = await sendMessage(
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
                    if (res && (res as any).result && (res as any).result.message_id) {
                        adminMessages[adminId] = (res as any).result.message_id;
                    }
                }
                // Save captured message IDs for sync
                if (insertedPayment.id && Object.keys(adminMessages).length > 0) {
                    await supabase.from('payment_requests').update({ admin_messages: adminMessages }).eq('id', insertedPayment.id);
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

    // Fetch state from DB (Hack: last_name)
    const { data: user } = await supabase.from('users').select('last_name').eq('telegram_id', userId).maybeSingle();
    let state: any = null;
    try {
        if (user?.last_name && user.last_name.startsWith('{')) {
            state = JSON.parse(user.last_name);
        }
    } catch (e) { }

    switch (action) {
        case 'deposit_bank':
        case 'withdraw_bank':
            const method = params[0];
            // Uses 'state' fetched above

            if (state && (state.action === 'deposit_bank' || state.action === 'withdraw_bank')) {
                const amount = state.data.amount;

                // If deposit, show instructions
                if (action === 'deposit_bank') {
                    // Need config-aware helper
                    const methodConfig = config.methods[method];
                    if (methodConfig) {
                        const instruction = methodConfig.instructions['am'].replace('{amount}', amount.toString());
                        const footer = config.prompts?.depositInstructionFooter || '';
                        const msg = instruction + footer;
                        await sendMessage(chatId, msg, env);
                        await supabase.from('users').update({ last_name: JSON.stringify({ action: 'deposit_message', data: { amount, method } }) }).eq('telegram_id', userId);
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
                    await supabase.from('users').update({ last_name: JSON.stringify({ action: 'withdraw_account', data: { amount, method } }) }).eq('telegram_id', userId);
                }
            }
            break;

        case 'admin':
            const subAction = params[0]; // 'approve' or 'decline'
            const refCode = params[1];

            console.log('Admin Action:', { subAction, refCode });

            if (config.adminIds.includes(userId)) {
                if (subAction === 'approve') {
                    await handleApprovePayment(chatId, refCode, env, supabase, config);
                } else if (subAction === 'decline' || subAction === 'reject') {
                    await handleRejectPayment(chatId, refCode, env, supabase, config);
                }
            } else {
                await sendMessage(chatId, '❌ You are not authorized.', env);
            }
            break;

        case 'approve':
            console.log('Legacy Approve callback:', { userId, adminIds: config.adminIds, paymentId: params[0] });
            if (config.adminIds.includes(userId)) {
                const paymentId = params[0];
                await handleApprovePayment(chatId, paymentId, env, supabase, config);
            }
            break;

        case 'bank_select': // NEW FlowManager callback
            const bankKey = params[0];
            const currentState = state; // alias
            if (currentState && currentState.flow) {
                // Update state with bank selection
                currentState.data.bank = bankKey;
                currentState.stepIndex = (currentState.stepIndex || 0) + 1; // Manually advance since this is a callback, not text input

                // Trigger next step via FlowManager
                const flowManager = new FlowManager();
                // Temporary Fix: Manually advance.
                const sequence = flowManager.getSequence(config, currentState.flow!);
                if (currentState.stepIndex < sequence.length) {
                    const nextStep = sequence[currentState.stepIndex];
                    // We need context to send prompt
                    await flowManager.sendPrompt({
                        chatId, userId, text: '', userState: currentState, env, config, supabase: null
                    }, nextStep, currentState.flow!);

                    await supabase.from('users').update({ last_name: JSON.stringify(currentState) }).eq('telegram_id', userId);
                } else {
                    await flowManager.finalize({
                        chatId, userId, text: '', userState: currentState, env, config, supabase: null
                    }, currentState.flow!, currentState.data);
                    await supabase.from('users').update({ last_name: null }).eq('telegram_id', userId);
                }
            }
            break;

        default:
            // Fallback to specialized handlers for tournament/event callbacks
            console.log('Delegating for action:', action);
            if (data.startsWith('join_tournament:') || data.startsWith('tournament_leaderboard:')) {
                await handleTournamentCallbacks(data, chatId, userId, callbackQuery.id, env, supabase);
            } else if (data === 'refresh_events') {
                await handleEvents(chatId, userId, env, supabase);
            }
            break;
    }
}

async function showBankSelection(chatId: number, type: 'deposit' | 'withdraw', env: Env, config: any) {
    const message = type === 'deposit'
        ? config.botFlows?.deposit?.prompt_bank || '🏦 Select Bank:'
        : config.botFlows?.withdrawal?.prompt_bank || '🏦 Select Bank:';

    // Source of truth is now config.methods (merged by configService)
    const banks = Object.keys(config.methods)
        .filter(key => config.methods[key].enabled) // CRITICAL: Filter enabled only
        .map(key => ({
            text: `🏦 ${config.methods[key].name}`,
            callback_data: `${type}_bank:${key}`
        }));

    if (banks.length === 0) {
        await sendMessage(chatId, '❌ No payment methods currently available.', env);
        return;
    }

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

    const inviteLink = `https://t.me/bingoo_online_bot?start=${userId}`;
    const baseMessage = config.botFlows?.referral?.share_message || '🔗 Invite your friends to Online Bingo and earn rewards!\n\n🎁 {link}';
    const message = baseMessage.replace('{link}', inviteLink).replace('{userId}', userId.toString());

    await sendMessage(chatId, message, env, {
        inline_keyboard: [[
            { text: '📤 Share Link', url: `https://t.me/share/url?url=${encodeURIComponent(inviteLink)}&text=${encodeURIComponent('Join me on Online Bingo and earn rewards! 🎁')}` }
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
    await applyReferralRewards(userId, referrer.telegram_id, env, supabase, config);

    // Update referral tracking
    await supabase
        .from('users')
        .update({
            referred_by: referrer.telegram_id,
        })
        .eq('telegram_id', userId);
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
    // Try by ID first (legacy), then Reference Code
    let { data: payment } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('id', paymentId)
        .maybeSingle();

    if (!payment) {
        // Try as Reference Code
        const { data: payRef } = await supabase
            .from('payment_requests')
            .select('*')
            .eq('reference_code', paymentId)
            .maybeSingle();
        payment = payRef;
    }

    if (!payment) {
        await sendMessage(chatId, '❌ Payment not found', env);
        return;
    }

    // Check if already processed
    if (payment.status !== 'pending') {
        const statusIcon = payment.status === 'approved' ? '✅' : '❌';
        await sendMessage(chatId, `${statusIcon} Request already ${payment.status}!`, env);
        // Clean up this admin's message if it exists
        if (payment.admin_messages && payment.admin_messages[chatId]) {
            await deleteMessage(chatId, payment.admin_messages[chatId], env);
        }
        return;
    }

    await supabase
        .from('payment_requests')
        .update({ status: 'approved', processed_at: new Date().toISOString() })
        .eq('id', payment.id);

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

    // Sync: Clear messages for OTHER admins to prevent double-auth
    if (payment.admin_messages) {
        const adminMessages = payment.admin_messages as Record<string, number>;
        for (const [adminIdStr, msgId] of Object.entries(adminMessages)) {
            const adminId = parseInt(adminIdStr);
            // Delete for everyone EXCEPT the one who approved (keep context for them, or delete if desired)
            // User requested: "cleared from others chat imideatlly"
            if (adminId !== chatId) {
                await deleteMessage(adminId, msgId as number, env);
            }
        }
    }

    const message = payment.type === 'deposit'
        ? (config.prompts.depositApproved)
            .replace('{amount}', payment.amount.toString())
            .replace('{ref}', payment.reference_code)
        : (config.prompts.withdrawApproved)
            .replace('{amount}', payment.amount.toString())
            .replace('{ref}', payment.reference_code);

    await sendMessage(payment.user_id, message, env);

    // Broadcast balance update for real-time sync
    console.log(`Balance updated for user ${payment.user_id}: ${user?.balance}`);
}

async function handleRejectPayment(chatId: number, paymentId: string, env: Env, supabase: any, config: any) {
    let { data: payment } = await supabase
        .from('payment_requests')
        .select('*')
        .eq('id', paymentId)
        .maybeSingle();

    if (!payment) {
        const { data: payRef } = await supabase
            .from('payment_requests')
            .select('*')
            .eq('reference_code', paymentId)
            .maybeSingle();
        payment = payRef;
    }

    if (!payment) {
        await sendMessage(chatId, '❌ Payment not found', env);
        return;
    }

    // Check if already processed
    if (payment.status !== 'pending') {
        const statusIcon = payment.status === 'approved' ? '✅' : '❌';
        await sendMessage(chatId, `${statusIcon} Request already ${payment.status}!`, env);
        // Clean up this admin's message if it exists
        if (payment.admin_messages && payment.admin_messages[chatId]) {
            await deleteMessage(chatId, payment.admin_messages[chatId], env);
        }
        return;
    }

    await supabase
        .from('payment_requests')
        .update({ status: 'rejected', processed_at: new Date().toISOString() })
        .eq('id', payment.id);

    await sendMessage(chatId, `❌ Payment rejected: ${paymentId}`, env);

    // Sync: Clear messages for OTHER admins to prevent double-auth
    if (payment.admin_messages) {
        const adminMessages = payment.admin_messages as Record<string, number>;
        for (const [adminIdStr, msgId] of Object.entries(adminMessages)) {
            const adminId = parseInt(adminIdStr);
            // Delete for everyone EXCEPT the one who rejected (keep context or delete logic)
            if (adminId !== chatId) {
                await deleteMessage(adminId, msgId as number, env);
            }
        }
    }

    const { data: user } = await supabase
        .from('users')
        .select('balance')
        .eq('telegram_id', payment.user_id)
        .single();

    const message = payment.type === 'deposit'
        ? (config.prompts.depositDeclined).replace('{amount}', payment.amount.toString())
        : (config.prompts.withdrawDeclined)
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

async function handleStart(chatId: number, userId: number, username: string, env: Env, supabase: any, config: any, referrerParam?: string) {
    // [NEW] Check for Global Announcements
    const { data: activeConfig } = await supabase
        .from('game_configs')
        .select('features')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (activeConfig?.features?.announcement?.enabled) {
        const ann = activeConfig.features.announcement;
        const caption = `<b>${ann.title}</b>\n\n${ann.message}`;
        const markup = ann.action_url ? {
            inline_keyboard: [[{ text: ann.action_text || 'See More', url: ann.action_url }]]
        } : undefined;

        try {
            if (ann.image_url) {
                await sendPhoto(chatId, ann.image_url, caption, env, markup);
            } else {
                await sendMessage(chatId, caption, env, markup);
            }
        } catch (e) {
            console.error('Failed to send announcement:', e);
        }
    }

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
    const welcomeMsg = config.botFlows?.onboarding?.welcome_back || '🎮 <b>Welcome back to Ethiopian Bingo!</b>';
    const message =
        `${welcomeMsg}\n\n` +
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

async function handleContactShare(message: any, env: Env, supabase: any, config: any) {
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

    // [NEW] Apply referral rewards if this is a new registration from a referral link
    if (existingUser && !existingUser.is_registered && existingUser.referred_by) {
        console.log(`Applying referral reward for ${contact.user_id} (referred by ${existingUser.referred_by})`);
        try {
            await applyReferralRewards(contact.user_id, existingUser.referred_by, env, supabase, config);
        } catch (e) {
            console.error('Failed to apply referral rewards:', e);
        }
    }

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

async function applyReferralRewards(userId: number, referrerId: number, env: Env, supabase: any, config: any) {
    // Apply referral rewards
    await supabase.rpc('increment_balance', {
        user_telegram_id: userId,
        amount: config.referral.referredReward
    });

    await supabase.rpc('increment_balance', {
        user_telegram_id: referrerId,
        amount: config.referral.referrerReward
    });

    // Update referral tracking
    const { data: referrer } = await supabase.from('users').select('referral_count, referral_earnings').eq('telegram_id', referrerId).maybeSingle();

    if (referrer) {
        await supabase
            .from('users')
            .update({
                referral_count: (referrer.referral_count || 0) + 1,
                referral_earnings: (referrer.referral_earnings || 0) + config.referral.referrerReward
            })
            .eq('telegram_id', referrerId);
    }

    // Record referral
    await supabase
        .from('referrals')
        .insert({
            referrer_id: referrerId,
            referred_id: userId,
            reward_amount: config.referral.referrerReward,
            created_at: new Date().toISOString()
        });

    await sendMessage(
        userId,
        `✅ <b>Referral Applied!</b>\n\n` +
        `You received ${config.referral.referredReward} Birr bonus!\n` +
        `Your referrer received ${config.referral.referrerReward} Birr!`,
        env
    );

    await sendMessage(
        referrerId,
        `🎉 <b>New Referral!</b>\n\n` +
        `Someone used your code/link!\n` +
        `You earned ${config.referral.referrerReward} Birr! 💰`,
        env
    );
}
