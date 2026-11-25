import type { LessonVisualTheme } from '../types/lesson.ts';

export interface ThemeVisualConfig {
  id: LessonVisualTheme;
  label: string;
  imageUrl: string;
  gamesImageUrl: string;
  bannerGradient: string;
  accentBg: string;
  accentBgHover: string;
  accentText: string;
  softBg: string;
  softBorder: string;
  dotColor: string;
}

export const GAMES_ARENA_IMAGE =
  '/src/assets/images/theme_games_arena_1795588037097.jpg';

const THEME_CONFIGS: Record<LessonVisualTheme, ThemeVisualConfig> = {
  biology_nature: {
    id: 'biology_nature',
    label: 'Tabiat va hayot fanlari',
    imageUrl: '/src/assets/images/theme_biology_nature_1795588034002.jpg',
    gamesImageUrl: GAMES_ARENA_IMAGE,
    bannerGradient: 'from-emerald-900/90 via-teal-800/80 to-cyan-900/75',
    accentBg: 'bg-emerald-600',
    accentBgHover: 'hover:bg-emerald-700',
    accentText: 'text-emerald-700',
    softBg: 'bg-emerald-50/80',
    softBorder: 'border-emerald-200',
    dotColor: 'bg-emerald-600',
  },
  math_tech: {
    id: 'math_tech',
    label: 'Matematika va texnologiya',
    imageUrl: '/src/assets/images/theme_math_tech_1795588033813.jpg',
    gamesImageUrl: GAMES_ARENA_IMAGE,
    bannerGradient: 'from-blue-950/90 via-indigo-900/85 to-cyan-900/75',
    accentBg: 'bg-indigo-600',
    accentBgHover: 'hover:bg-indigo-700',
    accentText: 'text-indigo-700',
    softBg: 'bg-indigo-50/80',
    softBorder: 'border-indigo-200',
    dotColor: 'bg-indigo-600',
  },
  history_heritage: {
    id: 'history_heritage',
    label: 'Tarix va madaniy meros',
    imageUrl: '/src/assets/images/theme_history_heritage_1795588034719.jpg',
    gamesImageUrl: GAMES_ARENA_IMAGE,
    bannerGradient: 'from-slate-900/88 via-blue-950/80 to-amber-900/70',
    accentBg: 'bg-amber-600',
    accentBgHover: 'hover:bg-amber-700',
    accentText: 'text-amber-700',
    softBg: 'bg-amber-50/80',
    softBorder: 'border-amber-200',
    dotColor: 'bg-amber-600',
  },
  physics_cosmos: {
    id: 'physics_cosmos',
    label: 'Fizika va koinot',
    imageUrl: '/src/assets/images/theme_physics_cosmos_1795588035709.jpg',
    gamesImageUrl: GAMES_ARENA_IMAGE,
    bannerGradient: 'from-slate-950/90 via-blue-900/85 to-sky-800/75',
    accentBg: 'bg-sky-600',
    accentBgHover: 'hover:bg-sky-700',
    accentText: 'text-sky-700',
    softBg: 'bg-sky-50/80',
    softBorder: 'border-sky-200',
    dotColor: 'bg-sky-600',
  },
  language_arts: {
    id: 'language_arts',
    label: 'Til, adabiyot va ijod',
    imageUrl: '/src/assets/images/theme_history_heritage_1795588034719.jpg',
    gamesImageUrl: GAMES_ARENA_IMAGE,
    bannerGradient: 'from-indigo-950/88 via-violet-900/80 to-blue-900/75',
    accentBg: 'bg-violet-600',
    accentBgHover: 'hover:bg-violet-700',
    accentText: 'text-violet-700',
    softBg: 'bg-violet-50/80',
    softBorder: 'border-violet-200',
    dotColor: 'bg-violet-600',
  },
};

export function inferVisualTheme(
  subject: string,
  topic: string,
  explicit?: LessonVisualTheme,
): LessonVisualTheme {
  if (explicit && explicit in THEME_CONFIGS) {
    return explicit;
  }
  const text = `${subject} ${topic}`.toLowerCase();
  if (
    /biolog|botanik|o‘simlik|osimlik|hujayra|fotosintez|ekolog|kimyo|tibbiyot|organ|hayvon/.test(
      text,
    )
  ) {
    return 'biology_nature';
  }
  if (
    /matemat|geometr|algebra|pifagor|tenglama|informat|dastur|algoritm|kod|kompyuter/.test(
      text,
    )
  ) {
    return 'math_tech';
  }
  if (
    /fizik|astronom|quyosh|sayyora|koinot|yorug|atom|elektr|energiya|geograf/.test(
      text,
    )
  ) {
    return 'physics_cosmos';
  }
  if (
    /tarix|temur|renessans|samarqand|madaniyat|davlat|urush|sulola|me'mor/.test(
      text,
    )
  ) {
    return 'history_heritage';
  }
  if (/til|adabiyot|she'r|ingliz|rus|grammatika|nutq|asar/.test(text)) {
    return 'language_arts';
  }
  return 'math_tech';
}

export function getThemeConfig(
  subject: string,
  topic: string,
  explicit?: LessonVisualTheme,
): ThemeVisualConfig {
  const key = inferVisualTheme(subject, topic, explicit);
  return THEME_CONFIGS[key];
}
