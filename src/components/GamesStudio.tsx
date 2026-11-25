import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Clock,
  Eraser,
  Eye,
  EyeOff,
  Flame,
  Gamepad2,
  Grid3X3,
  Lightbulb,
  ListOrdered,
  Puzzle,
  RefreshCw,
  RotateCcw,
  Search,
  Shuffle,
  Sparkles,
  Trophy,
  Type,
  XCircle,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type {
  CrosswordPlacement,
  InteractiveGamesData,
  LessonVisualTheme,
  PuzzlePair,
  PuzzleSequenceStep,
  WordSearchPlacement,
} from '../types/lesson.ts';
import { GAMES_ARENA_IMAGE, getThemeConfig } from '../utils/themeRegistry.ts';

interface GamesStudioProps {
  topic: string;
  subject: string;
  visualTheme?: LessonVisualTheme;
  games: InteractiveGamesData;
  isRegenerating: boolean;
  onRegenerate: () => void;
}

type GameTab =
  | 'crossword'
  | 'wordSearch'
  | 'matching'
  | 'sequence'
  | 'anagram'
  | 'trueFalse';

interface CellMeta {
  row: number;
  col: number;
  expected: string;
  number?: number;
  placements: CrosswordPlacement[];
}

const GAME_TABS: Array<{
  key: GameTab;
  label: string;
  shortDesc: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClass: string;
}> = [
  {
    key: 'crossword',
    label: 'Krossvord',
    shortDesc: 'Kesishuvchi so‘z to‘ri',
    icon: Grid3X3,
    activeClass: 'bg-blue-700 text-white shadow-sm shadow-blue-700/25',
  },
  {
    key: 'wordSearch',
    label: 'So‘z izlash',
    shortDesc: '11×11 harflar jadvali',
    icon: Search,
    activeClass: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25',
  },
  {
    key: 'matching',
    label: 'Moslashtirish pazli',
    shortDesc: 'Atama va ta’rif juftligi',
    icon: Puzzle,
    activeClass: 'bg-violet-600 text-white shadow-sm shadow-violet-600/25',
  },
  {
    key: 'sequence',
    label: 'Ketma-ketlik pazli',
    shortDesc: 'Bosqichlarni tartiblash',
    icon: ListOrdered,
    activeClass: 'bg-amber-600 text-white shadow-sm shadow-amber-600/25',
  },
  {
    key: 'anagram',
    label: 'Anagramma',
    shortDesc: 'Harflardan so‘z yig‘ish',
    icon: Type,
    activeClass: 'bg-sky-600 text-white shadow-sm shadow-sky-600/25',
  },
  {
    key: 'trueFalse',
    label: 'Tezkor Viktorina',
    shortDesc: '15 soniyali blits-sinov',
    icon: Zap,
    activeClass: 'bg-rose-600 text-white shadow-sm shadow-rose-600/25',
  },
];

const WORD_SEARCH_COLORS = [
  'bg-emerald-100 border-emerald-400 text-emerald-950',
  'bg-sky-100 border-sky-400 text-sky-950',
  'bg-amber-100 border-amber-400 text-amber-950',
  'bg-violet-100 border-violet-400 text-violet-950',
  'bg-rose-100 border-rose-400 text-rose-950',
  'bg-indigo-100 border-indigo-400 text-indigo-950',
  'bg-teal-100 border-teal-400 text-teal-950',
  'bg-orange-100 border-orange-400 text-orange-950',
];

function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function getWordSearchCells(w: WordSearchPlacement): string[] {
  const keys: string[] = [];
  for (let i = 0; i < w.word.length; i++) {
    keys.push(`${w.row + w.dr * i},${w.col + w.dc * i}`);
  }
  return keys;
}

function getLineCells(
  start: { row: number; col: number },
  end: { row: number; col: number },
): string[] | null {
  const dRow = end.row - start.row;
  const dCol = end.col - start.col;
  const steps = Math.max(Math.abs(dRow), Math.abs(dCol));
  if (steps === 0) return [`${start.row},${start.col}`];
  const isStraight = dRow === 0 || dCol === 0 || Math.abs(dRow) === Math.abs(dCol);
  if (!isStraight) return null;

  const stepR = dRow === 0 ? 0 : dRow > 0 ? 1 : -1;
  const stepC = dCol === 0 ? 0 : dCol > 0 ? 1 : -1;
  const cells: string[] = [];
  for (let i = 0; i <= steps; i++) {
    cells.push(`${start.row + stepR * i},${start.col + stepC * i}`);
  }
  return cells;
}

export const GamesStudio: React.FC<GamesStudioProps> = ({
  topic,
  subject,
  visualTheme,
  games,
  isRegenerating,
  onRegenerate,
}) => {
  const [activeTab, setActiveTab] = useState<GameTab>('crossword');
  const [arenaImgFailed, setArenaImgFailed] = useState(false);
  const [topicImgFailed, setTopicImgFailed] = useState(false);

  const theme = getThemeConfig(subject, topic, visualTheme);

  useEffect(() => {
    setArenaImgFailed(false);
    setTopicImgFailed(false);
  }, [theme.imageUrl]);

  /* ------------------ 1. CROSSWORD STATE ------------------ */
  const { crossword } = games;
  const [userGrid, setUserGrid] = useState<Record<string, string>>({});
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [activeDir, setActiveDir] = useState<'across' | 'down'>('across');
  const [showKey, setShowKey] = useState(false);
  const [checkedCrossword, setCheckedCrossword] = useState(false);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const { cellMap, acrossClues, downClues } = useMemo(() => {
    const map = new Map<string, CellMeta>();
    const across: CrosswordPlacement[] = [];
    const down: CrosswordPlacement[] = [];

    for (const p of crossword.placements) {
      if (p.direction === 'across') across.push(p);
      else down.push(p);

      for (let i = 0; i < p.word.length; i++) {
        const r = p.direction === 'across' ? p.row : p.row + i;
        const c = p.direction === 'across' ? p.col + i : p.col;
        const k = `${r},${c}`;
        const existing = map.get(k);
        if (existing) {
          existing.placements.push(p);
          if (i === 0 && existing.number === undefined) {
            existing.number = p.number;
          }
        } else {
          map.set(k, {
            row: r,
            col: c,
            expected: p.word[i],
            number: i === 0 ? p.number : undefined,
            placements: [p],
          });
        }
      }
    }

    across.sort((a, b) => a.number - b.number);
    down.sort((a, b) => a.number - b.number);

    return { cellMap: map, acrossClues: across, downClues: down };
  }, [crossword]);

  useEffect(() => {
    setUserGrid({});
    setShowKey(false);
    setCheckedCrossword(false);
    if (crossword.placements.length > 0) {
      const first = crossword.placements[0];
      setSelectedCell({ row: first.row, col: first.col });
      setActiveDir(first.direction);
    } else {
      setSelectedCell(null);
    }
  }, [crossword]);

  const activePlacement = useMemo(() => {
    if (!selectedCell) return null;
    const meta = cellMap.get(`${selectedCell.row},${selectedCell.col}`);
    if (!meta) return null;
    return (
      meta.placements.find((p) => p.direction === activeDir) ||
      meta.placements[0] ||
      null
    );
  }, [selectedCell, activeDir, cellMap]);

  const activeWordKeys = useMemo(() => {
    const set = new Set<string>();
    if (!activePlacement) return set;
    for (let i = 0; i < activePlacement.word.length; i++) {
      const r =
        activePlacement.direction === 'across'
          ? activePlacement.row
          : activePlacement.row + i;
      const c =
        activePlacement.direction === 'across'
          ? activePlacement.col + i
          : activePlacement.col;
      set.add(`${r},${c}`);
    }
    return set;
  }, [activePlacement]);

  const focusCell = (r: number, c: number) => {
    setSelectedCell({ row: r, col: c });
    const el = inputRefs.current[`${r},${c}`];
    if (el) el.focus();
  };

  const handleCellClick = (r: number, c: number) => {
    const meta = cellMap.get(`${r},${c}`);
    if (!meta) return;

    if (selectedCell && selectedCell.row === r && selectedCell.col === c) {
      const hasAcross = meta.placements.some((p) => p.direction === 'across');
      const hasDown = meta.placements.some((p) => p.direction === 'down');
      if (hasAcross && hasDown) {
        setActiveDir((d) => (d === 'across' ? 'down' : 'across'));
      }
    } else {
      setSelectedCell({ row: r, col: c });
      if (!meta.placements.some((p) => p.direction === activeDir)) {
        setActiveDir(meta.placements[0].direction);
      }
    }
  };

  const moveStep = (r: number, c: number, delta: 1 | -1) => {
    const dr = activeDir === 'down' ? delta : 0;
    const dc = activeDir === 'across' ? delta : 0;
    const nr = r + dr;
    const nc = c + dc;
    if (cellMap.has(`${nr},${nc}`)) {
      focusCell(nr, nc);
    }
  };

  const handleLetterChange = (r: number, c: number, raw: string) => {
    const clean = raw
      .toUpperCase()
      .replace(/[^A-ZА-ЯЁЎҚҒҲ]/g, '')
      .slice(-1);
    const k = `${r},${c}`;
    setCheckedCrossword(false);
    setUserGrid((prev) => ({ ...prev, [k]: clean }));
    if (clean) {
      moveStep(r, c, 1);
    }
  };

  const handleCellKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    r: number,
    c: number,
  ) => {
    const k = `${r},${c}`;
    if (e.key === 'Backspace') {
      if (!userGrid[k]) {
        e.preventDefault();
        moveStep(r, c, -1);
      } else {
        setUserGrid((prev) => ({ ...prev, [k]: '' }));
        setCheckedCrossword(false);
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (cellMap.has(`${r},${c + 1}`)) focusCell(r, c + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (cellMap.has(`${r},${c - 1}`)) focusCell(r, c - 1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cellMap.has(`${r + 1},${c}`)) focusCell(r + 1, c);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cellMap.has(`${r - 1},${c}`)) focusCell(r - 1, c);
    }
  };

  const revealSingleLetter = () => {
    if (selectedCell) {
      const k = `${selectedCell.row},${selectedCell.col}`;
      const meta = cellMap.get(k);
      if (meta && userGrid[k] !== meta.expected) {
        setUserGrid((prev) => ({ ...prev, [k]: meta.expected }));
        return;
      }
    }
    for (const [k, meta] of cellMap.entries()) {
      if (userGrid[k] !== meta.expected) {
        setUserGrid((prev) => ({ ...prev, [k]: meta.expected }));
        focusCell(meta.row, meta.col);
        return;
      }
    }
  };

  const crosswordStats = useMemo(() => {
    let total = 0;
    let filled = 0;
    let correct = 0;
    for (const [k, meta] of cellMap.entries()) {
      total += 1;
      const val = userGrid[k] || '';
      if (val) filled += 1;
      if (val === meta.expected) correct += 1;
    }
    return { total, filled, correct };
  }, [cellMap, userGrid]);

  /* ------------------ 2. WORD SEARCH STATE ------------------ */
  const wordSearch = games.wordSearch;
  const [wsStart, setWsStart] = useState<{ row: number; col: number } | null>(null);
  const [wsFoundWords, setWsFoundWords] = useState<string[]>([]);
  const [wsWrongFlash, setWsWrongFlash] = useState<string[]>([]);
  const [wsShowClues, setWsShowClues] = useState(true);

  useEffect(() => {
    setWsStart(null);
    setWsFoundWords([]);
    setWsWrongFlash([]);
  }, [wordSearch]);

  const wsCellColorMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!wordSearch?.words) return map;
    wordSearch.words.forEach((w, idx) => {
      if (wsFoundWords.includes(w.word)) {
        const colorCls = WORD_SEARCH_COLORS[idx % WORD_SEARCH_COLORS.length];
        for (const cellKey of getWordSearchCells(w)) {
          map.set(cellKey, colorCls);
        }
      }
    });
    return map;
  }, [wordSearch, wsFoundWords]);

  const handleWsCellClick = (r: number, c: number) => {
    if (!wordSearch?.grid || !wordSearch?.words) return;
    if (!wsStart) {
      setWsStart({ row: r, col: c });
      return;
    }
    if (wsStart.row === r && wsStart.col === c) {
      setWsStart(null);
      return;
    }
    const lineKeys = getLineCells(wsStart, { row: r, col: c });
    if (!lineKeys) {
      setWsStart({ row: r, col: c });
      return;
    }

    const forwardLetters = lineKeys
      .map((key) => {
        const [kr, kc] = key.split(',').map(Number);
        return wordSearch.grid[kr]?.[kc] || '';
      })
      .join('');
    const reverseLetters = forwardLetters.split('').reverse().join('');

    const matched = wordSearch.words.find(
      (w) =>
        !wsFoundWords.includes(w.word) &&
        (w.word === forwardLetters || w.word === reverseLetters),
    );

    if (matched) {
      setWsFoundWords((prev) => [...prev, matched.word]);
      setWsStart(null);
    } else {
      setWsWrongFlash(lineKeys);
      setWsStart(null);
      setTimeout(() => setWsWrongFlash([]), 450);
    }
  };

  /* ------------------ 3. MATCHING PUZZLE STATE ------------------ */
  const { matchingPuzzle } = games;
  const [shuffledTerms, setShuffledTerms] = useState<PuzzlePair[]>([]);
  const [shuffledDefs, setShuffledDefs] = useState<PuzzlePair[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [wrongMatchFlash, setWrongMatchFlash] = useState<string | null>(null);
  const [matchAttempts, setMatchAttempts] = useState(0);
  const [showMatchHints, setShowMatchHints] = useState(false);

  const resetMatching = () => {
    setShuffledTerms(shuffleArray(matchingPuzzle.pairs));
    setShuffledDefs(shuffleArray(matchingPuzzle.pairs));
    setSelectedTermId(null);
    setMatchedIds([]);
    setWrongMatchFlash(null);
    setMatchAttempts(0);
  };

  useEffect(() => {
    resetMatching();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchingPuzzle]);

  const handleSelectDefinition = (defId: string) => {
    if (!selectedTermId || matchedIds.includes(defId)) return;
    setMatchAttempts((a) => a + 1);
    if (selectedTermId === defId) {
      setMatchedIds((prev) => [...prev, defId]);
      setSelectedTermId(null);
      setWrongMatchFlash(null);
    } else {
      setWrongMatchFlash(defId);
      setTimeout(() => setWrongMatchFlash(null), 550);
    }
  };

  /* ------------------ 4. SEQUENCE PUZZLE STATE ------------------ */
  const { sequencePuzzle } = games;
  const [sequenceItems, setSequenceItems] = useState<PuzzleSequenceStep[]>([]);
  const [sequenceChecked, setSequenceChecked] = useState(false);

  const resetSequence = () => {
    const sorted = [...sequencePuzzle.steps].sort((a, b) => a.order - b.order);
    let mixed = shuffleArray(sorted);
    if (
      mixed.length > 1 &&
      mixed.every((item, idx) => item.order === sorted[idx].order)
    ) {
      mixed = [...mixed.slice(1), mixed[0]];
    }
    setSequenceItems(mixed);
    setSequenceChecked(false);
  };

  useEffect(() => {
    resetSequence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sequencePuzzle]);

  const moveSequenceItem = (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= sequenceItems.length) return;
    const next = [...sequenceItems];
    [next[index], next[target]] = [next[target], next[index]];
    setSequenceItems(next);
    setSequenceChecked(false);
  };

  const sequenceCorrectCount = useMemo(() => {
    const sorted = [...sequencePuzzle.steps].sort((a, b) => a.order - b.order);
    return sequenceItems.filter((item, idx) => item.order === sorted[idx]?.order)
      .length;
  }, [sequenceItems, sequencePuzzle.steps]);

  /* ------------------ 5. ANAGRAM PUZZLE STATE ------------------ */
  const anagramPuzzle = games.anagramPuzzle;
  const [anagramIdx, setAnagramIdx] = useState(0);
  const [anagramTiles, setAnagramTiles] = useState<
    Array<{ idx: number; char: string }>
  >([]);
  const [anagramPicked, setAnagramPicked] = useState<
    Array<{ idx: number; char: string }>
  >([]);
  const [anagramSolvedIds, setAnagramSolvedIds] = useState<string[]>([]);
  const [anagramWrong, setAnagramWrong] = useState(false);

  const currentAnagram = anagramPuzzle?.items?.[anagramIdx];

  const setupAnagramWord = (word: string) => {
    const letters = word
      .toUpperCase()
      .split('')
      .map((char, idx) => ({ idx, char }));
    let mixed = shuffleArray(letters);
    if (mixed.length > 1 && mixed.map((l) => l.char).join('') === word) {
      mixed = [...mixed.slice(1), mixed[0]];
    }
    setAnagramTiles(mixed);
    setAnagramPicked([]);
    setAnagramWrong(false);
  };

  useEffect(() => {
    setAnagramIdx(0);
    setAnagramSolvedIds([]);
    if (anagramPuzzle?.items?.length) {
      setupAnagramWord(anagramPuzzle.items[0].word);
    }
  }, [anagramPuzzle]);

  useEffect(() => {
    if (currentAnagram) {
      setupAnagramWord(currentAnagram.word);
    }
  }, [anagramIdx, currentAnagram]);

  const handlePickAnagramTile = (tile: { idx: number; char: string }) => {
    if (!currentAnagram) return;
    if (anagramPicked.some((p) => p.idx === tile.idx)) return;

    const nextPicked = [...anagramPicked, tile];
    setAnagramPicked(nextPicked);
    setAnagramWrong(false);

    if (nextPicked.length === currentAnagram.word.length) {
      const attempt = nextPicked.map((p) => p.char).join('');
      if (attempt === currentAnagram.word.toUpperCase()) {
        setAnagramSolvedIds((prev) =>
          prev.includes(currentAnagram.id) ? prev : [...prev, currentAnagram.id],
        );
      } else {
        setAnagramWrong(true);
      }
    }
  };

  const handlePopAnagramTile = () => {
    setAnagramWrong(false);
    setAnagramPicked((prev) => prev.slice(0, -1));
  };

  /* ------------------ 6. TRUE/FALSE BLITZ STATE ------------------ */
  const trueFalseBlitz = games.trueFalseBlitz;
  const [tfIndex, setTfIndex] = useState(0);
  const [tfTimeLeft, setTfTimeLeft] = useState(15);
  const [tfAnswerState, setTfAnswerState] = useState<{
    chosen: boolean | null;
    isCorrect: boolean;
    timedOut?: boolean;
  } | null>(null);
  const [tfScore, setTfScore] = useState(0);
  const [tfStreak, setTfStreak] = useState(0);
  const [tfBestStreak, setTfBestStreak] = useState(0);
  const [tfFinished, setTfFinished] = useState(false);

  const resetTrueFalse = () => {
    setTfIndex(0);
    setTfTimeLeft(15);
    setTfAnswerState(null);
    setTfScore(0);
    setTfStreak(0);
    setTfBestStreak(0);
    setTfFinished(false);
  };

  useEffect(() => {
    resetTrueFalse();
  }, [trueFalseBlitz]);

  useEffect(() => {
    if (
      activeTab !== 'trueFalse' ||
      tfFinished ||
      tfAnswerState !== null ||
      !trueFalseBlitz?.items?.length
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setTfTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setTfAnswerState({ chosen: null, isCorrect: false, timedOut: true });
          setTfStreak(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [activeTab, tfFinished, tfAnswerState, trueFalseBlitz]);

  const handleTfChoice = (choice: boolean) => {
    const item = trueFalseBlitz?.items?.[tfIndex];
    if (!item || tfAnswerState !== null) return;
    const isCorrect = item.isTrue === choice;
    setTfAnswerState({ chosen: choice, isCorrect });
    if (isCorrect) {
      setTfScore((s) => s + 1);
      setTfStreak((st) => {
        const nextSt = st + 1;
        setTfBestStreak((b) => Math.max(b, nextSt));
        return nextSt;
      });
    } else {
      setTfStreak(0);
    }
  };

  const handleTfNext = () => {
    if (!trueFalseBlitz?.items?.length) return;
    if (tfIndex + 1 >= trueFalseBlitz.items.length) {
      setTfFinished(true);
    } else {
      setTfIndex((i) => i + 1);
      setTfTimeLeft(15);
      setTfAnswerState(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Topic-Themed Interactive Games Arena Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-200/80 shadow-md shadow-blue-900/10">
        {!arenaImgFailed ? (
          <img
            src={GAMES_ARENA_IMAGE}
            alt={`${topic} mavzusi bo'yicha o'yinlar arenasi`}
            referrerPolicy="no-referrer"
            onError={() => setArenaImgFailed(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        {!topicImgFailed ? (
          <img
            src={theme.imageUrl}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            onError={() => setTopicImgFailed(true)}
            className="absolute inset-0 h-full w-full object-cover opacity-35 mix-blend-overlay"
          />
        ) : null}
        <div
          className={`absolute inset-0 bg-gradient-to-r ${theme.bannerGradient}`}
        />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 p-6 sm:p-7 text-white">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-xs font-medium text-blue-100">
              <Gamepad2 className="h-4 w-4 text-amber-300" />
              <span>
                O‘yinlar arenasi · {subject} · 6 ta interaktiv o‘yin
              </span>
            </div>
            <h2 className="mt-1.5 font-display text-xl sm:text-2xl font-bold tracking-tight">
              {topic} — Krossvord, Pazl va Viktorinalar
            </h2>
            <p className="mt-1 text-sm text-blue-100/90">
              Sinf doskasida yoki o‘quvchilarning telefonida o‘ynash uchun mavzuga mos bezatilgan o‘yinlar to‘plami.
            </p>
          </div>

          <button
            type="button"
            disabled={isRegenerating}
            onClick={onRegenerate}
            className="no-print inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/15 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/25 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`}
            />
            <span>O‘yinlarni yangilash</span>
          </button>
        </div>

        {/* 6-Game Selector Bar */}
        <div className="no-print relative z-10 border-t border-white/15 bg-slate-950/35 px-4 py-3 backdrop-blur-md">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {GAME_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left transition-all ${
                    isActive
                      ? tab.activeClass
                      : 'bg-white/10 text-blue-50 hover:bg-white/20'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{tab.label}</p>
                    <p
                      className={`truncate text-[10px] ${
                        isActive ? 'text-white/85' : 'text-blue-200/80'
                      }`}
                    >
                      {tab.shortDesc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Animated Game Workspace */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* TAB 1: CROSSWORD */}
          {activeTab === 'crossword' && (
            <div className="relative overflow-hidden rounded-2xl border border-blue-200/80 bg-white shadow-sm shadow-blue-900/5">
              {/* Subtle Topic Artwork Header Backdrop inside game */}
              <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-blue-100 p-6">
                {!topicImgFailed && (
                  <img
                    src={theme.imageUrl}
                    alt=""
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10"
                  />
                )}
                <div className="relative z-10">
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    {crossword.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500 tabular-nums">
                    Joylashtirilgan so‘zlar: {crossword.placements.length} ta ·
                    To‘ldirilgan kataklar: {crosswordStats.filled} / {crosswordStats.total}
                  </p>
                </div>

                <div className="no-print relative z-10 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={revealSingleLetter}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200/80 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50/50 whitespace-nowrap shrink-0"
                  >
                    <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                    <span>Harf ochish</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckedCrossword(true)}
                    className="btn-sheen inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white shadow-sm shadow-blue-700/20 hover:bg-blue-800 whitespace-nowrap shrink-0"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Tekshirish</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200/80 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50/50 whitespace-nowrap shrink-0"
                  >
                    {showKey ? (
                      <>
                        <EyeOff className="h-3.5 w-3.5" />
                        <span>Kalitni yashirish</span>
                      </>
                    ) : (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        <span>Javoblar kaliti</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUserGrid({});
                      setCheckedCrossword(false);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200/80 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50/50 whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Tozalash</span>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {checkedCrossword && (
                  <div
                    className={`mb-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium ${
                      crosswordStats.correct === crosswordStats.total
                        ? 'border-emerald-200 bg-emerald-50/80 text-emerald-900'
                        : 'border-amber-200 bg-amber-50/80 text-amber-900'
                    }`}
                  >
                    {crosswordStats.correct === crosswordStats.total ? (
                      <>
                        <Trophy className="h-4 w-4 shrink-0 text-emerald-700" />
                        <span>
                          Barakalla! Barcha {crosswordStats.total} ta katak to‘g‘ri topildi.
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 shrink-0 text-amber-700" />
                        <span className="tabular-nums">
                          To‘g‘ri kataklar: {crosswordStats.correct} /{' '}
                          {crosswordStats.total}. Qizil kataklarni qayta tekshiring.
                        </span>
                      </>
                    )}
                  </div>
                )}

                {activePlacement && (
                  <div className="mb-5 rounded-xl bg-blue-50/80 px-4 py-3 text-sm text-slate-800 border border-blue-100">
                    <span className="font-mono font-semibold text-blue-700">
                      {activePlacement.number}-savol (
                      {activePlacement.direction === 'across'
                        ? 'Gorizontal'
                        : 'Vertikal'}
                      ):
                    </span>{' '}
                    <span className="text-slate-700">{activePlacement.clue}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
                  <div className="xl:col-span-7 overflow-x-auto pb-2">
                    <div
                      className="relative inline-grid gap-1 rounded-xl border border-blue-200/80 bg-blue-50/80 p-3.5 overflow-hidden"
                      style={{
                        gridTemplateColumns: `repeat(${crossword.cols}, minmax(2rem, 2.5rem))`,
                      }}
                    >
                      {Array.from({ length: crossword.rows }).map((_, r) =>
                        Array.from({ length: crossword.cols }).map((__, c) => {
                          const k = `${r},${c}`;
                          const meta = cellMap.get(k);
                          if (!meta) {
                            return (
                              <div
                                key={k}
                                className="h-8 w-8 sm:h-10 sm:w-10 rounded bg-transparent"
                                aria-hidden="true"
                              />
                            );
                          }

                          const isSelected =
                            selectedCell?.row === r && selectedCell?.col === c;
                          const isInWord = activeWordKeys.has(k);
                          const userVal = userGrid[k] || '';
                          const displayVal = showKey ? meta.expected : userVal;
                          const isWrong =
                            checkedCrossword &&
                            !showKey &&
                            userVal !== '' &&
                            userVal !== meta.expected;
                          const isRight =
                            checkedCrossword &&
                            !showKey &&
                            userVal === meta.expected;

                          return (
                            <div
                              key={k}
                              onClick={() => handleCellClick(r, c)}
                              className={`relative h-8 w-8 sm:h-10 sm:w-10 rounded-md border transition-colors ${
                                isSelected
                                  ? 'border-blue-700 bg-blue-100 shadow-xs'
                                  : isWrong
                                    ? 'border-rose-400 bg-rose-50'
                                    : isRight
                                      ? 'border-emerald-400 bg-emerald-50'
                                      : isInWord
                                        ? 'border-blue-300 bg-blue-50'
                                        : 'border-blue-200 bg-white'
                              }`}
                            >
                              {meta.number !== undefined && (
                                <span className="pointer-events-none absolute left-1 top-0.5 font-mono text-[9px] font-semibold leading-none text-blue-600 tabular-nums">
                                  {meta.number}
                                </span>
                              )}
                              <input
                                ref={(el) => {
                                  inputRefs.current[k] = el;
                                }}
                                type="text"
                                maxLength={2}
                                value={displayVal}
                                readOnly={showKey}
                                aria-label={`${r + 1}-qator, ${c + 1}-ustun`}
                                onFocus={() => setSelectedCell({ row: r, col: c })}
                                onChange={(e) =>
                                  handleLetterChange(r, c, e.target.value)
                                }
                                onKeyDown={(e) => handleCellKeyDown(e, r, c)}
                                className={`h-full w-full bg-transparent pt-1.5 text-center font-mono text-sm sm:text-base font-bold uppercase focus:outline-none ${
                                  showKey
                                    ? 'text-blue-800'
                                    : isWrong
                                      ? 'text-rose-800'
                                      : isRight
                                        ? 'text-emerald-800'
                                        : 'text-slate-900'
                                }`}
                              />
                            </div>
                          );
                        }),
                      )}
                    </div>
                  </div>

                  <div className="xl:col-span-5 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-1">
                    <div>
                      <h4 className="text-xs font-semibold text-blue-700 border-b border-blue-100 pb-2">
                        Gorizontal (Bo‘yiga)
                      </h4>
                      <ul className="mt-2.5 space-y-1.5">
                        {acrossClues.map((p) => {
                          const isActive =
                            activePlacement?.number === p.number &&
                            activePlacement?.direction === 'across';
                          return (
                            <li key={`across-${p.number}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDir('across');
                                  focusCell(p.row, p.col);
                                }}
                                className={`w-full rounded-lg px-3 py-2 text-left text-xs leading-relaxed transition-colors ${
                                  isActive
                                    ? 'bg-blue-100/80 font-medium text-blue-950'
                                    : 'text-slate-600 hover:bg-blue-50/70 hover:text-slate-900'
                                }`}
                              >
                                <span className="font-mono font-semibold text-blue-700 tabular-nums mr-1.5">
                                  {p.number}.
                                </span>
                                <span>{p.clue}</span>
                                <span className="ml-1.5 text-slate-400 tabular-nums">
                                  ({p.word.length} harf)
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-indigo-700 border-b border-blue-100 pb-2">
                        Vertikal (Eniga)
                      </h4>
                      <ul className="mt-2.5 space-y-1.5">
                        {downClues.map((p) => {
                          const isActive =
                            activePlacement?.number === p.number &&
                            activePlacement?.direction === 'down';
                          return (
                            <li key={`down-${p.number}`}>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDir('down');
                                  focusCell(p.row, p.col);
                                }}
                                className={`w-full rounded-lg px-3 py-2 text-left text-xs leading-relaxed transition-colors ${
                                  isActive
                                    ? 'bg-indigo-100/80 font-medium text-indigo-950'
                                    : 'text-slate-600 hover:bg-blue-50/70 hover:text-slate-900'
                                }`}
                              >
                                <span className="font-mono font-semibold text-indigo-700 tabular-nums mr-1.5">
                                  {p.number}.
                                </span>
                                <span>{p.clue}</span>
                                <span className="ml-1.5 text-slate-400 tabular-nums">
                                  ({p.word.length} harf)
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: WORD SEARCH */}
          {activeTab === 'wordSearch' && (
            <div className="relative overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-sm shadow-emerald-900/5">
              <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-emerald-100 p-6">
                {!topicImgFailed && (
                  <img
                    src={theme.imageUrl}
                    alt=""
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10"
                  />
                )}
                <div className="relative z-10">
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    {wordSearch?.title || "So'z izlash o'yini"}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    So‘zning birinchi harfini bosing, so‘ng oxirgi harfini tanlang (gorizontal, vertikal yoki diagonal).
                  </p>
                </div>

                {wordSearch && (
                  <div className="relative z-10 flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-emerald-700 tabular-nums">
                      Topildi: {wsFoundWords.length} / {wordSearch.words.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => setWsShowClues((v) => !v)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50"
                    >
                      <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                      <span>{wsShowClues ? 'Izohlarni yashirish' : 'Izohlar'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWsStart(null);
                        setWsFoundWords([]);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-emerald-50"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Qayta boshlash</span>
                    </button>
                  </div>
                )}
              </div>

              {!wordSearch || !wordSearch.grid?.length ? (
                <div className="p-8 text-center space-y-3">
                  <p className="text-sm text-slate-600">
                    Ushbu eski saqlangan darsda so‘z izlash jadvali hali yaratilmagan.
                  </p>
                  <button
                    type="button"
                    disabled={isRegenerating}
                    onClick={onRegenerate}
                    className="btn-sheen inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`}
                    />
                    <span>O‘yinlarni yangilab yaratish</span>
                  </button>
                </div>
              ) : (
                <div className="p-6 space-y-5">
                  {wsFoundWords.length === wordSearch.words.length &&
                    wordSearch.words.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
                      >
                        <Trophy className="h-5 w-5 text-emerald-600" />
                        <span>
                          Ajoyib! Jadvaldagi barcha {wordSearch.words.length} ta so‘z topildi!
                        </span>
                      </motion.div>
                    )}

                  <div className="grid grid-cols-1 gap-8 xl:grid-cols-12 items-start">
                    <div className="xl:col-span-7 overflow-x-auto pb-2">
                      <div
                        className="inline-grid gap-1 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3"
                        style={{
                          gridTemplateColumns: `repeat(${wordSearch.size}, minmax(1.9rem, 2.35rem))`,
                        }}
                      >
                        {wordSearch.grid.map((rowArr, r) =>
                          rowArr.map((letter, c) => {
                            const key = `${r},${c}`;
                            const isSelectedStart =
                              wsStart?.row === r && wsStart?.col === c;
                            const foundCls = wsCellColorMap.get(key);
                            const isWrong = wsWrongFlash.includes(key);

                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => handleWsCellClick(r, c)}
                                className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md border font-mono text-sm font-bold transition-transform active:scale-95 ${
                                  isSelectedStart
                                    ? 'border-blue-700 bg-blue-600 text-white scale-105 shadow-sm'
                                    : isWrong
                                      ? 'border-rose-400 bg-rose-100 text-rose-800'
                                      : foundCls
                                        ? `${foundCls} font-extrabold`
                                        : 'border-emerald-200/80 bg-white text-slate-800 hover:border-emerald-400 hover:bg-emerald-50'
                                }`}
                              >
                                {letter}
                              </button>
                            );
                          }),
                        )}
                      </div>
                    </div>

                    <div className="xl:col-span-5 space-y-2.5">
                      <h4 className="text-xs font-semibold text-emerald-700 border-b border-emerald-100 pb-2">
                        Qidiriladigan atamalar ({wordSearch.words.length} ta)
                      </h4>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-1">
                        {wordSearch.words.map((w, idx) => {
                          const isFound = wsFoundWords.includes(w.word);
                          const colorCls =
                            WORD_SEARCH_COLORS[idx % WORD_SEARCH_COLORS.length];
                          return (
                            <div
                              key={w.word}
                              className={`rounded-xl border p-3 transition-all ${
                                isFound
                                  ? `${colorCls} opacity-90`
                                  : 'border-slate-200 bg-slate-50/70 text-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span
                                  className={`font-mono text-sm font-bold ${
                                    isFound ? 'line-through' : ''
                                  }`}
                                >
                                  {w.word}
                                </span>
                                {isFound && (
                                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                                )}
                              </div>
                              {wsShowClues && (
                                <p className="mt-1 text-xs opacity-85">
                                  {w.clue}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: MATCHING TILE PUZZLE */}
          {activeTab === 'matching' && (
            <div className="relative overflow-hidden rounded-2xl border border-violet-200/80 bg-white shadow-sm shadow-violet-900/5">
              <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-violet-100 p-6">
                {!topicImgFailed && (
                  <img
                    src={theme.imageUrl}
                    alt=""
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10"
                  />
                )}
                <div className="relative z-10">
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    {matchingPuzzle.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {matchingPuzzle.instructions}
                  </p>
                </div>

                <div className="relative z-10 flex items-center gap-2.5">
                  <span className="font-mono text-xs font-semibold text-violet-700 tabular-nums">
                    {matchedIds.length} / {matchingPuzzle.pairs.length} · Urinish:{' '}
                    {matchAttempts}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowMatchHints((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-violet-50 whitespace-nowrap shrink-0"
                  >
                    <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                    <span>{showMatchHints ? 'Yordamni yopish' : 'Yordam'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetMatching}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-violet-50 whitespace-nowrap shrink-0"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    <span>Aralashtirish</span>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {matchedIds.length === matchingPuzzle.pairs.length && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
                  >
                    <Trophy className="h-4 w-4 text-emerald-700" />
                    <span>
                      Ajoyib! Barcha {matchingPuzzle.pairs.length} ta pazl bo‘lagi{' '}
                      {matchAttempts} urinishda to‘g‘ri birlashtirildi.
                    </span>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold text-violet-700">
                      1-qism: Atama yoki tushunchani tanlang
                    </p>
                    {shuffledTerms.map((pair) => {
                      const isMatched = matchedIds.includes(pair.id);
                      const isSelected = selectedTermId === pair.id;
                      return (
                        <motion.button
                          key={pair.id}
                          type="button"
                          layout
                          disabled={isMatched}
                          onClick={() => setSelectedTermId(pair.id)}
                          className={`w-full rounded-xl border p-4 text-left transition-all ${
                            isMatched
                              ? 'border-emerald-300 bg-emerald-50/80 text-emerald-900'
                              : isSelected
                                ? 'border-violet-600 bg-violet-50 shadow-sm shadow-violet-600/15'
                                : 'border-violet-200/80 bg-white hover:border-violet-400'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold">
                              {pair.term}
                            </span>
                            {isMatched && (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="h-4 w-4" />
                                Birlashtirildi
                              </span>
                            )}
                          </div>
                          {showMatchHints && !isMatched && (
                            <p className="mt-1.5 text-xs text-slate-500">
                              Ishora: {pair.hint}
                            </p>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="space-y-2.5">
                    <p className="text-xs font-semibold text-indigo-700">
                      2-qism: Mos ta’rif yoki javobni bosing
                    </p>
                    {shuffledDefs.map((pair) => {
                      const isMatched = matchedIds.includes(pair.id);
                      const isWrong = wrongMatchFlash === pair.id;
                      return (
                        <motion.button
                          key={pair.id}
                          type="button"
                          layout
                          animate={isWrong ? { x: [-5, 5, -4, 4, 0] } : { x: 0 }}
                          transition={{ duration: 0.3 }}
                          disabled={isMatched || !selectedTermId}
                          onClick={() => handleSelectDefinition(pair.id)}
                          className={`w-full rounded-xl border p-4 text-left text-sm leading-relaxed transition-colors ${
                            isMatched
                              ? 'border-emerald-300 bg-emerald-50/80 text-emerald-900'
                              : isWrong
                                ? 'border-rose-400 bg-rose-50 text-rose-900'
                                : selectedTermId
                                  ? 'border-violet-300 bg-white hover:border-violet-600 hover:bg-violet-50/40'
                                  : 'border-slate-200 bg-slate-50/70 text-slate-500'
                          }`}
                        >
                          {pair.definition}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SEQUENCE PUZZLE */}
          {activeTab === 'sequence' && (
            <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-sm shadow-amber-900/5">
              <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-amber-100 p-6">
                {!topicImgFailed && (
                  <img
                    src={theme.imageUrl}
                    alt=""
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10"
                  />
                )}
                <div className="relative z-10">
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    {sequencePuzzle.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {sequencePuzzle.instructions}
                  </p>
                </div>

                <div className="relative z-10 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSequenceChecked(true)}
                    className="btn-sheen inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-amber-600/20 hover:bg-amber-700 whitespace-nowrap shrink-0"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Tartibni tekshirish</span>
                  </button>
                  <button
                    type="button"
                    onClick={resetSequence}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-amber-50 whitespace-nowrap shrink-0"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    <span>Qayta aralashtirish</span>
                  </button>
                </div>
              </div>

              <div className="p-6">
                {sequenceChecked && (
                  <div
                    className={`mb-5 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${
                      sequenceCorrectCount === sequenceItems.length
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-amber-200 bg-amber-50 text-amber-900'
                    }`}
                  >
                    {sequenceCorrectCount === sequenceItems.length ? (
                      <>
                        <Trophy className="h-4 w-4 text-emerald-700" />
                        <span>
                          Mukammal! Barcha {sequenceItems.length} ta bosqich to‘g‘ri
                          ketma-ketlikda terildi.
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-amber-700" />
                        <span className="tabular-nums">
                          To‘g‘ri o‘rindagi bosqichlar: {sequenceCorrectCount} /{' '}
                          {sequenceItems.length}. O‘q tugmalari bilan joyini almashtiring.
                        </span>
                      </>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  {sequenceItems.map((step, idx) => {
                    const isPositionCorrect =
                      sequenceChecked && step.order === idx + 1;
                    const isPositionWrong =
                      sequenceChecked && step.order !== idx + 1;

                    return (
                      <motion.div
                        key={step.order}
                        layout
                        transition={{ duration: 0.2 }}
                        className={`flex items-center justify-between gap-4 rounded-xl border p-4 transition-colors ${
                          isPositionCorrect
                            ? 'border-emerald-300 bg-emerald-50/70'
                            : isPositionWrong
                              ? 'border-rose-300 bg-rose-50/70'
                              : 'border-amber-200/80 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-3.5">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 font-mono text-xs font-bold text-amber-800 tabular-nums">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900">
                              {step.title}
                            </h4>
                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                              {step.detail}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            aria-label="Yuqoriga surish"
                            onClick={() => moveSequenceItem(idx, -1)}
                            className="rounded-lg border border-amber-200 bg-white p-2 text-slate-600 hover:bg-amber-50 disabled:opacity-35"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === sequenceItems.length - 1}
                            aria-label="Pastga surish"
                            onClick={() => moveSequenceItem(idx, 1)}
                            className="rounded-lg border border-amber-200 bg-white p-2 text-slate-600 hover:bg-amber-50 disabled:opacity-35"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ANAGRAM (WORD UNSCRAMBLE) */}
          {activeTab === 'anagram' && (
            <div className="relative overflow-hidden rounded-2xl border border-sky-200/80 bg-white shadow-sm shadow-sky-900/5">
              <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-sky-100 p-6">
                {!topicImgFailed && (
                  <img
                    src={theme.imageUrl}
                    alt=""
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10"
                  />
                )}
                <div className="relative z-10">
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    {anagramPuzzle?.title || "Anagramma (So'z yig'ish)"}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {anagramPuzzle?.instructions ||
                      "Aralashtirilgan harflarni ketma-ket bosib mavzuga oid atamani yig'ing."}
                  </p>
                </div>

                {anagramPuzzle?.items?.length ? (
                  <div className="relative z-10 flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-sky-700 tabular-nums">
                      Topilgan: {anagramSolvedIds.length} /{' '}
                      {anagramPuzzle.items.length}
                    </span>
                  </div>
                ) : null}
              </div>

              {!anagramPuzzle?.items?.length || !currentAnagram ? (
                <div className="p-8 text-center space-y-3">
                  <p className="text-sm text-slate-600">
                    Ushbu eski darsda anagramma o‘yini hali yaratilmagan.
                  </p>
                  <button
                    type="button"
                    disabled={isRegenerating}
                    onClick={onRegenerate}
                    className="btn-sheen inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`}
                    />
                    <span>O‘yinlarni yangilab yaratish</span>
                  </button>
                </div>
              ) : (
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Word Progress Dots */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      {anagramPuzzle.items.map((item, idx) => {
                        const isDone = anagramSolvedIds.includes(item.id);
                        const isCur = idx === anagramIdx;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setAnagramIdx(idx)}
                            className={`h-8 w-8 rounded-lg font-mono text-xs font-bold transition-all ${
                              isCur
                                ? 'bg-sky-600 text-white shadow-sm'
                                : isDone
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-sky-50 text-slate-600 border border-sky-200 hover:bg-sky-100'
                            }`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePopAnagramTile}
                        disabled={anagramPicked.length === 0}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-sky-50 disabled:opacity-40"
                      >
                        <Eraser className="h-3.5 w-3.5" />
                        <span>Oxirgi harfni o‘chirish</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setupAnagramWord(currentAnagram.word)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-sky-50"
                      >
                        <Shuffle className="h-3.5 w-3.5" />
                        <span>Qayta aralashtirish</span>
                      </button>
                    </div>
                  </div>

                  {/* Clue card */}
                  <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
                    <p className="text-xs font-semibold text-sky-700">
                      So‘z uchun ishora ({currentAnagram.word.length} ta harf)
                    </p>
                    <p className="mt-1 text-base font-medium text-slate-900">
                      {currentAnagram.hint}
                    </p>
                  </div>

                  {/* Answer Slots */}
                  <div className="flex flex-wrap justify-center gap-2 py-2">
                    {Array.from({ length: currentAnagram.word.length }).map(
                      (_, slotIdx) => {
                        const filled = anagramPicked[slotIdx];
                        const isWordSolved = anagramSolvedIds.includes(
                          currentAnagram.id,
                        );
                        return (
                          <div
                            key={slotIdx}
                            className={`flex h-12 w-11 sm:h-14 sm:w-12 items-center justify-center rounded-xl border-2 font-mono text-xl font-bold transition-all ${
                              isWordSolved
                                ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                                : anagramWrong
                                  ? 'border-rose-400 bg-rose-50 text-rose-800'
                                  : filled
                                    ? 'border-sky-600 bg-sky-50 text-sky-900'
                                    : 'border-dashed border-sky-300 bg-slate-50 text-slate-400'
                            }`}
                          >
                            {filled ? filled.char : ''}
                          </div>
                        );
                      },
                    )}
                  </div>

                  {/* Feedback */}
                  {anagramSolvedIds.includes(currentAnagram.id) && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
                    >
                      <span className="inline-flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                        To‘g‘ri! &ldquo;{currentAnagram.word}&rdquo; so‘zi topildi.
                      </span>
                      {anagramIdx + 1 < anagramPuzzle.items.length && (
                        <button
                          type="button"
                          onClick={() => setAnagramIdx((i) => i + 1)}
                          className="btn-sheen inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                        >
                          <span>Keyingi so‘z</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </motion.div>
                  )}

                  {anagramWrong && (
                    <p className="text-center text-xs font-medium text-rose-700">
                      Harflar tartibi mos kelmadi. Harflarni o‘chirib qayta urinib ko‘ring.
                    </p>
                  )}

                  {/* Clickable Shuffled Letter Tiles */}
                  <div className="flex flex-wrap justify-center gap-2.5 pt-2">
                    {anagramTiles.map((tile) => {
                      const isUsed = anagramPicked.some(
                        (p) => p.idx === tile.idx,
                      );
                      return (
                        <button
                          key={tile.idx}
                          type="button"
                          disabled={isUsed}
                          onClick={() => handlePickAnagramTile(tile)}
                          className={`flex h-12 w-11 sm:h-14 sm:w-12 items-center justify-center rounded-xl border font-mono text-lg font-bold shadow-xs transition-all active:scale-95 ${
                            isUsed
                              ? 'border-slate-200 bg-slate-100 text-slate-300 opacity-50'
                              : 'border-sky-300 bg-white text-sky-900 hover:-translate-y-0.5 hover:border-sky-600 hover:bg-sky-50'
                          }`}
                        >
                          {tile.char}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: TIMED TRUE/FALSE BLITZ */}
          {activeTab === 'trueFalse' && (
            <div className="relative overflow-hidden rounded-2xl border border-rose-200/80 bg-white shadow-sm shadow-rose-900/5">
              <div className="relative flex flex-wrap items-center justify-between gap-4 border-b border-rose-100 p-6">
                {!topicImgFailed && (
                  <img
                    src={theme.imageUrl}
                    alt=""
                    aria-hidden="true"
                    referrerPolicy="no-referrer"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10"
                  />
                )}
                <div className="relative z-10">
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    {trueFalseBlitz?.title || 'Tezkor Viktorina (To‘g‘ri / Noto‘g‘ri)'}
                  </h3>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {trueFalseBlitz?.instructions ||
                      'Har bir fikr uchun 15 soniya ichida To‘g‘ri yoki Noto‘g‘ri tugmasini bosing.'}
                  </p>
                </div>

                {trueFalseBlitz?.items?.length ? (
                  <div className="relative z-10 flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1.5 font-mono text-xs font-bold text-amber-800 tabular-nums">
                      <Flame className="h-3.5 w-3.5 text-amber-600" />
                      Seriya: x{tfStreak}
                    </span>
                    <span className="font-mono text-xs font-semibold text-rose-700 tabular-nums">
                      Ball: {tfScore} / {trueFalseBlitz.items.length}
                    </span>
                  </div>
                ) : null}
              </div>

              {!trueFalseBlitz?.items?.length ? (
                <div className="p-8 text-center space-y-3">
                  <p className="text-sm text-slate-600">
                    Ushbu eski darsda tezkor viktorina hali yaratilmagan.
                  </p>
                  <button
                    type="button"
                    disabled={isRegenerating}
                    onClick={onRegenerate}
                    className="btn-sheen inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`}
                    />
                    <span>O‘yinlarni yangilab yaratish</span>
                  </button>
                </div>
              ) : tfFinished ? (
                <div className="p-8 text-center space-y-5">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-md">
                    <Trophy className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="font-display text-2xl font-bold text-slate-900 tabular-nums">
                      Natija: {tfScore} / {trueFalseBlitz.items.length}
                    </h4>
                    <p className="mt-1 text-sm text-slate-600 tabular-nums">
                      Eng uzun ketma-ket to‘g‘ri javoblar seriyasi: {tfBestStreak}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={resetTrueFalse}
                    className="btn-sheen inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Qayta o‘ynash</span>
                  </button>
                </div>
              ) : (
                <div className="p-6 sm:p-8 space-y-6">
                  {/* Timer Bar & Counter */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="font-mono text-slate-500 tabular-nums">
                        Fikr {tfIndex + 1} / {trueFalseBlitz.items.length}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 font-mono tabular-nums ${
                          tfTimeLeft <= 5 ? 'text-rose-600' : 'text-slate-700'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {tfTimeLeft} soniya
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-rose-100">
                      <div
                        className={`h-full transition-all duration-500 ${
                          tfTimeLeft <= 5 ? 'bg-rose-600' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${(tfTimeLeft / 15) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Statement Card */}
                  <div className="rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50/50 via-white to-amber-50/40 p-6 sm:p-8 text-center">
                    <p className="font-display text-lg sm:text-xl font-semibold leading-relaxed text-slate-900">
                      {trueFalseBlitz.items[tfIndex].statement}
                    </p>
                  </div>

                  {/* Choice Buttons */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      disabled={tfAnswerState !== null}
                      onClick={() => handleTfChoice(true)}
                      className={`btn-sheen flex items-center justify-center gap-2 rounded-xl border-2 px-5 py-4 text-sm font-bold transition-all ${
                        tfAnswerState
                          ? trueFalseBlitz.items[tfIndex].isTrue
                            ? 'border-emerald-500 bg-emerald-600 text-white'
                            : tfAnswerState.chosen === true
                              ? 'border-rose-400 bg-rose-100 text-rose-900'
                              : 'border-slate-200 bg-slate-50 text-slate-400'
                          : 'border-emerald-500 bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                      <span>To‘g‘ri</span>
                    </button>

                    <button
                      type="button"
                      disabled={tfAnswerState !== null}
                      onClick={() => handleTfChoice(false)}
                      className={`btn-sheen flex items-center justify-center gap-2 rounded-xl border-2 px-5 py-4 text-sm font-bold transition-all ${
                        tfAnswerState
                          ? !trueFalseBlitz.items[tfIndex].isTrue
                            ? 'border-emerald-500 bg-emerald-600 text-white'
                            : tfAnswerState.chosen === false
                              ? 'border-rose-400 bg-rose-100 text-rose-900'
                              : 'border-slate-200 bg-slate-50 text-slate-400'
                          : 'border-rose-500 bg-rose-600 text-white hover:bg-rose-700'
                      }`}
                    >
                      <XCircle className="h-5 w-5" />
                      <span>Noto‘g‘ri</span>
                    </button>
                  </div>

                  {/* Explanation & Next */}
                  {tfAnswerState && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex flex-wrap items-center justify-between gap-4 rounded-xl border p-4 ${
                        tfAnswerState.isCorrect
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                          : 'border-amber-200 bg-amber-50 text-amber-950'
                      }`}
                    >
                      <div className="max-w-2xl text-sm">
                        <p className="font-semibold flex items-center gap-1.5">
                          <Sparkles className="h-4 w-4 shrink-0" />
                          {tfAnswerState.timedOut
                            ? 'Vaqt tugadi!'
                            : tfAnswerState.isCorrect
                              ? 'To‘g‘ri javob!'
                              : 'Noto‘g‘ri javob'}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed opacity-90">
                          {trueFalseBlitz.items[tfIndex].explanation}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleTfNext}
                        className="btn-sheen inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 whitespace-nowrap shrink-0"
                      >
                        <span>
                          {tfIndex + 1 >= trueFalseBlitz.items.length
                            ? 'Natijani ko‘rish'
                            : 'Keyingi savol'}
                        </span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
