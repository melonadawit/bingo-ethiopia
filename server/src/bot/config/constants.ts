// Bot configuration constants
export const BOT_CONFIG = {
    // Rate limiting
    MAX_COMMANDS_PER_MINUTE: 20,
    MAX_NOTIFICATIONS_PER_SECOND: 30,

    // Cache TTL (milliseconds)
    USER_CACHE_TTL: 5 * 60 * 1000, // 5 minutes
    GAME_CACHE_TTL: 1 * 60 * 1000, // 1 minute

    // Message limits
    MAX_MESSAGE_LENGTH: 4096,
    MAX_CAPTION_LENGTH: 1024,

    // Timeouts
    COMMAND_TIMEOUT: 30000, // 30 seconds
    WEBHOOK_TIMEOUT: 60000, // 60 seconds
} as const;

// Command names
export const COMMANDS = {
    START: 'start',
    PLAY: 'play',
    BALANCE: 'balance',
    DEPOSIT: 'deposit',
    WITHDRAW: 'withdraw',
    HELP: 'help',
    DAILY: 'daily',
    STATS: 'stats',
    REFER: 'refer',
    SETTINGS: 'settings',
} as const;

// Callback data prefixes
export const CALLBACKS = {
    JOIN_GAME: 'join_',
    CHECK_BALANCE: 'balance',
    CLAIM_DAILY: 'claim_daily',
    VIEW_STATS: 'stats',
    DEPOSIT_AMOUNT: 'deposit_',
    GAME_MODE: 'mode_',
} as const;

// Emoji constants for consistent messaging
export const EMOJI = {
    GAME: '🎮',
    MONEY: '💰',
    WIN: '🏆',
    GIFT: '🎁',
    FIRE: '🔥',
    CHART: '📊',
    SETTINGS: '⚙️',
    HELP: '❓',
    CHECK: '✅',
    CROSS: '❌',
    WARNING: '⚠️',
    POINT_RIGHT: '👉',
    CELEBRATE: '🎉',
} as const;

// Error messages
export const ERROR_MESSAGES = {
    GENERIC: 'Something went wrong. Please try again later.',
    INSUFFICIENT_BALANCE: 'Not enough balance. Please deposit funds.',
    GAME_FULL: 'This game is full. Try another one.',
    USER_NOT_FOUND: 'User not found. Please use /start to register.',
    INVALID_AMOUNT: 'Invalid amount. Please enter a valid number.',
    RATE_LIMIT: 'Too many requests. Please wait a moment.',
    COMMAND_TIMEOUT: 'Command took too long to process. Please try again.',
} as const;
