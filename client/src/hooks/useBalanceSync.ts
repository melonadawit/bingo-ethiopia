import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { gameSocket } from '../services/socket';

export function useBalanceSync() {
    // Robustly get Telegram ID from multiple potential sources
    const getTelegramId = () => {
        const storedId = localStorage.getItem('telegram_id');
        if (storedId) return storedId;

        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser);
                return parsed.telegram_id || parsed.id;
            } catch (e) {
                return null;
            }
        }
        return null;
    };

    const telegramId = getTelegramId();
    const queryClient = useQueryClient();

    // Poll balance every 10 seconds (backup)
    const { data: user } = useQuery({
        queryKey: ['user', telegramId],
        queryFn: async () => {
            if (!telegramId) return null;
            // Handle both integer and string IDs by trying to cast to int if possible, 
            // but the API endpoint /auth/user/:id likely handles what we pass.
            // If telegramId is 12345 (string), we pass it.
            const res = await api.get(`/auth/user/${telegramId}`);
            return res.data.user;
        },
        enabled: !!telegramId,
        refetchInterval: 10000, // 10 seconds
        staleTime: 5000
    });

    // Listen for real-time balance updates
    useEffect(() => {
        if (!telegramId) {
            console.warn('[BalanceSync] No Telegram ID found, socket listener skipped');
            return;
        }

        console.log('[BalanceSync] Initializing listener for ID:', telegramId);

        const handleBalanceUpdate = (data: any) => {
            console.log('💰 Real-time balance update received:', data);

            // Update React Query cache immediately
            queryClient.setQueryData(['user', telegramId], (oldData: any) => {
                if (!oldData) {
                    console.log('[BalanceSync] No old data in cache, creating new entry');
                    //If no cache, we might not have the full user object, 
                    //but we can't create a fake one easily without potentially breaking types.
                    //However, forcing a refetch is safer if no data exists.
                    queryClient.invalidateQueries({ queryKey: ['user', telegramId] });
                    return oldData;
                }

                console.log('[BalanceSync] Updating cache with new balance:', data.balance);
                return {
                    ...oldData,
                    balance: data.balance
                };
            });

            // Force refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: ['user', telegramId] });
        };

        gameSocket.on('balance_update', handleBalanceUpdate);

        return () => {
            gameSocket.off('balance_update', handleBalanceUpdate);
        };
    }, [telegramId, queryClient]);

    return user;
}
