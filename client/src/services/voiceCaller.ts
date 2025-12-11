// Amharic number pronunciation mapping
const amharicNumbers: { [key: number]: string } = {
    1: 'አንድ', 2: 'ሁለት', 3: 'ሦስት', 4: 'አራት', 5: 'አምስት',
    6: 'ስድስት', 7: 'ሰባት', 8: 'ስምንት', 9: 'ዘጠኝ', 10: 'አስር',
    11: 'አስራ አንድ', 12: 'አስራ ሁለት', 13: 'አስራ ሦስት', 14: 'አስራ አራት', 15: 'አስራ አምስት',
    16: 'አስራ ስድስት', 17: 'አስራ ሰባት', 18: 'አስራ ስምንት', 19: 'አስራ ዘጠኝ', 20: 'ሃያ',
    21: 'ሃያ አንድ', 22: 'ሃያ ሁለት', 23: 'ሃያ ሦስት', 24: 'ሃያ አራት', 25: 'ሃያ አምስት',
    26: 'ሃያ ስድስት', 27: 'ሃያ ሰባት', 28: 'ሃያ ስምንት', 29: 'ሃያ ዘጠኝ', 30: 'ሰላሳ',
    31: 'ሰላሳ አንድ', 32: 'ሰላሳ ሁለት', 33: 'ሰላሳ ሦስት', 34: 'ሰላሳ አራት', 35: 'ሰላሳ አምስት',
    36: 'ሰላሳ ስድስት', 37: 'ሰላሳ ሰባት', 38: 'ሰላሳ ስምንት', 39: 'ሰላሳ ዘጠኝ', 40: 'አርባ',
    41: 'አርባ አንድ', 42: 'አርባ ሁለት', 43: 'አርባ ሦስት', 44: 'አርባ አራት', 45: 'አርባ አምስት',
    46: 'አርባ ስድስት', 47: 'አርባ ሰባት', 48: 'አርባ ስምንት', 49: 'አርባ ዘጠኝ', 50: 'ሃምሳ',
    51: 'ሃምሳ አንድ', 52: 'ሃምሳ ሁለት', 53: 'ሃምሳ ሦስት', 54: 'ሃምሳ አራት', 55: 'ሃምሳ አምስት',
    56: 'ሃምሳ ስድስት', 57: 'ሃምሳ ሰባት', 58: 'ሃምሳ ስምንት', 59: 'ሃምሳ ዘጠኝ', 60: 'ስልሳ',
    61: 'ስልሳ አንድ', 62: 'ስልሳ ሁለት', 63: 'ስልሳ ሦስት', 64: 'ስልሳ አራት', 65: 'ስልሳ አምስት',
    66: 'ስልሳ ስድስት', 67: 'ስልሳ ሰባት', 68: 'ስልሳ ስምንት', 69: 'ስልሳ ዘጠኝ', 70: 'ሰባ',
    71: 'ሰባ አንድ', 72: 'ሰባ ሁለት', 73: 'ሰባ ሦስት', 74: 'ሰባ አራት', 75: 'ሰባ አምስት'
};

const amharicLetters: { [key: string]: string } = {
    'B': 'ቢ',
    'I': 'አይ',
    'N': 'ኤን',
    'G': 'ጂ',
    'O': 'ኦ'
};

export class AmharicVoiceCaller {
    private audioCache: Map<number, HTMLAudioElement> = new Map();
    private isGenerating: Set<number> = new Set();
    private synth: SpeechSynthesis | null = null;
    private voice: SpeechSynthesisVoice | null = null;

    constructor() {
        // Initialize Web Speech API as fallback
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            this.synth = window.speechSynthesis;
            this.initVoice();
        }
    }

    private initVoice() {
        if (!this.synth) return;

        const loadVoices = () => {
            const voices = this.synth!.getVoices();
            // Try to find Amharic voice
            this.voice = voices.find(v => v.lang.startsWith('am')) ||
                voices.find(v => v.lang.startsWith('en')) ||
                voices[0] || null;

            console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
            console.log('Selected voice:', this.voice?.name, this.voice?.lang);
        };

        loadVoices();

        // Voices load asynchronously on some browsers
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = loadVoices;
        }
    }

    public async callNumber(number: number) {
        // Get letter (B, I, N, G, O)
        const letter = ['B', 'I', 'N', 'G', 'O'][Math.floor((number - 1) / 15)];

        // Get Amharic text
        const amharicLetter = amharicLetters[letter];
        const amharicNumber = amharicNumbers[number];

        const text = `${amharicLetter} ${amharicNumber}`;

        console.log('Calling number:', number, text);

        // Try multiple methods in order of preference
        const success = await this.tryGoogleTTS(text, number) ||
            await this.tryWebSpeech(text);

        if (!success) {
            console.warn('All TTS methods failed for number:', number);
        }
    }

    private async tryGoogleTTS(text: string, number: number): Promise<boolean> {
        try {
            // Check cache first
            if (this.audioCache.has(number)) {
                const audio = this.audioCache.get(number)!;
                audio.currentTime = 0;
                await audio.play();
                return true;
            }

            // Prevent duplicate generation
            if (this.isGenerating.has(number)) {
                return false;
            }

            this.isGenerating.add(number);

            // Use Google Cloud TTS API (free tier)
            const apiKey = 'AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw'; // Public demo key - replace with your own
            const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: { text },
                    voice: {
                        languageCode: 'am-ET',
                        name: 'am-ET-Standard-A',
                        ssmlGender: 'FEMALE'
                    },
                    audioConfig: {
                        audioEncoding: 'MP3',
                        pitch: 0,
                        speakingRate: 0.9
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Google TTS failed: ${response.status}`);
            }

            const data = await response.json();
            const audioContent = data.audioContent;

            // Convert base64 to audio
            const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);

            // Cache for reuse
            this.audioCache.set(number, audio);
            this.isGenerating.delete(number);

            await audio.play();
            return true;

        } catch (error) {
            console.error('Google TTS error:', error);
            this.isGenerating.delete(number);
            return false;
        }
    }

    private async tryWebSpeech(text: string): Promise<boolean> {
        return new Promise((resolve) => {
            if (!this.synth) {
                resolve(false);
                return;
            }

            try {
                // Cancel any ongoing speech
                this.synth.cancel();

                const utterance = new SpeechSynthesisUtterance(text);

                if (this.voice) {
                    utterance.voice = this.voice;
                }

                utterance.lang = 'am-ET';
                utterance.rate = 0.85;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;

                utterance.onend = () => resolve(true);
                utterance.onerror = (error) => {
                    console.error('Web Speech error:', error);
                    resolve(false);
                };

                this.synth.speak(utterance);

                // Timeout after 5 seconds
                setTimeout(() => resolve(true), 5000);

            } catch (error) {
                console.error('Web Speech error:', error);
                resolve(false);
            }
        });
    }

    public stop() {
        // Stop all audio
        this.audioCache.forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });

        if (this.synth) {
            this.synth.cancel();
        }
    }

    public clearCache() {
        this.audioCache.clear();
    }
}

// Singleton instance
export const voiceCaller = new AmharicVoiceCaller();
