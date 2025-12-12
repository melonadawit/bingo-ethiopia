// Amharic Voice Caller using pre-generated audio files
// All audio files are stored in /public/audio/

export class AmharicVoiceCaller {
    private audioCache: Map<string, HTMLAudioElement> = new Map();
    private currentAudio: HTMLAudioElement | null = null;
    private isEnabled: boolean = true;

    constructor() {
        // We don't preload everything to save bandwidth/memory
        // We will load on demand
    }

    public async callNumber(number: number): Promise<void> {
        if (!this.isEnabled) return;
        return this.playAudio(`number_${number}`);
    }

    public async announceGameStart(): Promise<void> {
        if (!this.isEnabled) return;
        console.log('🎮 Announcing: Game has started!');
        return this.playAudio('game_start');
    }

    public async announceWinner(cartelaNumber?: number): Promise<void> {
        if (!this.isEnabled) return;
        console.log(`🏆 Announcing: Cartela ${cartelaNumber} is the winner!`);

        try {
            // Play celebration sound first
            // await this.playAudio('winner_sound'); // Optional: if you have a sound effect

            // Play the pre-generated Amharic announcement
            // File format: /audio/cartelas/{number}.mp3
            // Content: "The winner cartela number is {number}" (in Amharic)
            await this.playAudio(`cartelas/${cartelaNumber}`);

        } catch (err) {
            console.error("Error in winner announcement sequence:", err);
        }
    }

    private async playAudio(key: string): Promise<void> {
        return new Promise((resolve) => { // Resolve only, don't reject to keep game flow
            try {
                // Stop current audio if playing to prevent overlap
                this.stop();

                let audio = this.audioCache.get(key);

                if (!audio) {
                    const path = this.getAudioPath(key);
                    // console.log(`Loading audio: ${key} from ${path}`);
                    audio = new Audio(path);
                    audio.preload = 'auto'; // Load it now that we need it
                    this.audioCache.set(key, audio);
                }

                this.currentAudio = audio;

                // Reset playback position
                audio.currentTime = 0;

                const handleEnded = () => {
                    cleanup();
                    resolve();
                };

                const handleError = (e: Event | string) => {
                    console.error(`Error playing audio ${key}:`, e);
                    cleanup();
                    // Resolve anyway to continue game flow
                    resolve();
                };

                const cleanup = () => {
                    if (audio) {
                        audio.removeEventListener('ended', handleEnded);
                        audio.removeEventListener('error', handleError);
                    }
                    if (this.currentAudio === audio) {
                        this.currentAudio = null;
                    }
                };

                audio.addEventListener('ended', handleEnded);
                audio.addEventListener('error', handleError);

                const playPromise = audio.play();

                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn(`Autoplay prevented or failed for ${key}:`, error);
                        cleanup();
                        resolve(); // Resolve anyway
                    });
                }

            } catch (error) {
                console.error(`Critical error in playAudio for ${key}:`, error);
                this.stop();
                resolve(); // Resolve anyway
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
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
            } catch (e) {
                // Ignore pause errors
            }
            this.currentAudio = null;
        }
    }

    public clearCache() {
        this.stop();
        this.audioCache.clear();
    }
}

// Singleton instance
export const voiceCaller = new AmharicVoiceCaller();
