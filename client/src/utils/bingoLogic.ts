/**
 * Bingo Logic Utility
 * handles winning pattern verification for Ethiopian Bingo modes
 */

export type GameMode = 'and-zig' | 'hulet-zig' | 'mulu-zig';

interface WinningResult {
    isWinner: boolean;
    winningCells: boolean[][]; // 5x5 grid marking winning cells
}

/**
 * Checks if a card is a winner based on the current game mode and called numbers
 */
export const checkWinningPattern = (
    card: number[][],
    calledNumbers: Set<number>,
    gameMode: string // 'and-zig' | 'hulet-zig' | 'mulu-zig'
): WinningResult => {
    // 1. Mark the grid
    const marked = card.map((row, rowIndex) =>
        row.map((num, colIndex) => {
            // Center is always free/marked
            if (rowIndex === 2 && colIndex === 2) return true;
            return calledNumbers.has(num);
        })
    );

    // Initialize winning cells grid (false)
    let winningCells = Array(5).fill(0).map(() => Array(5).fill(false));
    let completedLinesCount = 0;

    // Helper to add winning cells
    const addWinningCells = (cells: [number, number][]) => {
        cells.forEach(([r, c]) => {
            winningCells[r][c] = true;
        });
    };

    // --- CHECK ROWS ---
    for (let r = 0; r < 5; r++) {
        if (marked[r].every(cell => cell)) {
            completedLinesCount++;
            addWinningCells([[r, 0], [r, 1], [r, 2], [r, 3], [r, 4]]);
        }
    }

    // --- CHECK COLUMNS ---
    for (let c = 0; c < 5; c++) {
        if (marked.every(row => row[c])) {
            completedLinesCount++;
            addWinningCells([[0, c], [1, c], [2, c], [3, c], [4, c]]);
        }
    }

    // --- CHECK DIAGONALS ---
    // Main diagonal (0,0 to 4,4)
    if ([0, 1, 2, 3, 4].every(i => marked[i][i])) {
        completedLinesCount++;
        addWinningCells([[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]]);
    }
    // Anti-diagonal (0,4 to 4,0)
    if ([0, 1, 2, 3, 4].every(i => marked[i][4 - i])) {
        completedLinesCount++;
        addWinningCells([[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]]);
    }

    // --- CHECK 4 CORNERS ---
    // 4 Corners counts as a "line" equivalent for And-zig/Hulet-zig logic
    // Coordinates: (0,0), (0,4), (4,0), (4,4)
    const corners = [[0, 0], [0, 4], [4, 0], [4, 4]];
    const hasClusters = corners.every(([r, c]) => marked[r][c]);

    if (hasClusters) {
        // Treat 4 corners as a "line" for pattern counting
        completedLinesCount++;
        addWinningCells(corners as [number, number][]);
    }

    // --- DETERMINE WINNER BASED ON MODE ---
    let isWinner = false;

    switch (gameMode) {
        case 'and-zig':
            // Criteria: 1 Line OR 4 Corners
            // Since we counted corners as a line above, simple check:
            isWinner = completedLinesCount >= 1;
            break;

        case 'hulet-zig':
            // Criteria: 2 Lines (Any combination)
            isWinner = completedLinesCount >= 2;
            break;

        case 'mulu-zig':
            // Criteria: Blackout (All cells)
            // Flatten marked grid and check if all true
            const allMarked = marked.flat().every(m => m);
            isWinner = allMarked;
            if (isWinner) {
                // Mark all as winning
                winningCells = Array(5).fill(0).map(() => Array(5).fill(true));
            }
            break;

        default:
            // Default to simple 1 line if unknown
            isWinner = completedLinesCount >= 1;
    }

    // If not a winner, reset winning cells to avoid partial highlights
    if (!isWinner) {
        winningCells = Array(5).fill(0).map(() => Array(5).fill(false));
    }

    return { isWinner, winningCells };
};
