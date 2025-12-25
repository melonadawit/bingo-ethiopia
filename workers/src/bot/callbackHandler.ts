// Handle callback queries from inline buttons
async function handleCallbackQuery(callbackQuery: any, env: Env, supabase: any) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;
    const messageId = callbackQuery.message.message_id;

    console.log('Callback query received:', { data, chatId });

    // Answer the callback query to remove loading state
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQuery.id })
    });

    // Parse callback data
    if (data.startsWith('approve_')) {
        const paymentId = data.replace('approve_', '');
        await handleApprovePayment(chatId, paymentId, env, supabase);

        // Edit the message to remove buttons
        await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/editMessageReplyMarkup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                reply_markup: { inline_keyboard: [] }
            })
        });
    } else if (data.startsWith('decline_')) {
        const paymentId = data.replace('decline_', '');
        await handleRejectPayment(chatId, paymentId, env, supabase);

        // Edit the message to remove buttons
        await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/editMessageReplyMarkup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                reply_markup: { inline_keyboard: [] }
            })
        });
    }
}
