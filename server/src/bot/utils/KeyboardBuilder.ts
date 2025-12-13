import { Markup } from 'telegraf';

/**
 * Builder pattern for creating inline keyboards
 * Provides fluent API for keyboard construction
 */
export class KeyboardBuilder {
    private buttons: any[][] = [];

    /**
     * Add a row of buttons
     */
    addRow(...buttons: any[]): this {
        this.buttons.push(buttons);
        return this;
    }

    /**
     * Add a single callback button
     */
    addButton(text: string, callbackData: string): this {
        this.buttons.push([
            Markup.button.callback(text, callbackData)
        ]);
        return this;
    }

    /**
     * Add a WebApp button (Mini App)
     */
    addWebAppButton(text: string, url: string): this {
        this.buttons.push([
            Markup.button.webApp(text, url)
        ]);
        return this;
    }

    /**
     * Add a URL button
     */
    addUrlButton(text: string, url: string): this {
        this.buttons.push([
            Markup.button.url(text, url)
        ]);
        return this;
    }

    /**
     * Add multiple buttons in a row
     */
    addButtonRow(buttons: Array<{ text: string; data: string }>): this {
        this.buttons.push(
            buttons.map(btn => Markup.button.callback(btn.text, btn.data))
        );
        return this;
    }

    /**
     * Build and return the keyboard markup
     */
    build() {
        return Markup.inlineKeyboard(this.buttons);
    }

    /**
     * Clear all buttons
     */
    clear(): this {
        this.buttons = [];
        return this;
    }

    /**
     * Create a keyboard for game mode selection
     */
    static gameModesKeyboard(): any {
        return new KeyboardBuilder()
            .addButtonRow([
                { text: '🎯 Ande Zeg (1 Line)', data: 'mode_and-zig' },
            ])
            .addButtonRow([
                { text: '🎯🎯 Hulet Zeg (2 Lines)', data: 'mode_hulet-zig' },
            ])
            .addButtonRow([
                { text: '🎯🎯🎯 Mulu Zeg (Full Card)', data: 'mode_mulu-zig' },
            ])
            .build();
    }

    /**
     * Create a keyboard for deposit amounts
     */
    static depositAmountsKeyboard(): any {
        return new KeyboardBuilder()
            .addButtonRow([
                { text: '50 Birr', data: 'deposit_50' },
                { text: '100 Birr', data: 'deposit_100' },
            ])
            .addButtonRow([
                { text: '500 Birr', data: 'deposit_500' },
                { text: '1000 Birr', data: 'deposit_1000' },
            ])
            .addButton('💳 Custom Amount', 'deposit_custom')
            .build();
    }

    /**
     * Create main menu keyboard
     */
    static mainMenuKeyboard(webAppUrl: string): any {
        return new KeyboardBuilder()
            .addWebAppButton('🎮 Play Game', webAppUrl)
            .addButtonRow([
                { text: '💰 Balance', data: 'balance' },
                { text: '📊 Stats', data: 'stats' },
            ])
            .addButtonRow([
                { text: '🎁 Daily Reward', data: 'daily' },
                { text: '👥 Refer Friends', data: 'refer' },
            ])
            .addButton('⚙️ Settings', 'settings')
            .build();
    }
}
