// Amharic Voice Caller using pre-generated audio files
// All audio files are stored in /public/audio/

export class AmharicVoiceCaller {
    private audioCache: Map<string, HTMLAudioElement> = new Map();
    private currentAudio: HTMLAudioElement | null = null;
    private isEnabled: boolean = true;
    private voiceGender: 'female' | 'male' = 'male'; // Default to Male as requested

    constructor() {
        // Initialize voices immediately if possible
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
            // Ensure voices are loaded (chrome quirk)
            window.speechSynthesis.onvoiceschanged = () => {
                console.log("🎤 TTS Voices loaded:", window.speechSynthesis.getVoices().length);
            };
        }
    }

    public setGender(gender: 'female' | 'male') {
        this.voiceGender = gender;
        this.stop(); // Stop any current audio when switching
    }

    public getGender() {
        return this.voiceGender;
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

        // If Male voice, we can use TTS for simple "Winner is Cartela X"
        if (this.voiceGender === 'male') {
            this.speak(`The winner is cartela number ${cartelaNumber}`);
            return;
        }

        try {
            await this.playAudio(`cartelas/${cartelaNumber}`);
        } catch (err) {
            console.error("Error in winner announcement sequence:", err);
        }
    }

    private speak(text: string) {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            console.error("TTS not supported or running on server");
            return;
        }

        console.log(`🗣️ Speaking (TTS): "${text}"`);

        // Cancel any current speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        const voices = window.speechSynthesis.getVoices();

        // Try to find a male voice
        const maleVoice = voices.find(v =>
            v.name.toLowerCase().includes('male') ||
            v.name.toLowerCase().includes('david') ||
            v.name.toLowerCase().includes('google us english')
        );

        if (maleVoice) {
            console.log(`✅ Using voice: ${maleVoice.name}`);
            utterance.voice = maleVoice;
        } else {
            console.warn("⚠️ No specific male voice found, using system default");
        }

        // Adjust pitch/rate to sound more like a caller
        utterance.rate = 0.9;
        utterance.pitch = 0.9;
        utterance.volume = 1.0;

        utterance.onerror = (e) => console.error("TTS Error:", e);

        window.speechSynthesis.speak(utterance);
    }

    private async playAudio(key: string): Promise<void> {
        // Male Voice (TTS) Handler
        if (this.voiceGender === 'male') {
            if (key.startsWith('number_')) {
                const num = parseInt(key.replace('number_', ''));
                const letter = num <= 15 ? 'B' : num <= 30 ? 'I' : num <= 45 ? 'N' : num <= 60 ? 'G' : 'O';
                this.speak(`${letter} ${num}`);
                return;
            }
            if (key === 'game_start') {
                this.speak("The game is starting. Good luck!");
                return;
            }
            // Fallback for other keys or mixed mode
        }

        // Female Voice (MP3) Handler
        return new Promise((resolve) => {
            try {
                this.stop();

                let audio = this.audioCache.get(key);

                if (!audio) {
                    const path = this.getAudioPath(key);
                    audio = new Audio(path);
                    audio.preload = 'auto';
                    this.audioCache.set(key, audio);
                }

                this.currentAudio = audio;
                audio.currentTime = 0;

                const handleEnded = () => {
                    cleanup();
                    resolve();
                };

                const handleError = (e: Event | string) => {
                    console.error(`Error playing audio ${key}:`, e);
                    cleanup();
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
                        resolve();
                    });
                }

            } catch (error) {
                console.error(`Critical error in playAudio for ${key}:`, error);
                this.stop();
                resolve();
            }
        });
    }

    private getAudioPath(key: string): string {
        if (key.startsWith('number_')) {
            const num = key.replace('number_', '');
            return `/audio/numbers/${num}.mp3`;
        }
        if (key.startsWith('cartelas/')) {
            return `/audio/${key}.mp3`;
        }
        return `/audio/announcements/${key}.mp3`;
    }

    public stop() {
        // Stop MP3
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
            } catch (e) { }
            this.currentAudio = null;
        }
        // Stop TTS
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }

    public clearCache() {
        this.stop();
        this.audioCache.clear();
    }
}

// Singleton instance
export const voiceCaller = new AmharicVoiceCaller();
