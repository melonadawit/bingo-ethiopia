// Native WebSocket client for Cloudflare Durable Objects
// Replaces Socket.IO with direct WebSocket connection

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';

export class GameWebSocket {
    private ws: WebSocket | null = null;
    private gameId: string | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private eventHandlers: Map<string, Set<Function>> = new Map();
    public connected = false;

    connect(gameId?: string) {
        if (gameId) {
            this.gameId = gameId;
        }

        if (!this.gameId) {
            console.error('Cannot connect: no gameId provided');
            return;
        }

        const wsUrl = `${WS_URL}/ws/game/${this.gameId}`;

        console.log('Connecting to Durable Object:', wsUrl);

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connected to Durable Object');
            this.connected = true;
            this.reconnectAttempts = 0;
            this.trigger('connect', {});
        };

        this.ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('WebSocket message:', message);

                if (message.type) {
                    this.trigger(message.type, message.data);
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.trigger('error', error);
        };

        this.ws.onclose = () => {
            console.log('WebSocket closed');
            this.connected = false;
            this.trigger('disconnect', {});

            // Auto-reconnect
            if (this.reconnectAttempts < this.maxReconnectAttempts) {
                setTimeout(() => {
                    this.reconnectAttempts++;
                    console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);
                    if (this.gameId) {
                        this.connect();
                    }
                }, this.reconnectDelay * this.reconnectAttempts);
            }
        };
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
        this.gameId = null;
        this.reconnectAttempts = this.maxReconnectAttempts; // Prevent auto-reconnect
    }

    emit(event: string, data?: any) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: event, data }));
        } else {
            console.warn('WebSocket not connected, cannot send:', event);
        }
    }

    on(event: string, handler: Function) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event)!.add(handler);
    }

    off(event: string, handler?: Function) {
        if (!handler) {
            // Remove all handlers for this event
            this.eventHandlers.delete(event);
            return;
        }

        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.delete(handler);
        }
    }

    private trigger(event: string, data: any) {
        const handlers = this.eventHandlers.get(event);
        if (handlers) {
            handlers.forEach(handler => handler(data));
        }
    }
}

// Export singleton instance
export const gameSocket = new GameWebSocket();
