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
    private synth: SpeechSynthesis | null = null;
    private voice: SpeechSynthesisVoice | null = null;

    constructor() {
        // Check if we're in a browser environment
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            this.synth = window.speechSynthesis;
            this.initVoice();
        } else {
            console.warn('Speech Synthesis not available');
        }
    }

    private initVoice() {
        if (!this.synth) return;

        // Try to find Amharic voice, fallback to default
        const voices = this.synth.getVoices();
        this.voice = voices.find(v => v.lang.startsWith('am')) || voices[0] || null;

        // Voices might load asynchronously
        if (voices.length === 0) {
            this.synth.onvoiceschanged = () => {
                if (!this.synth) return;
                const newVoices = this.synth.getVoices();
                this.voice = newVoices.find(v => v.lang.startsWith('am')) || newVoices[0] || null;
            };
        }
    }

    public callNumber(number: number) {
        if (!this.synth) {
            console.warn('Speech synthesis not available');
            return;
        }

        // Get letter (B, I, N, G, O)
        const letter = ['B', 'I', 'N', 'G', 'O'][Math.floor((number - 1) / 15)];

        // Get Amharic text
        const amharicLetter = amharicLetters[letter];
        const amharicNumber = amharicNumbers[number];

        const text = `${amharicLetter} ${amharicNumber}`;

        console.log('Calling number:', text);

        this.speak(text);
    }

    private speak(text: string) {
        if (!this.synth) return;

        // Cancel any ongoing speech
        this.synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        if (this.voice) {
            utterance.voice = this.voice;
        }

        utterance.lang = 'am-ET'; // Amharic (Ethiopia)
        utterance.rate = 0.9; // Slightly slower for clarity
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        this.synth.speak(utterance);
    }

    public stop() {
        if (this.synth) {
            this.synth.cancel();
        }
    }
}

// Singleton instance
export const voiceCaller = new AmharicVoiceCaller();
