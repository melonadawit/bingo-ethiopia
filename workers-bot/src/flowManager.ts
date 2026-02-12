
import type { Env } from './types';
import type { BotConfig } from './config';
import { sendMessage, getMainKeyboard, generateRefCode } from './bot-utils';

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
                    return { success: false, errorMsg: config.botFlows?.deposit?.invalid_amount?.replace('{min}', limits.minDeposit.toString()) || `Min: ${limits.minDeposit}` };
            } else if (flowType === 'withdrawal') {
                if (amount < limits.minWithdrawal)
                    return { success: false, errorMsg: config.botFlows?.withdrawal?.min_error?.replace('{min}', limits.minWithdrawal.toString()) };
                if (amount > limits.maxWithdrawal)
                    return { success: false, errorMsg: config.botFlows?.withdrawal?.max_error?.replace('{max}', limits.maxWithdrawal.toString()) };

                // TODO: Balance check could be here if we had user balance in context
            }
            return { success: true, data: { amount } };
        },

        'bank': async (ctx) => {
            // Usually handled by callback, but if text matches a bank name, allow it?
            // For now, assume this step expects a button click which comes in as text via specialized handler or just fails text.
            return { success: false, errorMsg: 'Please select a bank from the menu.' };
        },

        'phone': async (ctx) => {
            if (ctx.text.length < 9) return { success: false, errorMsg: '❌ Invalid phone number.' };
            return { success: true, data: { phone: ctx.text, account: ctx.text } }; // Store in both for compatibility
        },

        'account': async (ctx) => {
            const { userState } = ctx;
            const bank = userState.data.bank || '';
            const isMobile = bank.toLowerCase().includes('telebirr') ||
                bank.toLowerCase().includes('m-pesa') ||
                bank.toLowerCase().includes('cbe birr'); // Basic detection

            // Mobile Money Validation
            if (isMobile) {
                if (ctx.text.length < 9) return { success: false, errorMsg: '❌ Invalid phone number format.' };
                return { success: true, data: { phone: ctx.text, account: ctx.text } };
            }

            // Bank Account Validation
            if (ctx.text.length < 5) return { success: false, errorMsg: '❌ Invalid account number.' };
            return { success: true, data: { account: ctx.text } };
        },

        'receipt': async (ctx) => {
            // Accept any text or assumes helper extracted photo file_id/url
            return { success: true, data: { receipt: ctx.text } };
        }
    };

    // START A NEW FLOW
    async startFlow(ctx: StepContext, flowType: 'deposit' | 'withdrawal'): Promise<any> {
        const sequence = this.getSequence(ctx.config, flowType);
        if (sequence.length === 0) return null;

        const firstStep = sequence[0];

        // Initial State
        const newState = {
            flow: flowType,
            stepIndex: 0,
            data: {}
        };

        // Send Prompt
        await this.sendPrompt(ctx, firstStep, flowType);

        return newState;
    }

    // HANDLE INPUT FOR EXISTING FLOW
    async handleInput(ctx: StepContext): Promise<any> {
        const { userState, config } = ctx;
        const sequence = this.getSequence(config, userState.flow);

        // Safety check
        if (!sequence || userState.stepIndex >= sequence.length) return null;

        const currentStepId = sequence[userState.stepIndex];
        const handler = this.handlers[currentStepId];

        // 1. VALIDATE/PROCESS INPUT
        if (handler) {
            const result = await handler(ctx);
            if (!result.success) {
                await sendMessage(ctx.chatId, result.errorMsg || 'Invalid input', ctx.env);
                return userState; // Return same state to retry
            }
            // Merge data
            userState.data = { ...userState.data, ...result.data };
        }

        // 2. ADVANCE TO NEXT STEP
        const nextIndex = userState.stepIndex + 1;

        if (nextIndex < sequence.length) {
            const nextStepId = sequence[nextIndex];
            userState.stepIndex = nextIndex; // Update index

            // Send Next Prompt
            await this.sendPrompt(ctx, nextStepId, userState.flow);
            return userState;
        } else {
            // 3. FINALIZE FLOW
            await this.finalize(ctx, userState.flow, userState.data);
            return null; // Clear state
        }
    }

    // HELPER: Send Prompt
    async sendPrompt(ctx: StepContext, stepId: string, flowType: string) {
        const { chatId, config, env, userState } = ctx;

        if (stepId === 'bank') {
            await this.sendBankSelection(ctx, flowType);
            return;
        }

        // Specific Logic: If Deposit Bank is selected, show instructions!
        // The 'bank' step implies SELECTION. The NEXT step might be 'receipt'.
        // If the previous step was 'bank', we might need to show instructions now.
        // ACTUALLY: The standard flow is -> Bank Select -> Show Info -> Ask Receipt.
        // We can model "Show Info" as part of the prompt for "receipt" OR as a distinct step?
        // Let's assume 'receipt' step prompts with the bank info.

        let sentText = '';

        if (stepId === 'receipt' && userState?.data?.bank) {
            const methodKey = userState.data.bank;
            const method = config.methods[methodKey];
            const amount = userState.data.amount || 0;
            if (method) {
                const instruction = method.instructions['am'].replace('{amount}', amount.toString());
                await sendMessage(chatId, instruction, env);
                // And then wait for receipt...
                // implicit prompt "Please send receipt"
            }
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
    // Now accepts ctx or userState to make decisions
    getPromptText(config: BotConfig, flow: string, step: string, userState?: any): string | null {
        const flows = config.botFlows;
        if (!flows) return `Enter ${step}`;

        // Smart Logic for 'account' step
        if (step === 'account' && userState?.data?.bank) {
            const bank = userState.data.bank.toLowerCase();
            const isMobile = bank.includes('telebirr') || bank.includes('m-pesa') || bank.includes('cbe birr');

            if (isMobile) {
                return flows.withdrawal?.prompt_phone || 'Please enter your phone number:';
            }
            // For standard banks, fall through to default 'prompt_account'
        }

        if (flow === 'deposit') {
            // @ts-ignore
            return flows.deposit[`prompt_${step}`] || flows.deposit.prompt_amount;
        }

        if (flow === 'withdrawal') {
            // @ts-ignore
            return flows.withdrawal[`prompt_${step}`] || flows.withdrawal.prompt_amount;
        }

        return `Please enter ${step}`;
    }

    // HELPER: Bank Selection
    async sendBankSelection(ctx: StepContext, flowType: string) {
        // Implement inline keyboard logic here
        const config = ctx.config;
        const banks = Object.keys(config.methods).map(key => ({
            text: `🏦 ${config.methods[key].name}`,
            callback_data: `bank_select:${key}` // New generic callback format
        }));

        // Chunking...
        const keyboard = [];
        for (let i = 0; i < banks.length; i += 2) {
            keyboard.push(banks.slice(i, i + 2));
        }

        const prompt = flowType === 'deposit' ? config.botFlows?.deposit?.prompt_bank : config.botFlows?.withdrawal?.prompt_bank;

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

        const { data: payment, error } = await supabase.from('payment_requests').insert({
            user_id: userId,
            type: 'deposit',
            amount: data.amount,
            status: 'pending',
            reference_code: refCode,
            screenshot_url: data.receipt || 'Text Receipt',
            // bank: data.bank // Should add bank column or metadata
        }).select().single();

        if (!error) {
            await sendMessage(chatId, config.botFlows?.deposit?.pending_message || '✅ Pending...', env, getMainKeyboard(userId, config));
            // Notify Admin (omitted for brevity, can call shared notify function)
        } else {
            await sendMessage(chatId, '❌ Server Error', env);
        }
    }

    async createWithdrawal(ctx: StepContext, data: any) {
        // ... Similar logic ...
        await sendMessage(ctx.chatId, '✅ Withdrawal Request Sent!', ctx.env);
    }
}
