// Seeded card generator for consistent Bingo cards 1-300
// Card ID 44 will always generate the same card numbers

export interface BingoCard {
    id: number;
    numbers: number[][];
}

// Seeded random number generator (LCG algorithm)
function seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1103515245 + 12345) & 0x7fffffff;
        return state / 0x7fffffff;
    };
}

/**
 * Generate a consistent Bingo card for a given ID (1-300)
 * Same ID always produces the same card
 */
export function generateBingoCard(cardId: number): BingoCard {
    if (cardId < 1 || cardId > 300) {
        throw new Error('Card ID must be between 1 and 300');
    }

    const card: number[][] = Array(5).fill(0).map(() => Array(5).fill(0));
    const used = new Set<number>();
    const random = seededRandom(cardId * 12345); // Seed based on card ID

    // B (1-15), I (16-30), N (31-45), G (46-60), O (61-75)
    for (let col = 0; col < 5; col++) {
        const min = col * 15 + 1;
        const max = min + 14;

        for (let row = 0; row < 5; row++) {
            // Free space in center
            if (col === 2 && row === 2) {
                card[row][col] = 0; // 0 represents free space
                continue;
            }

            let num;
            let attempts = 0;
            do {
                num = Math.floor(random() * (max - min + 1)) + min;
                attempts++;
                if (attempts > 100) break; // Safety check
            } while (used.has(num));

            used.add(num);
            card[row][col] = num;
        }
    }

    return { id: cardId, numbers: card };
}

/**
 * Generate multiple cards by their IDs
 */
export function generateBingoCards(cardIds: number[]): BingoCard[] {
    return cardIds.map(id => generateBingoCard(id));
}

/**
 * Validate that a card ID is valid
 */
export function isValidCardId(cardId: number): boolean {
    return cardId >= 1 && cardId <= 300;
}
