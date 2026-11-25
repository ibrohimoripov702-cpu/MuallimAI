import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Download,
  FileText,
  Printer,
  RotateCcw,
  Send,
} from 'lucide-react';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Header } from './components/Header.tsx';
import { LessonBuilderPanel } from './components/LessonBuilderPanel.tsx';
import { SlidesViewer } from './components/SlidesViewer.tsx';
import { HomeworkView } from './components/HomeworkView.tsx';
import { GamesStudio } from './components/GamesStudio.tsx';
import { MethodologiesView } from './components/MethodologiesView.tsx';
import { TestsStudio } from './components/TestsStudio.tsx';
import { SavedLessonsDrawer } from './components/SavedLessonsDrawer.tsx';
import { TelegramGuideModal } from './components/TelegramGuideModal.tsx';
import {
  getInitialTopicFromUrl,
  getTelegramUser,
  initTelegramMiniApp,
} from './utils/telegram.ts';
import { getThemeConfig } from './utils/themeRegistry.ts';
import type {
  GeneratedLesson,
  LessonRequest,
  ModuleKey,
} from './types/lesson.ts';

const STORAGE_KEY = 'muallim_studio_lessons_v1';

const MODULE_LABELS: Record<ModuleKey, string> = {
  slides: 'Taqdimot slaydlari',
  homework: 'Uyga vazifalar',
  games: "6 ta O'yin va Pazl",
  methodologies: 'Metodikalar',
  tests: 'Testlar',
};

const MODULE_TAB_ACTIVE: Record<ModuleKey, string> = {
  slides: 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/25',
  homework: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25',
  games: 'bg-amber-600 text-white shadow-sm shadow-amber-600/25',
  methodologies: 'bg-violet-600 text-white shadow-sm shadow-violet-600/25',
  tests: 'bg-sky-600 text-white shadow-sm shadow-sky-600/25',
};

const DEFAULT_FORM: LessonRequest = {
  topic: '',
  subject: 'Biologiya',
  gradeLevel: '7-sinf',
  language: 'uz',
  durationMinutes: 45,
  difficulty: 'orta',
  selectedModules: ['slides', 'homework', 'games', 'methodologies', 'tests'],
  extraNotes: '',
};

function exportLessonMarkdown(lesson: GeneratedLesson) {
  const lines: string[] = [
    `# ${lesson.topic}`,
    `Fan: ${lesson.subject} · Sinf: ${lesson.gradeLevel} · Davomiyligi: ${lesson.durationMinutes} daqiqa`,
    '',
    '## Dars mazmuni',
    lesson.summary,
    '',
    "## O'quv maqsadlari",
    ...lesson.learningObjectives.map((obj) => `- ${obj}`),
    '',
  ];

  if (lesson.slides?.length) {
    lines.push('## Taqdimot slaydlari');
    for (const s of lesson.slides) {
      lines.push(`### ${s.slideNumber}. ${s.title}`);
      if (s.subtitle) lines.push(`_${s.subtitle}_`);
      if (s.leadParagraph) lines.push(s.leadParagraph);
      for (const b of s.bulletPoints) lines.push(`- ${b}`);
      lines.push(`**Asosiy xulosa:** ${s.keyTakeaway}`);
      lines.push(`**O'qituvchi nutqi:** ${s.speakerNotes}`);
      lines.push('');
    }
  }

  if (lesson.homework) {
    lines.push('## Uyga vazifalar', lesson.homework.overview, '');
    for (const t of lesson.homework.tasks) {
      lines.push(`### [${t.tier}] ${t.title} (${t.estimatedMinutes} daq)`);
      lines.push(t.instructions);
      lines.push(`**Natija:** ${t.deliverable}`);
      lines.push('');
    }
  }

  if (lesson.games) {
    lines.push(`## Krossvord: ${lesson.games.crossword.title}`);
    for (const p of lesson.games.crossword.placements) {
      lines.push(
        `- ${p.number} (${p.direction === 'across' ? 'Gorizontal' : 'Vertikal'}): ${p.clue} → **${p.word}**`,
      );
    }
    lines.push('');
  }

  if (lesson.methodologies?.length) {
    lines.push('## Pedagogik metodikalar');
    for (const m of lesson.methodologies) {
      lines.push(`### ${m.name} (${m.durationMinutes} daq)`);
      lines.push(m.purpose);
      m.steps.forEach((st, i) => lines.push(`${i + 1}. ${st}`));
      lines.push('');
    }
  }

  if (lesson.tests) {
    lines.push(`## ${lesson.tests.title}`);
    lesson.tests.questions.forEach((q, idx) => {
      lines.push(`${idx + 1}. ${q.question}`);
      q.options.forEach((opt, oIdx) => {
        const letter = ['A', 'B', 'C', 'D'][oIdx];
        lines.push(`   ${letter}) ${opt}`);
      });
      lines.push(`   To'g'ri javob: ${['A', 'B', 'C', 'D'][q.correctIndex]}`);
      lines.push('');
    });
  }

  const blob = new Blob([lines.join('\n')], {
    type: 'text/markdown;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${lesson.topic.slice(0, 40).replace(/\s+/g, '_')}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [form, setForm] = useState<LessonRequest>(DEFAULT_FORM);
  const [activeLesson, setActiveLesson] = useState<GeneratedLesson | null>(null);
  const [activeTab, setActiveTab] = useState<ModuleKey>('slides');
  const [viewMode, setViewMode] = useState<'builder' | 'workspace'>('builder');
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingModule, setRegeneratingModule] =
    useState<ModuleKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedLessons, setSavedLessons] = useState<GeneratedLesson[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);
  const [telegramFirstName, setTelegramFirstName] = useState<string | null>(
    null,
  );
  const [imageFailed, setImageFailed] = useState(false);
  const [topicBannerFailed, setTopicBannerFailed] = useState(false);

  useEffect(() => {
    initTelegramMiniApp();
    const tgUser = getTelegramUser();
    if (tgUser?.first_name) {
      setTelegramFirstName(tgUser.first_name);
    }
    const urlTopic = getInitialTopicFromUrl();
    if (urlTopic) {
      setForm((prev) => ({ ...prev, topic: urlTopic }));
    }
  }, []);

  useEffect(() => {
    setTopicBannerFailed(false);
  }, [activeLesson?.id]);

  // Tactile click ripple animation for all enabled buttons
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const btn = target?.closest('button');
      if (!btn || btn.hasAttribute('disabled')) return;

      const rect = btn.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const size = Math.max(rect.width, rect.height) * 2.1;
      const wave = document.createElement('span');
      const isFilled =
        btn.classList.contains('bg-blue-700') ||
        btn.classList.contains('bg-blue-800') ||
        btn.classList.contains('bg-blue-600') ||
        btn.classList.contains('bg-indigo-600') ||
        btn.classList.contains('bg-emerald-600') ||
        btn.classList.contains('bg-violet-600') ||
        btn.classList.contains('bg-amber-600') ||
        btn.classList.contains('bg-sky-600') ||
        btn.classList.contains('bg-rose-600') ||
        btn.classList.contains('bg-gradient-to-r');

      wave.className = isFilled
        ? 'btn-ripple-wave'
        : 'btn-ripple-wave btn-ripple-wave--dark';
      wave.style.width = `${size}px`;
      wave.style.height = `${size}px`;
      wave.style.left = `${e.clientX - rect.left}px`;
      wave.style.top = `${e.clientY - rect.top}px`;

      btn.appendChild(wave);
      const cleanup = () => wave.remove();
      wave.addEventListener('animationend', cleanup, { once: true });
      setTimeout(cleanup, 600);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as GeneratedLesson[];
        if (Array.isArray(parsed)) {
          setSavedLessons(parsed);
        }
      }
    } catch {
      // Ignore corrupt localStorage data
    }
  }, []);

  const persistLessons = (next: GeneratedLesson[]) => {
    setSavedLessons(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 20)));
    } catch {
      // Ignore storage quota errors
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/generate-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || 'Materiallarni yaratishda xatolik');
      }

      const lesson = payload as GeneratedLesson;
      setActiveLesson(lesson);
      const firstModule = lesson.selectedModules[0] || 'slides';
      setActiveTab(firstModule);
      setViewMode('workspace');

      const updatedHistory = [
        lesson,
        ...savedLessons.filter((item) => item.id !== lesson.id),
      ];
      persistLessons(updatedHistory);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Tarmoq xatoligi yuz berdi. Qayta urinib ko'ring.",
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateModule = async (moduleKey: ModuleKey) => {
    if (!activeLesson) return;
    setError(null);
    setRegeneratingModule(moduleKey);

    try {
      const res = await fetch('/api/regenerate-module', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: activeLesson.topic,
          subject: activeLesson.subject,
          gradeLevel: activeLesson.gradeLevel,
          language: activeLesson.language,
          durationMinutes: activeLesson.durationMinutes,
          difficulty: activeLesson.difficulty,
          moduleKey,
        }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Bo'limni yangilashda xatolik");
      }

      const updatedLesson: GeneratedLesson = {
        ...activeLesson,
        [moduleKey]: payload.data,
      };
      setActiveLesson(updatedLesson);
      persistLessons(
        savedLessons.map((item) =>
          item.id === updatedLesson.id ? updatedLesson : item,
        ),
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Bo'limni yangilashda xatolik yuz berdi.",
      );
    } finally {
      setRegeneratingModule(null);
    }
  };

  const handleNavigate = (target: 'builder' | ModuleKey) => {
    if (target === 'builder') {
      setViewMode('builder');
      return;
    }
    if (activeLesson && activeLesson.selectedModules.includes(target)) {
      setActiveTab(target);
      setViewMode('workspace');
    }
  };

  const handleSelectSaved = (lesson: GeneratedLesson) => {
    setActiveLesson(lesson);
    setActiveTab(lesson.selectedModules[0] || 'slides');
    setViewMode('workspace');
    setError(null);
  };

  const handleDeleteSaved = (id: string) => {
    const next = savedLessons.filter((item) => item.id !== id);
    persistLessons(next);
    if (activeLesson?.id === id) {
      setActiveLesson(null);
      setViewMode('builder');
    }
  };

  const lessonTheme = activeLesson
    ? getThemeConfig(
        activeLesson.subject,
        activeLesson.topic,
        activeLesson.visualTheme,
      )
    : null;

  return (
    <MotionConfig reducedMotion="user">
    <div className="relative min-h-screen flex flex-col text-slate-900">
      {/* Soft ambient blue & sky atmospheric depth shapes */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-300/25 blur-3xl" />
        <div className="absolute -right-24 top-1/4 h-80 w-80 rounded-full bg-sky-300/25 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl" />
      </div>

      <Header
        activeSection={viewMode === 'builder' ? 'builder' : activeTab}
        hasLesson={Boolean(activeLesson)}
        availableModules={activeLesson?.selectedModules || []}
        savedCount={savedLessons.length}
        onNavigate={handleNavigate}
        onOpenSaved={() => setDrawerOpen(true)}
      />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {viewMode === 'builder' || !activeLesson ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start"
          >
            <div className="lg:col-span-8">
              <LessonBuilderPanel
                form={form}
                isGenerating={isGenerating}
                error={error}
                telegramFirstName={telegramFirstName}
                onChange={setForm}
                onSubmit={handleGenerate}
              />
            </div>

            <aside className="lg:col-span-4 space-y-6">
              <div className="overflow-hidden rounded-2xl border border-blue-200/80 bg-white/95 shadow-md shadow-blue-900/5">
                {!imageFailed ? (
                  <img
                    src="/src/assets/images/hero_pedagogy_studio_1795411317628.jpg"
                    alt="O'qituvchi ish stoli: dars rejalari, geometrik chizgich va slayd kartochkalari"
                    referrerPolicy="no-referrer"
                    onError={() => setImageFailed(true)}
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-48 w-full flex-col items-center justify-center bg-blue-50 text-blue-700">
                    <BookOpen className="h-9 w-9" />
                    <span className="mt-2 text-xs font-medium">
                      Muallim Studio
                    </span>
                  </div>
                )}

                <div className="p-6 space-y-4">
                  <h2 className="font-display text-lg font-semibold text-slate-900">
                    Bir mavzu — rang-barang dars majmuasi
                  </h2>
                  <p className="text-sm leading-relaxed text-slate-500">
                    Har bir dars majmuasi o‘qituvchi vaqtini tejash hamda
                    o‘quvchilar faolligini oshirish uchun yagona tizimda yaratiladi.
                  </p>

                  <dl className="space-y-3.5 border-t border-blue-100 pt-4 text-xs">
                    <div>
                      <dt className="font-semibold text-indigo-700">
                        10 ta mavzuga mos dizaynli slayd
                      </dt>
                      <dd className="mt-0.5 text-slate-500">
                        Batafsil izohlar, qiyosiy jadvallar, jarayon bosqichlari va spiker nutqi.
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-emerald-700">
                        6 ta interaktiv o‘yin va pazl
                      </dt>
                      <dd className="mt-0.5 text-slate-500">
                        Krossvord, so‘z izlash, moslashtirish, ketma-ketlik, anagramma va tezkor viktorina.
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-sky-700">
                        Metodika, uyga vazifa va testlar
                      </dt>
                      <dd className="mt-0.5 text-slate-500">
                        Chop etishga tayyor varaqalar va avtomatik tekshiriladigan test.
                      </dd>
                    </div>
                  </dl>

                  {activeLesson && (
                    <button
                      type="button"
                      onClick={() => setViewMode('workspace')}
                      className="w-full rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-2.5 text-xs font-semibold text-blue-900 hover:bg-blue-100"
                    >
                      Oxirgi darsga qaytish: {activeLesson.topic}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setTelegramModalOpen(true)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-xs font-semibold text-blue-800 hover:bg-blue-50"
                  >
                    <Send className="h-3.5 w-3.5 text-blue-700" />
                    <span>Telegram bot ichiga joylashtirish</span>
                  </button>
                </div>
              </div>
            </aside>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {/* Topic-Matched Lesson Overview Header & Export Actions */}
            <section className="overflow-hidden rounded-2xl border border-blue-200/80 bg-white/95 shadow-md shadow-blue-900/5">
              {lessonTheme && (
                <div className="relative h-32 sm:h-36 w-full overflow-hidden">
                  {!topicBannerFailed ? (
                    <img
                      src={lessonTheme.imageUrl}
                      alt={activeLesson.topic}
                      referrerPolicy="no-referrer"
                      onError={() => setTopicBannerFailed(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div
                      className={`h-full w-full bg-gradient-to-r ${lessonTheme.bannerGradient}`}
                    />
                  )}
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${lessonTheme.bannerGradient}`}
                  />
                  <div className="absolute inset-0 flex flex-wrap items-center justify-between gap-4 p-6 sm:px-7 text-white">
                    <div className="min-w-0 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-blue-100">
                        <span>{activeLesson.subject}</span>
                        <span aria-hidden="true">·</span>
                        <span>{activeLesson.gradeLevel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {activeLesson.durationMinutes} daqiqa
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{lessonTheme.label}</span>
                      </div>
                      <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance">
                        {activeLesson.topic}
                      </h1>
                    </div>

                    <div className="no-print flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewMode('builder')}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/15 px-3.5 py-2 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/25 whitespace-nowrap shrink-0"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Yangi mavzu</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => exportLessonMarkdown(activeLesson)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/15 px-3.5 py-2 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/25 whitespace-nowrap shrink-0"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Markdown yuklash</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="btn-sheen inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 whitespace-nowrap shrink-0"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Chop etish / PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-6 sm:p-7">
                <p className="text-sm leading-relaxed text-slate-600">
                  {activeLesson.summary}
                </p>

                {activeLesson.learningObjectives.length > 0 && (
                  <div className="mt-5 border-t border-blue-100 pt-4">
                    <h2 className="text-xs font-semibold text-slate-400">
                      Dars maqsadlari
                    </h2>
                    <ul className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {activeLesson.learningObjectives.map((obj, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2 text-xs leading-relaxed text-slate-700"
                        >
                          <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                          <span>{obj}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Colorful Workspace Module Switcher Tabs */}
                <div className="no-print mt-6 flex flex-wrap items-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50/60 p-1.5">
                  {activeLesson.selectedModules.map((modKey) => {
                    const isActive = activeTab === modKey;
                    return (
                      <button
                        key={modKey}
                        type="button"
                        onClick={() => setActiveTab(modKey)}
                        className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                          isActive
                            ? MODULE_TAB_ACTIVE[modKey]
                            : 'text-slate-600 hover:bg-white/80 hover:text-blue-900'
                        }`}
                      >
                        {MODULE_LABELS[modKey]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
              >
                {error}
              </div>
            )}

            {/* Animated Active Module Workspace */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {activeTab === 'slides' && activeLesson.slides && (
                  <SlidesViewer
                    topic={activeLesson.topic}
                    subject={activeLesson.subject}
                    visualTheme={activeLesson.visualTheme}
                    slides={activeLesson.slides}
                    isRegenerating={regeneratingModule === 'slides'}
                    onRegenerate={() => handleRegenerateModule('slides')}
                  />
                )}

                {activeTab === 'homework' && activeLesson.homework && (
                  <HomeworkView
                    homework={activeLesson.homework}
                    isRegenerating={regeneratingModule === 'homework'}
                    onRegenerate={() => handleRegenerateModule('homework')}
                  />
                )}

                {activeTab === 'games' && activeLesson.games && (
                  <GamesStudio
                    topic={activeLesson.topic}
                    subject={activeLesson.subject}
                    visualTheme={activeLesson.visualTheme}
                    games={activeLesson.games}
                    isRegenerating={regeneratingModule === 'games'}
                    onRegenerate={() => handleRegenerateModule('games')}
                  />
                )}

                {activeTab === 'methodologies' && activeLesson.methodologies && (
                  <MethodologiesView
                    methodologies={activeLesson.methodologies}
                    isRegenerating={regeneratingModule === 'methodologies'}
                    onRegenerate={() => handleRegenerateModule('methodologies')}
                  />
                )}

                {activeTab === 'tests' && activeLesson.tests && (
                  <TestsStudio
                    tests={activeLesson.tests}
                    isRegenerating={regeneratingModule === 'tests'}
                    onRegenerate={() => handleRegenerateModule('tests')}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </main>

      <footer className="no-print border-t border-blue-200/70 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4 text-xs text-slate-500">
          <span>Muallim Studio · O‘qituvchilar uchun aqlli dars konstruktori</span>
          <button
            type="button"
            onClick={() => setTelegramModalOpen(true)}
            className="inline-flex items-center gap-1.5 font-medium text-blue-700 hover:underline"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Telegram bot qo‘llanmasi</span>
          </button>
        </div>
      </footer>

      <SavedLessonsDrawer
        isOpen={drawerOpen}
        lessons={savedLessons}
        activeLessonId={activeLesson?.id}
        onClose={() => setDrawerOpen(false)}
        onSelect={handleSelectSaved}
        onDelete={handleDeleteSaved}
      />

      <TelegramGuideModal
        isOpen={telegramModalOpen}
        onClose={() => setTelegramModalOpen(false)}
      />
    </div>
    </MotionConfig>
  );
}
