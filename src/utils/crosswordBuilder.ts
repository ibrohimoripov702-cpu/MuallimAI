import type {
  CrosswordData,
  CrosswordPlacement,
  CrosswordWordInput,
} from '../types/lesson.ts';

interface InternalPlacement {
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
}

/**
 * Normalizes a candidate crossword word into uppercase alphabetic characters.
 * Removes spaces, hyphens, and Uzbek apostrophe modifiers so every grid cell
 * maps cleanly to a single typeable letter.
 */
export function normalizeCrosswordWord(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/['‘’`ʻʼ\-_\s]/g, '')
    .toUpperCase()
    .replace(/[^A-ZА-ЯЁЎҚҒҲ]/g, '');
}

function key(r: number, c: number): string {
  return `${r},${c}`;
}

export function buildCrosswordGrid(
  title: string,
  candidates: CrosswordWordInput[],
  maxWords = 10,
): CrosswordData {
  const cleanedMap = new Map<string, CrosswordWordInput>();
  for (const item of candidates) {
    const clean = normalizeCrosswordWord(item.word);
    if (clean.length >= 3 && clean.length <= 14 && !cleanedMap.has(clean)) {
      cleanedMap.set(clean, {
        word: clean,
        clue: item.clue.trim(),
      });
    }
  }

  const words = Array.from(cleanedMap.values()).sort(
    (a, b) => b.word.length - a.word.length,
  );

  if (words.length === 0) {
    return {
      title,
      rows: 1,
      cols: 1,
      placements: [],
      unplacedWords: [],
    };
  }

  const grid = new Map<string, string>();
  const placed: InternalPlacement[] = [];
  const pending: CrosswordWordInput[] = [];

  const placeOnGrid = (p: InternalPlacement) => {
    placed.push(p);
    for (let i = 0; i < p.word.length; i++) {
      const r = p.direction === 'across' ? p.row : p.row + i;
      const c = p.direction === 'across' ? p.col + i : p.col;
      grid.set(key(r, c), p.word[i]);
    }
  };

  // Seed with the longest word horizontally at origin
  placeOnGrid({
    word: words[0].word,
    clue: words[0].clue,
    row: 0,
    col: 0,
    direction: 'across',
  });

  const canPlace = (
    word: string,
    row: number,
    col: number,
    direction: 'across' | 'down',
  ): { valid: boolean; intersections: number } => {
    const dr = direction === 'down' ? 1 : 0;
    const dc = direction === 'across' ? 1 : 0;

    // Cell immediately before start and immediately after end must be empty
    if (grid.has(key(row - dr, col - dc))) {
      return { valid: false, intersections: 0 };
    }
    if (grid.has(key(row + dr * word.length, col + dc * word.length))) {
      return { valid: false, intersections: 0 };
    }

    let intersections = 0;

    for (let i = 0; i < word.length; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      const existing = grid.get(key(r, c));

      if (existing !== undefined) {
        if (existing !== word[i]) {
          return { valid: false, intersections: 0 };
        }
        intersections += 1;
      } else {
        // Side neighbors perpendicular to direction must be empty so words don't bleed together
        const perpR = direction === 'across' ? 1 : 0;
        const perpC = direction === 'down' ? 1 : 0;
        if (
          grid.has(key(r + perpR, c + perpC)) ||
          grid.has(key(r - perpR, c - perpC))
        ) {
          return { valid: false, intersections: 0 };
        }
      }
    }

    return { valid: intersections > 0, intersections };
  };

  const tryPlaceWord = (candidate: CrosswordWordInput): boolean => {
    if (placed.length >= maxWords) return false;

    let best: {
      row: number;
      col: number;
      direction: 'across' | 'down';
      score: number;
    } | null = null;

    // Compute current bounding box for compactness scoring
    let minR = Infinity;
    let maxR = -Infinity;
    let minC = Infinity;
    let maxC = -Infinity;
    for (const k of grid.keys()) {
      const [rStr, cStr] = k.split(',');
      const r = Number(rStr);
      const c = Number(cStr);
      if (r < minR) minR = r;
      if (r > maxR) maxR = r;
      if (c < minC) minC = c;
      if (c > maxC) maxC = c;
    }

    for (const existing of placed) {
      const newDir: 'across' | 'down' =
        existing.direction === 'across' ? 'down' : 'across';

      for (let ei = 0; ei < existing.word.length; ei++) {
        const er =
          existing.direction === 'across' ? existing.row : existing.row + ei;
        const ec =
          existing.direction === 'across' ? existing.col + ei : existing.col;
        const letter = existing.word[ei];

        for (let ci = 0; ci < candidate.word.length; ci++) {
          if (candidate.word[ci] !== letter) continue;

          const startR = newDir === 'down' ? er - ci : er;
          const startC = newDir === 'across' ? ec - ci : ec;

          const check = canPlace(candidate.word, startR, startC, newDir);
          if (!check.valid) continue;

          const endR =
            newDir === 'down' ? startR + candidate.word.length - 1 : startR;
          const endC =
            newDir === 'across' ? startC + candidate.word.length - 1 : startC;

          const nMinR = Math.min(minR, startR);
          const nMaxR = Math.max(maxR, endR);
          const nMinC = Math.min(minC, startC);
          const nMaxC = Math.max(maxC, endC);
          const area = (nMaxR - nMinR + 1) * (nMaxC - nMinC + 1);

          // Favor more intersections and compact grids
          const score = check.intersections * 100 - area;

          if (!best || score > best.score) {
            best = { row: startR, col: startC, direction: newDir, score };
          }
        }
      }
    }

    if (best) {
      placeOnGrid({
        word: candidate.word,
        clue: candidate.clue,
        row: best.row,
        col: best.col,
        direction: best.direction,
      });
      return true;
    }

    return false;
  };

  for (let i = 1; i < words.length; i++) {
    if (!tryPlaceWord(words[i])) {
      pending.push(words[i]);
    }
  }

  // Second pass for previously unplaced words now that more intersections exist
  const stillUnplaced: CrosswordWordInput[] = [];
  for (const w of pending) {
    if (!tryPlaceWord(w)) {
      stillUnplaced.push(w);
    }
  }

  // Normalize coordinates to 0-based grid
  let minR = Infinity;
  let maxR = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;

  for (const p of placed) {
    const endR = p.direction === 'down' ? p.row + p.word.length - 1 : p.row;
    const endC = p.direction === 'across' ? p.col + p.word.length - 1 : p.col;
    minR = Math.min(minR, p.row);
    maxR = Math.max(maxR, endR);
    minC = Math.min(minC, p.col);
    maxC = Math.max(maxC, endC);
  }

  const rows = maxR - minR + 1;
  const cols = maxC - minC + 1;

  const normalized = placed.map((p) => ({
    ...p,
    row: p.row - minR,
    col: p.col - minC,
  }));

  // Assign standard top-to-bottom, left-to-right crossword clue numbers
  const startCells = new Map<string, number>();
  const sortedStarts = [...normalized].sort((a, b) =>
    a.row !== b.row ? a.row - b.row : a.col - b.col,
  );

  let nextNum = 1;
  const numberedPlacements: CrosswordPlacement[] = sortedStarts.map((p) => {
    const cellKey = key(p.row, p.col);
    let num = startCells.get(cellKey);
    if (num === undefined) {
      num = nextNum++;
      startCells.set(cellKey, num);
    }
    return {
      number: num,
      word: p.word,
      clue: p.clue,
      row: p.row,
      col: p.col,
      direction: p.direction,
    };
  });

  return {
    title,
    rows,
    cols,
    placements: numberedPlacements,
    unplacedWords: stillUnplaced,
  };
}
