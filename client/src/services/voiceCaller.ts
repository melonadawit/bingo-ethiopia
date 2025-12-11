// Amharic Voice Caller using pre-generated audio files
// All audio files are stored in /public/audio/

export class AmharicVoiceCaller {
    private audioCache: Map<string, HTMLAudioElement> = new Map();
    private currentAudio: HTMLAudioElement | null = null;

    constructor() {
        // Preload all audio files for instant playback
        this.preloadAudio();
    }

    private preloadAudio() {
        // Preload number audio files (1-75)
        for (let i = 1; i <= 75; i++) {
            const audio = new Audio(`/audio/numbers/${i}.mp3`);
            audio.preload = 'auto';
            this.audioCache.set(`number_${i}`, audio);
        }

        // Preload announcement audio files
        const gameStart = new Audio('/audio/announcements/game_start.mp3');
        gameStart.preload = 'auto';
        this.audioCache.set('game_start', gameStart);

        const winnerTemplate = new Audio('/audio/announcements/winner.mp3');
        winnerTemplate.preload = 'auto';
        this.audioCache.set('winner', winnerTemplate);

        console.log('✅ All audio files preloaded');
    }

    public async callNumber(number: number): Promise<void> {
        return this.playAudio(`number_${number}`);
    }

    public async announceGameStart(): Promise<void> {
        console.log('🎮 Announcing: Game has started!');
        return this.playAudio('game_start');
    }

    public async announceWinner(cartelaNumber: number): Promise<void> {
        console.log(`🏆 Announcing: Cartela ${cartelaNumber} is the winner!`);

        // Play winner announcement
        await this.playAudio('winner');

        // Small pause
        await new Promise(resolve => setTimeout(resolve, 500));

        // Say the cartela number
        await this.callNumber(cartelaNumber);
    }

    private async playAudio(key: string): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                // Stop current audio if playing
                if (this.currentAudio) {
                    this.currentAudio.pause();
                    this.currentAudio.currentTime = 0;
                }

                const audio = this.audioCache.get(key);

                if (!audio) {
                    console.warn(`Audio not found: ${key}`);
                    // Try to load it dynamically
                    const newAudio = new Audio(this.getAudioPath(key));
                    newAudio.onended = () => resolve();
                    newAudio.onerror = (error) => {
                        console.error(`Error playing audio ${key}:`, error);
                        reject(error);
                    };
                    newAudio.play().catch(reject);
                    this.currentAudio = newAudio;
                    return;
                }

                this.currentAudio = audio;
                audio.currentTime = 0;

                audio.onended = () => {
                    this.currentAudio = null;
                    resolve();
                };

                audio.onerror = (error) => {
                    console.error(`Error playing audio ${key}:`, error);
                    this.currentAudio = null;
                    reject(error);
                };

                audio.play().catch((error) => {
                    console.error(`Play failed for ${key}:`, error);
                    reject(error);
                });

            } catch (error) {
                console.error(`Error in playAudio for ${key}:`, error);
                reject(error);
            }
        });
    }

    private getAudioPath(key: string): string {
        if (key.startsWith('number_')) {
            const num = key.replace('number_', '');
            return `/audio/numbers/${num}.mp3`;
        }
        return `/audio/announcements/${key}.mp3`;
    }

    public stop() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
    }

    public clearCache() {
        this.audioCache.clear();
        this.preloadAudio();
    }
}

// Singleton instance
export const voiceCaller = new AmharicVoiceCaller();
