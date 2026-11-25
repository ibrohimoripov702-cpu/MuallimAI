import React from 'react';
import {
  BookOpenCheck,
  Check,
  ClipboardList,
  Compass,
  Gamepad2,
  Loader2,
  Presentation,
} from 'lucide-react';
import { motion } from 'motion/react';
import type {
  DifficultyLevel,
  LessonLanguage,
  LessonRequest,
  ModuleKey,
} from '../types/lesson.ts';

interface LessonBuilderPanelProps {
  form: LessonRequest;
  isGenerating: boolean;
  error: string | null;
  telegramFirstName?: string | null;
  onChange: (next: LessonRequest) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const MODULE_OPTIONS: Array<{
  key: ModuleKey;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  activeCard: string;
  activeCheck: string;
  activeIcon: string;
}> = [
  {
    key: 'slides',
    title: 'Taqdimot slaydlari',
    description: '10 ta mavzuga mos dizaynli slayd, faktlar, sxemalar va nutq',
    icon: Presentation,
    activeCard: 'border-indigo-600 bg-indigo-50/75',
    activeCheck: 'border-indigo-600 bg-indigo-600 text-white',
    activeIcon: 'text-indigo-700',
  },
  {
    key: 'homework',
    title: 'Uyga vazifalar',
    description: 'Bazaviy, amaliy va ijodiy topshiriqlar + baholash mezoni',
    icon: ClipboardList,
    activeCard: 'border-emerald-600 bg-emerald-50/75',
    activeCheck: 'border-emerald-600 bg-emerald-600 text-white',
    activeIcon: 'text-emerald-700',
  },
  {
    key: 'games',
    title: '6 ta interaktiv o‘yin va pazl',
    description: 'Krossvord, So‘z izlash, Anagramma, Pazllar va Tezkor viktorina',
    icon: Gamepad2,
    activeCard: 'border-amber-600 bg-amber-50/75',
    activeCheck: 'border-amber-600 bg-amber-600 text-white',
    activeIcon: 'text-amber-700',
  },
  {
    key: 'methodologies',
    title: 'Pedagogik metodikalar',
    description: 'Klaster, B-B-B, Insert, Sinkveyn va tayyor dars namunasi',
    icon: Compass,
    activeCard: 'border-violet-600 bg-violet-50/75',
    activeCheck: 'border-violet-600 bg-violet-600 text-white',
    activeIcon: 'text-violet-700',
  },
  {
    key: 'tests',
    title: 'Mavzuga doir testlar',
    description: '10 ta 4 variantli savol, tahliliy izoh va jonli sinov rejimi',
    icon: BookOpenCheck,
    activeCard: 'border-sky-600 bg-sky-50/75',
    activeCheck: 'border-sky-600 bg-sky-600 text-white',
    activeIcon: 'text-sky-700',
  },
];

const QUICK_TOPICS: Array<{ topic: string; subject: string; gradeLevel: string }> = [
  {
    topic: 'Fotosintez jarayoni va xlorofillning ahamiyati',
    subject: 'Biologiya',
    gradeLevel: '6-sinf',
  },
  {
    topic: 'Pifagor teoremasi va uning amaliy qo‘llanilishi',
    subject: 'Geometriya',
    gradeLevel: '8-sinf',
  },
  {
    topic: 'Amir Temur davlati va Renessans davri madaniyati',
    subject: 'Tarix',
    gradeLevel: '7-sinf',
  },
  {
    topic: 'Quyosh sistemasi sayyoralari va yorug‘lik spektri',
    subject: 'Fizika',
    gradeLevel: '9-sinf',
  },
];

const SUBJECT_PRESETS = [
  'Matematika',
  'Fizika',
  'Biologiya',
  'Kimyo',
  'Tarix',
  'Ona tili va adabiyot',
  'Informatika',
  'Geografiya',
  'Ingliz tili',
];

const GRADE_PRESETS = [
  '1–4-sinf (Boshlang‘ich)',
  '5-sinf',
  '6-sinf',
  '7-sinf',
  '8-sinf',
  '9-sinf',
  '10–11-sinf',
  'Akademik litsey / OTM',
];

export const LessonBuilderPanel: React.FC<LessonBuilderPanelProps> = ({
  form,
  isGenerating,
  error,
  telegramFirstName,
  onChange,
  onSubmit,
}) => {
  const toggleModule = (key: ModuleKey) => {
    const exists = form.selectedModules.includes(key);
    const next = exists
      ? form.selectedModules.filter((m) => m !== key)
      : [...form.selectedModules, key];
    onChange({ ...form, selectedModules: next });
  };

  const selectAllModules = () => {
    onChange({
      ...form,
      selectedModules: ['slides', 'homework', 'games', 'methodologies', 'tests'],
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
      aria-labelledby="builder-heading"
      className="rounded-2xl border border-blue-200/80 bg-white/95 p-6 sm:p-9 shadow-md shadow-blue-900/5"
    >
      <div className="mb-7 border-b border-blue-100 pb-6">
        <p className="text-xs font-semibold text-blue-700">
          {telegramFirstName
            ? `Assalomu alaykum, ${telegramFirstName} · Dars loyihalovchi`
            : 'Dars loyihalovchi'}
        </p>
        <h1
          id="builder-heading"
          className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance"
        >
          Mavzuni kiriting va kerakli materiallarni belgilang
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Mavzu va fan turiga mos dizaynda boy taqdimot slaydlari, 6 xil interaktiv o‘yin,
          uyga vazifalar, metodikalar va testlarni bir zumda yarating.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-8">
        {/* 1. Mavzu kiritish */}
        <div>
          <label
            htmlFor="topic-input"
            className="block text-sm font-semibold text-slate-900"
          >
            1. Dars mavzusi
          </label>
          <input
            id="topic-input"
            type="text"
            required
            value={form.topic}
            onChange={(e) => onChange({ ...form, topic: e.target.value })}
            placeholder="Masalan: Quyosh sistemasi sayyoralari yoki Kvadrat tenglamalar..."
            className="mt-2 w-full rounded-xl border border-blue-200 bg-blue-50/35 px-4 py-3 text-base text-slate-900 placeholder:text-slate-400 transition-colors focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/15"
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Namuna:</span>
            {QUICK_TOPICS.map((preset) => (
              <button
                key={preset.topic}
                type="button"
                onClick={() =>
                  onChange({
                    ...form,
                    topic: preset.topic,
                    subject: preset.subject,
                    gradeLevel: preset.gradeLevel,
                  })
                }
                className="rounded-lg border border-blue-200/80 bg-blue-50/60 px-2.5 py-1.5 text-xs font-medium text-blue-900 hover:border-blue-400 hover:bg-blue-100/80 whitespace-nowrap shrink-0"
              >
                {preset.subject}: {preset.topic.split(' ').slice(0, 2).join(' ')}...
              </button>
            ))}
          </div>
        </div>

        {/* 2. Dars parametrlari */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="subject-select"
              className="block text-xs font-semibold text-slate-600"
            >
              Fan nomi
            </label>
            <input
              id="subject-select"
              list="subject-presets"
              value={form.subject}
              onChange={(e) => onChange({ ...form, subject: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-blue-200/80 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
            />
            <datalist id="subject-presets">
              {SUBJECT_PRESETS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>

          <div>
            <label
              htmlFor="grade-select"
              className="block text-xs font-semibold text-slate-600"
            >
              Sinf / Daraja
            </label>
            <select
              id="grade-select"
              value={form.gradeLevel}
              onChange={(e) => onChange({ ...form, gradeLevel: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-blue-200/80 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
            >
              {GRADE_PRESETS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="lang-select"
              className="block text-xs font-semibold text-slate-600"
            >
              Materiallar tili
            </label>
            <select
              id="lang-select"
              value={form.language}
              onChange={(e) =>
                onChange({ ...form, language: e.target.value as LessonLanguage })
              }
              className="mt-1.5 w-full rounded-lg border border-blue-200/80 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
            >
              <option value="uz">O‘zbek tili</option>
              <option value="ru">Rus tili</option>
              <option value="en">Ingliz tili</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="difficulty-select"
              className="block text-xs font-semibold text-slate-600"
            >
              Murakkablik va vaqt
            </label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <select
                id="difficulty-select"
                value={form.difficulty}
                onChange={(e) =>
                  onChange({
                    ...form,
                    difficulty: e.target.value as DifficultyLevel,
                  })
                }
                className="w-full rounded-lg border border-blue-200/80 bg-white px-2.5 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:outline-none"
              >
                <option value="oson">Oson</option>
                <option value="orta">O‘rta</option>
                <option value="qiyin">Qiyin</option>
              </select>
              <select
                aria-label="Dars davomiyligi"
                value={form.durationMinutes}
                onChange={(e) =>
                  onChange({ ...form, durationMinutes: Number(e.target.value) })
                }
                className="w-full rounded-lg border border-blue-200/80 bg-white px-2.5 py-2.5 text-sm text-slate-900 tabular-nums focus:border-blue-700 focus:outline-none"
              >
                <option value={45}>45 daq</option>
                <option value={60}>60 daq</option>
                <option value={80}>80 daq</option>
                <option value={90}>90 daq</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. Ptichka qo'yish (Colorful Checkboxes) */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="block text-sm font-semibold text-slate-900">
                2. Nimalar yaratilsin? (Ptichka qo‘ying)
              </span>
              <span className="text-xs text-slate-500 tabular-nums">
                Tanlangan: {form.selectedModules.length} / 5
              </span>
            </div>
            <button
              type="button"
              onClick={selectAllModules}
              className="rounded-md px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 hover:text-blue-800 whitespace-nowrap shrink-0"
            >
              Barchasini belgilash
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {MODULE_OPTIONS.map((mod) => {
              const checked = form.selectedModules.includes(mod.key);
              const Icon = mod.icon;

              return (
                <button
                  key={mod.key}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleModule(mod.key)}
                  className={`group flex items-start gap-3.5 rounded-xl border p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${
                    checked
                      ? mod.activeCard
                      : 'border-blue-200/70 bg-white hover:border-blue-400 hover:bg-blue-50/30'
                  }`}
                >
                  <motion.span
                    aria-hidden="true"
                    animate={{ scale: checked ? [0.82, 1.15, 1] : 1 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                      checked
                        ? mod.activeCheck
                        : 'border-slate-300 bg-white text-transparent group-hover:border-blue-400'
                    }`}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                  </motion.span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          checked ? mod.activeIcon : 'text-slate-400'
                        }`}
                      />
                      <span className="text-sm font-semibold text-slate-900">
                        {mod.title}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {mod.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Qo'shimcha izoh */}
        <div>
          <label
            htmlFor="extra-notes"
            className="block text-xs font-semibold text-slate-600"
          >
            Qo‘shimcha ko‘rsatma (ixtiyoriy)
          </label>
          <input
            id="extra-notes"
            type="text"
            value={form.extraNotes || ''}
            onChange={(e) => onChange({ ...form, extraNotes: e.target.value })}
            placeholder="Masalan: Amaliy hayotdan ko‘proq misollar keltirilsin, laboratoriya tajribasi qo‘shilsin..."
            className="mt-1.5 w-full rounded-lg border border-blue-200/80 bg-blue-50/20 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-blue-100 pt-6">
          <p className="text-xs text-slate-400">
            Barcha materiallar chop etish va interaktiv qo‘llash uchun moslashtiriladi.
          </p>
          <button
            type="submit"
            disabled={
              isGenerating ||
              form.topic.trim().length < 2 ||
              form.selectedModules.length === 0
            }
            className="btn-sheen inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-blue-700/25 hover:from-blue-800 hover:to-indigo-700 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Materiallar tayyorlanmoqda...</span>
              </>
            ) : (
              <span>Dars materiallarini yaratish</span>
            )}
          </button>
        </div>
      </form>
    </motion.section>
  );
};
