export type ModuleKey =
  | 'slides'
  | 'homework'
  | 'games'
  | 'methodologies'
  | 'tests';

export type LessonLanguage = 'uz' | 'ru' | 'en';
export type DifficultyLevel = 'oson' | 'orta' | 'qiyin';

export type LessonVisualTheme =
  | 'biology_nature'
  | 'math_tech'
  | 'history_heritage'
  | 'physics_cosmos'
  | 'language_arts';

export interface LessonRequest {
  topic: string;
  subject: string;
  gradeLevel: string;
  language: LessonLanguage;
  durationMinutes: number;
  difficulty: DifficultyLevel;
  selectedModules: ModuleKey[];
  extraNotes?: string;
}

export interface SlideKeyFact {
  label: string;
  value: string;
}

export interface SlideComparisonData {
  leftTitle: string;
  leftPoints: string[];
  rightTitle: string;
  rightPoints: string[];
}

export interface SlideProcessStep {
  step: string;
  detail: string;
}

export interface SlideItem {
  slideNumber: number;
  layoutType:
    | 'title'
    | 'concept'
    | 'comparison'
    | 'process'
    | 'fact_grid'
    | 'summary';
  title: string;
  subtitle?: string;
  leadParagraph: string;
  bulletPoints: string[];
  keyFacts: SlideKeyFact[];
  comparisonData?: SlideComparisonData;
  processSteps?: SlideProcessStep[];
  keyTakeaway: string;
  visualSuggestion: string;
  speakerNotes: string;
}

export interface HomeworkTask {
  tier: 'Bazaviy' | 'Amaliy' | 'Ijodiy';
  title: string;
  instructions: string;
  deliverable: string;
  estimatedMinutes: number;
  gradingCriteria: string[];
}

export interface HomeworkSection {
  overview: string;
  tasks: HomeworkTask[];
}

export interface CrosswordWordInput {
  word: string;
  clue: string;
}

export interface CrosswordPlacement {
  number: number;
  word: string;
  clue: string;
  row: number;
  col: number;
  direction: 'across' | 'down';
}

export interface CrosswordData {
  title: string;
  rows: number;
  cols: number;
  placements: CrosswordPlacement[];
  unplacedWords?: CrosswordWordInput[];
}

export interface WordSearchPlacement {
  word: string;
  clue: string;
  row: number;
  col: number;
  dr: number;
  dc: number;
}

export interface WordSearchData {
  title: string;
  size: number;
  grid: string[][];
  words: WordSearchPlacement[];
}

export interface PuzzlePair {
  id: string;
  term: string;
  definition: string;
  hint: string;
}

export interface PuzzleSequenceStep {
  order: number;
  title: string;
  detail: string;
}

export interface AnagramItem {
  id: string;
  word: string;
  hint: string;
}

export interface TrueFalseItem {
  id: number;
  statement: string;
  isTrue: boolean;
  explanation: string;
}

export interface InteractiveGamesData {
  crossword: CrosswordData;
  wordSearch: WordSearchData;
  matchingPuzzle: {
    title: string;
    instructions: string;
    pairs: PuzzlePair[];
  };
  sequencePuzzle: {
    title: string;
    instructions: string;
    steps: PuzzleSequenceStep[];
  };
  anagramPuzzle: {
    title: string;
    instructions: string;
    items: AnagramItem[];
  };
  trueFalseBlitz: {
    title: string;
    instructions: string;
    items: TrueFalseItem[];
  };
}

export interface MethodologyItem {
  name: string;
  category: string;
  durationMinutes: number;
  groupFormat: string;
  purpose: string;
  materialsNeeded: string[];
  steps: string[];
  topicExample: {
    prompt: string;
    sampleEntries: string[];
  };
}

export interface TestQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  difficulty: 'Oson' | "O'rta" | 'Qiyin';
  explanation: string;
}

export interface TestsSection {
  title: string;
  passingScorePercent: number;
  questions: TestQuestion[];
}

export interface GeneratedLesson {
  id: string;
  createdAt: string;
  topic: string;
  subject: string;
  gradeLevel: string;
  language: LessonLanguage;
  durationMinutes: number;
  difficulty: DifficultyLevel;
  visualTheme: LessonVisualTheme;
  summary: string;
  learningObjectives: string[];
  selectedModules: ModuleKey[];
  slides?: SlideItem[];
  homework?: HomeworkSection;
  games?: InteractiveGamesData;
  methodologies?: MethodologyItem[];
  tests?: TestsSection;
}
