// Script to generate all Amharic audio files for the bingo game
// Run with: node scripts/generateAllAudio.js

const fs = require('fs');
const path = require('path');

// Amharic translations
const amharicNumbers = {
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

const amharicLetters = {
    'B': 'ቢ', 'I': 'አይ', 'N': 'ኤን', 'G': 'ጂ', 'O': 'ኦ'
};

const announcements = {
    'game_start': 'ጨዋታው ተጀምሯል!', // "The game has started!"
    'winner': 'አሸናፊው ካርቴላ ቁጥር' // "The winner is cartela number"
};

async function generateAudioFile(text, filename, outputPath) {
    try {
        const apiKey = 'AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw';
        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input: { text },
                voice: {
                    languageCode: 'am-ET',
                    name: 'am-ET-Standard-B', // Male voice
                    ssmlGender: 'MALE'
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    pitch: 0,
                    speakingRate: 0.9
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const audioContent = data.audioContent;
        const buffer = Buffer.from(audioContent, 'base64');

        fs.writeFileSync(path.join(outputPath, filename), buffer);
        return true;
    } catch (error) {
        console.error(`Error generating ${filename}:`, error.message);
        return false;
    }
}

async function generateAll() {
    console.log('🎙️  Generating Amharic Audio Files with Male Voice\n');
    console.log('='.repeat(60));

    // Create directories
    const numbersDir = path.join(__dirname, '..', 'client', 'public', 'audio', 'numbers');
    const announcementsDir = path.join(__dirname, '..', 'client', 'public', 'audio', 'announcements');

    fs.mkdirSync(numbersDir, { recursive: true });
    fs.mkdirSync(announcementsDir, { recursive: true });

    let successCount = 0;
    let failCount = 0;

    // Generate number files (1-75)
    console.log('\n📢 Generating Number Announcements (1-75)...\n');

    for (let num = 1; num <= 75; num++) {
        const filePath = path.join(numbersDir, `${num}.mp3`);
        if (fs.existsSync(filePath)) {
            console.log(`Generating ${num}.mp3: SKIPPED (Exists)`);
            successCount++;
            continue;
        }

        const letter = ['B', 'I', 'N', 'G', 'O'][Math.floor((num - 1) / 15)];
        const amharicLetter = amharicLetters[letter];
        const amharicNumber = amharicNumbers[num];
        const text = `${amharicLetter} ${amharicNumber}`;

        process.stdout.write(`Generating ${num}.mp3: ${text}... `);

        const success = await generateAudioFile(text, `${num}.mp3`, numbersDir);

        if (success) {
            console.log('✅');
            successCount++;
        } else {
            console.log('❌');
            failCount++;
        }

        // Increased delay to 3.5s to avoid hitting rate limits
        await new Promise(resolve => setTimeout(resolve, 3500));
    }

    // Generate announcement files
    console.log('\n📢 Generating Game Announcements...\n');

    for (const [key, text] of Object.entries(announcements)) {
        const filePath = path.join(announcementsDir, `${key}.mp3`);
        if (fs.existsSync(filePath)) {
            console.log(`Generating ${key}.mp3: SKIPPED (Exists)`);
            successCount++;
            continue;
        }

        process.stdout.write(`Generating ${key}.mp3: ${text}... `);

        const success = await generateAudioFile(text, `${key}.mp3`, announcementsDir);

        if (success) {
            console.log('✅');
            successCount++;
        } else {
            console.log('❌');
            failCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 3500));
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 Generation Summary:');
    console.log(`   ✅ Success: ${successCount} files`);
    console.log(`   ❌ Failed: ${failCount} files`);
    console.log(`\n📁 Output Locations:`);
    console.log(`   Numbers: ${numbersDir}`);
    console.log(`   Announcements: ${announcementsDir}`);
    console.log('\n✨ Done!\n');
}

generateAll().catch(console.error);
