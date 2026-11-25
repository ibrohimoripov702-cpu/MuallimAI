import type {
  CrosswordWordInput,
  WordSearchData,
  WordSearchPlacement,
} from '../types/lesson.ts';
import { normalizeCrosswordWord } from './crosswordBuilder.ts';

const DIRECTIONS: Array<[number, number]> = [
  [0, 1], // horizontal right
  [1, 0], // vertical down
  [1, 1], // diagonal down-right
  [-1, 1], // diagonal up-right
];

const FILLER_CHARS = 'ABDEFGHIJKLMNOPQRSTUVXYZ';

export function buildWordSearchGrid(
  title: string,
  candidates: CrosswordWordInput[],
  size = 11,
): WordSearchData {
  const unique = new Map<string, CrosswordWordInput>();
  for (const item of candidates) {
    const clean = normalizeCrosswordWord(item.word);
    if (clean.length >= 3 && clean.length <= size - 1 && !unique.has(clean)) {
      unique.set(clean, {
        word: clean,
        clue: item.clue.trim(),
      });
    }
  }

  const words = Array.from(unique.values())
    .sort((a, b) => b.word.length - a.word.length)
    .slice(0, 8);

  const grid: Array<Array<string | null>> = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null),
  );

  const placements: WordSearchPlacement[] = [];

  for (let wIdx = 0; wIdx < words.length; wIdx++) {
    const { word, clue } = words[wIdx];
    const dirOrder = [
      ...DIRECTIONS.slice(wIdx % DIRECTIONS.length),
      ...DIRECTIONS.slice(0, wIdx % DIRECTIONS.length),
    ];

    let placed = false;

    for (const [dr, dc] of dirOrder) {
      if (placed) break;
      const candidatesPos: Array<{ r: number; c: number; overlap: number }> = [];

      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          const endR = r + dr * (word.length - 1);
          const endC = c + dc * (word.length - 1);
          if (endR < 0 || endR >= size || endC < 0 || endC >= size) continue;

          let valid = true;
          let overlap = 0;
          for (let i = 0; i < word.length; i++) {
            const cell = grid[r + dr * i][c + dc * i];
            if (cell !== null && cell !== word[i]) {
              valid = false;
              break;
            }
            if (cell === word[i]) overlap += 1;
          }

          if (valid) {
            candidatesPos.push({ r, c, overlap });
          }
        }
      }

      if (candidatesPos.length > 0) {
        // Prefer slight overlaps or spread positions deterministically
        candidatesPos.sort((a, b) => b.overlap - a.overlap);
        const pickPool = candidatesPos.slice(0, Math.min(6, candidatesPos.length));
        const chosen = pickPool[(wIdx * 3) % pickPool.length];

        for (let i = 0; i < word.length; i++) {
          grid[chosen.r + dr * i][chosen.c + dc * i] = word[i];
        }
        placements.push({
          word,
          clue,
          row: chosen.r,
          col: chosen.c,
          dr,
          dc,
        });
        placed = true;
      }
    }
  }

  const finalGrid: string[][] = grid.map((row, rIdx) =>
    row.map((cell, cIdx) => {
      if (cell !== null) return cell;
      const hash = (rIdx * 31 + cIdx * 17 + words.length * 7) % FILLER_CHARS.length;
      return FILLER_CHARS[hash];
    }),
  );

  return {
    title,
    size,
    grid: finalGrid,
    words: placements,
  };
}
