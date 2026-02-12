
import { Env } from '../types';
import { BotConfig } from './config';
import { sendMessage, getMainKeyboard, generateRefCode } from './utils';

// Define the context available to a step handler
interface StepContext {
    chatId: number;
    userId: number;
    text: string;
    // We treat userState as opaque here, managed by caller or passed in
    userState: any;
    env: Env;
    config: BotConfig;
    supabase: any;
}

// Handler result tells the sequencer what to do next
interface StepResult {
    success: boolean;
    errorMsg?: string;
    data?: any; // Data to merge into userState
}

export class FlowManager {

    // VALIDATION HANDLERS
    private handlers: Record<string, (ctx: StepContext) => Promise<StepResult>> = {
        'amount': async (ctx) => {
            const amount = parseFloat(ctx.text);
            const { config, userState } = ctx;
            const flowType = userState.flow;
            const limits = config.limits;

            if (isNaN(amount) || amount <= 0) return { success: false, errorMsg: '❌ Invalid number.' };

            if (flowType === 'deposit') {
                if (amount < limits.minDeposit)
                    // return { success: false, errorMsg: config.botFlows?.deposit?.invalid_amount?.replace('{min}', limits.minDeposit.toString()) || `Min: ${limits.minDeposit}` };
                    return { success: false, errorMsg: `❌ Invalid Amount. Min: ${limits.minDeposit}` }; // Fallback, though config should have it
            } else if (flowType === 'withdrawal') {
                if (amount < limits.minWithdrawal)
                    return { success: false, errorMsg: config.prompts.withdrawMinError.replace('{min}', limits.minWithdrawal.toString()) };
                if (amount > limits.maxWithdrawal)
                    return { success: false, errorMsg: config.prompts.withdrawMaxError.replace('{max}', limits.maxWithdrawal.toString()) };

                // BALANCE CHECK
                try {
                    const { data: user, error } = await ctx.supabase
                        .from('users')
                        .select('balance')
                        .eq('telegram_id', ctx.userId)
                        .single();

                    if (error || !user) {
                        console.error('Balance check failed:', error);
                        return { success: false, errorMsg: '❌ System error checking balance. Please try again.' };
                    }

                    if (user.balance < amount) {
                        return {
                            success: false,
                            errorMsg: config.prompts.withdrawBalanceError
                                .replace('{balance}', user.balance.toString())
                                .replace('{amount}', amount.toString())
                        };
                    }
                } catch (err) {
                    console.error('Balance check exception:', err);
                    return { success: false, errorMsg: '❌ System error. Please try again.' };
                }
            }
            return { success: true, data: { amount } };
        },

        'bank': async (ctx) => {
            return { success: false, errorMsg: 'Please select a bank from the menu.' };
        },

        'phone': async (ctx) => {
            if (ctx.text.length < 9) return { success: false, errorMsg: '❌ Invalid phone number.' };
            return { success: true, data: { phone: ctx.text, account: ctx.text } };
        },

        'account': async (ctx) => {
            const { userState } = ctx;
            const bank = userState.data.bank || '';
            const isMobile = bank.toLowerCase().includes('telebirr') ||
                bank.toLowerCase().includes('m-pesa') ||
                bank.toLowerCase().includes('cbe birr');

            if (isMobile) {
                if (ctx.text.length < 9) return { success: false, errorMsg: '❌ Invalid phone number format.' };
                return { success: true, data: { phone: ctx.text, account: ctx.text } };
            }

            if (ctx.text.length < 5) return { success: false, errorMsg: '❌ Invalid account number.' };
            return { success: true, data: { account: ctx.text } };
        },

        'receipt': async (ctx) => {
            return { success: true, data: { receipt: ctx.text } };
        }
    };

    // START A NEW FLOW
    async startFlow(ctx: StepContext, flowType: 'deposit' | 'withdrawal'): Promise<any> {
        const sequence = this.getSequence(ctx.config, flowType);
        if (sequence.length === 0) return null;

        const firstStep = sequence[0];
        const newState = {
            flow: flowType,
            stepIndex: 0,
            data: {}
        };
        await this.sendPrompt(ctx, firstStep, flowType);
        return newState;
    }

    // HANDLE INPUT FOR EXISTING FLOW
    async handleInput(ctx: StepContext): Promise<any> {
        const { userState, config } = ctx;
        const sequence = this.getSequence(config, userState.flow);
        if (!sequence || userState.stepIndex >= sequence.length) return null;

        const currentStepId = sequence[userState.stepIndex];
        const handler = this.handlers[currentStepId];

        if (handler) {
            const result = await handler(ctx);
            if (!result.success) {
                await sendMessage(ctx.chatId, result.errorMsg || 'Invalid input', ctx.env);
                return userState;
            }
            userState.data = { ...userState.data, ...result.data };
        } else {
            userState.data = { ...userState.data, [currentStepId]: ctx.text };
        }

        const nextIndex = userState.stepIndex + 1;
        if (nextIndex < sequence.length) {
            const nextStepId = sequence[nextIndex];
            userState.stepIndex = nextIndex;
            await this.sendPrompt(ctx, nextStepId, userState.flow);
            return userState;
        } else {
            await this.finalize(ctx, userState.flow, userState.data);
            return null;
        }
    }

    // HELPER: Send Prompt
    async sendPrompt(ctx: StepContext, stepId: string, flowType: string) {
        const { chatId, config, env, userState } = ctx;

        if (stepId === 'bank') {
            await this.sendBankSelection(ctx, flowType);
            return;
        }

        if (stepId === 'receipt' && userState?.data?.bank) {
            const methodKey = userState.data.bank;
            const method = config.methods[methodKey];
            const amount = userState.data.amount || 0;
            if (method) {
                // Safely get instructions, fallback to a basic message if missing
                const rawInstruction = method.instructions?.['am'] || method.instructions?.['en'] || 'የባንክ መረጃ አልተገኘም። እባክዎን ሰፖርት ያግኙ።';
                const instruction = rawInstruction.replace('{amount}', amount.toString());
                await sendMessage(chatId, instruction, env);
            }
            return;
        }

        const promptText = this.getPromptText(config, flowType, stepId, userState);
        if (promptText) {
            await sendMessage(chatId, promptText, env);
        }
    }

    // HELPER: Get Sequence
    getSequence(config: BotConfig, type: string): string[] {
        if (type === 'deposit') return config.flowSequences?.deposit || ['amount', 'bank', 'receipt'];
        if (type === 'withdrawal') return config.flowSequences?.withdrawal || ['amount', 'bank', 'account'];
        return [];
    }

    // HELPER: Get Prompt Text
    getPromptText(config: BotConfig, flow: string, step: string, userState?: any): string | null {
        const flows = config.botFlows;
        if (!flows) return `Please enter ${step}`;

        if (flow === 'deposit') {
            if (step === 'amount') return flows.deposit.prompt_amount;
        }

        if (flow === 'withdrawal') {
            if (step === 'amount') return flows.withdrawal.prompt_amount;

            if (step === 'account') {
                const bank = userState?.data?.bank?.toLowerCase() || '';
                const isMobile = bank.includes('telebirr') || bank.includes('m-pesa') || bank.includes('cbe birr');
                return isMobile ? flows.withdrawal.prompt_phone : flows.withdrawal.prompt_account;
            }
        }

        return `Please enter ${step}`;
    }

    // HELPER: Bank Selection
    async sendBankSelection(ctx: StepContext, flowType: string) {
        const config = ctx.config;
        const banks = Object.keys(config.methods)
            .filter(key => config.methods[key].enabled) // [FIX] Filter enabled only
            .map(key => ({
                text: `🏦 ${config.methods[key].name}`,
                callback_data: `bank_select:${key}`
            }));

        const keyboard = [];
        for (let i = 0; i < banks.length; i += 2) {
            keyboard.push(banks.slice(i, i + 2));
        }

        const prompt = flowType === 'deposit' ? config.prompts.selectDepositBank : config.prompts.selectWithdrawBank;

        await sendMessage(ctx.chatId, prompt || 'Select Bank', ctx.env, {
            inline_keyboard: keyboard
        });
    }

    // FINALIZE
    async finalize(ctx: StepContext, flow: string, data: any) {
        if (flow === 'deposit') {
            await this.createDeposit(ctx, data);
        } else if (flow === 'withdrawal') {
            await this.createWithdrawal(ctx, data);
        }
    }

    async createDeposit(ctx: StepContext, data: any) {
        const { supabase, userId, env, config, chatId } = ctx;
        const refCode = generateRefCode('DEP');
        const amount = parseFloat(data.amount);

        const { data: payment, error } = await supabase.from('payment_requests').insert({
            user_id: userId,
            type: 'deposit',
            amount: amount,
            status: 'pending',
            reference_code: refCode,
            screenshot_url: data.receipt || 'Text Receipt',
            payment_method: data.bank // Map bank to payment_method
        }).select().single();

        if (!error) {
            await sendMessage(chatId, config.prompts.depositPending, env, getMainKeyboard(userId, config));

            // NOTIFY ADMIN
            await this.notifyAdmin(ctx, 'deposit', {
                amount: amount,
                bank: data.bank,
                ref: refCode,
                user: ctx.userState?.username || userId,
                receipt: data.receipt
            });
        } else {
            console.error('Deposit DB Error:', error);
            // DEBUG: Show actual error to user
            await sendMessage(chatId, `❌ System Error: ${error.message || JSON.stringify(error)}`, env);
        }
    }

    async createWithdrawal(ctx: StepContext, data: any) {
        const { supabase, userId, env, config, chatId } = ctx;
        const refCode = generateRefCode('WTH');
        const amount = parseFloat(data.amount);
        const bank = data.bank || 'Unknown';
        const account = data.account || data.phone || 'Unknown';

        // 1. Insert into DB (Pending)
        const { data: payment, error } = await supabase.from('payment_requests').insert({
            user_id: userId,
            type: 'withdraw',
            amount: amount,
            status: 'pending',
            reference_code: refCode,
            payment_method: bank,
            bank_account_number: account,
            telebirr_phone: data.phone || null // Ensure null if undefined
        }).select().single();

        if (!error) {
            // 2. Notify User 
            await sendMessage(chatId, config.prompts.withdrawPending, env, getMainKeyboard(userId, config));

            // 3. NOTIFY ADMIN
            await this.notifyAdmin(ctx, 'withdraw', {
                amount: amount,
                bank: bank,
                account: account,
                ref: refCode,
                user: ctx.userState?.username || userId
            });

        } else {
            console.error('Withdrawal DB Error:', error);
            // DEBUG: Show actual error to user
            await sendMessage(chatId, `❌ System Error: ${error.message || JSON.stringify(error)}`, env);
        }
    }

    // HELPER: Notify Admin
    async notifyAdmin(ctx: StepContext, type: 'deposit' | 'withdraw', info: any) {
        const { env, config } = ctx;
        // Use Env var OR Config Admin IDs
        const adminIds: (number | string)[] = [];

        if (env.TELEGRAM_ADMIN_CHAT_ID) adminIds.push(env.TELEGRAM_ADMIN_CHAT_ID);

        if (config.adminIds && Array.isArray(config.adminIds)) {
            config.adminIds.forEach(id => {
                if (!adminIds.includes(id)) adminIds.push(id);
            });
        }

        if (adminIds.length === 0) {
            console.warn('⚠️ No Admin IDs found. Notification skipped.');
            return;
        }

        const emoji = type === 'deposit' ? '💰' : '💸';
        const title = type === 'deposit' ? 'NEW DEPOSIT' : 'NEW WITHDRAWAL';

        let message = `<b>${emoji} ${title} ALERT</b>\n\n`;
        message += `👤 <b>User:</b> ${info.user}\n`;
        message += `💵 <b>Amount:</b> ${info.amount} ETB\n`;
        message += `🏦 <b>Bank:</b> ${info.bank}\n`;
        message += `🔖 <b>Ref:</b> <code>${info.ref}</code>\n`;

        if (type === 'withdraw') {
            message += `🔢 <b>Account:</b> <code>${info.account}</code>\n`;
        }

        // Add Approve/Decline Buttons (Callback Data)
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '✅ Approve', callback_data: `admin:approve:${info.ref}` },
                    { text: '❌ Decline', callback_data: `admin:decline:${info.ref}` }
                ]
            ]
        };

        // Send to ALL admins
        for (const adminId of adminIds) {
            try {
                // If deposit has a receipt image, send photo
                if (type === 'deposit' && info.receipt && info.receipt.startsWith('http')) {
                    await import('./utils').then(u => u.sendPhoto(Number(adminId), info.receipt, message, env, keyboard));
                } else if (type === 'deposit' && info.receipt) {
                    await sendMessage(Number(adminId), message + `\n📄 <b>Receipt:</b> ${info.receipt}`, env, keyboard);
                } else {
                    await sendMessage(Number(adminId), message, env, keyboard);
                }
            } catch (err) {
                console.error(`Failed to notify admin ${adminId}:`, err);
            }
        }
    }
}
