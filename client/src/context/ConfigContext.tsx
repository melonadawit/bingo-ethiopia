import React, { createContext, useContext, useEffect, useState } from 'react';

// Define the shape of our config
export interface GameConfig {
    version: string;
    is_active: boolean;
    rules: {
        ande_zig: { timer: number; entry_fee: number; };
        hulet_zig: { timer: number; entry_fee: number; };
        mulu_zig: { timer: number; entry_fee: number; };
    };
    features: {
        chat_enabled: boolean;
        maintenance_mode?: boolean;
        signup_enabled?: boolean;
        // Global Pop-up Announcement
        announcement?: {
            enabled: boolean;
            id: string; // UUID to track seen state
            title: string;
            message: string;
            image_url?: string;
            action_url?: string;
            action_text?: string;
        };
        // Small banner
        global_announcement?: string;
    };
}

const DEFAULT_CONFIG: GameConfig = {
    version: 'v0.0.0',
    is_active: true,
    rules: {
        ande_zig: { timer: 30, entry_fee: 10 },
        hulet_zig: { timer: 45, entry_fee: 20 },
        mulu_zig: { timer: 60, entry_fee: 50 }
    },
    features: {
        chat_enabled: false,
        maintenance_mode: false,
        signup_enabled: true
    }
};

interface ConfigContextType {
    config: GameConfig;
    isLoading: boolean;
    refreshConfig: () => Promise<void>;
}

const ConfigContext = createContext<ConfigContextType>({
    config: DEFAULT_CONFIG,
    isLoading: true,
    refreshConfig: async () => { }
});

export const useConfig = () => useContext(ConfigContext);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<GameConfig>(DEFAULT_CONFIG);
    const [isLoading, setIsLoading] = useState(true);

    const refreshConfig = async () => {
        try {
            // Adjust API_URL as needed, using absolute path if client is on different domain
            // Assuming proxy or VITE_API_URL
            const API_URL = import.meta.env.VITE_API_URL || 'https://bingo-api.melonadawit71.workers.dev';
            const res = await fetch(`${API_URL}/config/latest?t=${Date.now()}`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                if (data && data.version) {
                    setConfig(data);
                }
            }
        } catch (e) {
            console.error('Failed to fetch config:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshConfig();
        // Poll every 2 minutes
        const interval = setInterval(refreshConfig, 120000);
        return () => clearInterval(interval);
    }, []);

    return (
        <ConfigContext.Provider value={{ config, isLoading, refreshConfig }}>
            {children}
        </ConfigContext.Provider>
    );
};
