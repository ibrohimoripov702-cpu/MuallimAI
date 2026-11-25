import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import type { LessonVisualTheme, SlideItem } from '../types/lesson.ts';
import { getThemeConfig } from '../utils/themeRegistry.ts';

interface SlidesViewerProps {
  topic: string;
  subject: string;
  visualTheme?: LessonVisualTheme;
  slides: SlideItem[];
  isRegenerating: boolean;
  onRegenerate: () => void;
}

const LAYOUT_LABELS: Record<SlideItem['layoutType'], string> = {
  title: 'Kirish slaydi',
  concept: 'Asosiy tushuncha',
  comparison: 'Qiyosiy tahlil',
  process: 'Jarayon va bosqich',
  fact_grid: 'Muhim faktlar',
  summary: 'Yakuniy xulosa',
};

export const SlidesViewer: React.FC<SlidesViewerProps> = ({
  topic,
  subject,
  visualTheme,
  slides,
  isRegenerating,
  onRegenerate,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  const theme = getThemeConfig(subject, topic, visualTheme);

  useEffect(() => {
    setCurrentIndex(0);
  }, [slides]);

  useEffect(() => {
    setImgFailed(false);
  }, [theme.imageUrl]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'ArrowRight') {
        setCurrentIndex((i) => Math.min(slides.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((i) => Math.max(0, i - 1));
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [slides.length, isFullscreen]);

  if (!slides || slides.length === 0) {
    return null;
  }

  const activeSlide = slides[Math.min(currentIndex, slides.length - 1)];
  const progressPercent = Math.round(((currentIndex + 1) / slides.length) * 100);
  const keyFacts = activeSlide.keyFacts || [];
  const leadParagraph = activeSlide.leadParagraph || '';

  const renderSlideBody = (slide: SlideItem, large = false) => {
    const isTitleSlide = slide.layoutType === 'title';

    return (
      <div className="space-y-6">
        {slide.leadParagraph && (
          <p
            className={`leading-relaxed ${
              isTitleSlide
                ? 'text-blue-50/95'
                : 'text-slate-600'
            } ${large ? 'text-lg sm:text-xl' : 'text-sm sm:text-base'}`}
          >
            {slide.leadParagraph}
          </p>
        )}

        {/* Comparison layout */}
        {slide.layoutType === 'comparison' && slide.comparisonData ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 sm:p-5">
              <h4 className="font-display text-sm font-semibold text-blue-900">
                {slide.comparisonData.leftTitle}
              </h4>
              <ul className="mt-3 space-y-2">
                {slide.comparisonData.leftPoints.map((pt, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm text-slate-700"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:p-5">
              <h4 className="font-display text-sm font-semibold text-emerald-900">
                {slide.comparisonData.rightTitle}
              </h4>
              <ul className="mt-3 space-y-2">
                {slide.comparisonData.rightPoints.map((pt, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-sm text-slate-700"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {/* Process layout */}
        {slide.layoutType === 'process' &&
        slide.processSteps &&
        slide.processSteps.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {slide.processSteps.map((st, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-blue-200/80 bg-blue-50/40 p-4"
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${theme.accentBg} font-mono text-xs font-semibold text-white tabular-nums`}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-semibold text-slate-900">
                      {st.step}
                    </h4>
                    {idx < slide.processSteps!.length - 1 && (
                      <ArrowRight className="h-3.5 w-3.5 text-blue-400 shrink-0 hidden sm:inline" />
                    )}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {st.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* Standard detailed bullet points */}
        {slide.bulletPoints.length > 0 && (
          <ul className="space-y-2.5">
            {slide.bulletPoints.map((point, i) => (
              <li
                key={i}
                className={`flex items-start gap-3 leading-relaxed ${
                  isTitleSlide ? 'text-white/95' : 'text-slate-700'
                } ${large ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}
              >
                <span
                  className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                    isTitleSlide ? 'bg-amber-300' : theme.dotColor
                  }`}
                />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Key Facts / Formula Strip */}
        {keyFacts.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 pt-1">
            {keyFacts.map((fact, fIdx) => (
              <div
                key={fIdx}
                className={`rounded-xl border p-3.5 ${
                  isTitleSlide
                    ? 'border-white/20 bg-white/10 text-white backdrop-blur-xs'
                    : `${theme.softBorder} ${theme.softBg} text-slate-900`
                }`}
              >
                <p
                  className={`text-[11px] font-medium ${
                    isTitleSlide ? 'text-blue-200' : theme.accentText
                  }`}
                >
                  {fact.label}
                </p>
                <p className="mt-1 text-sm font-semibold leading-snug">
                  {fact.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">
            Taqdimot slaydlari
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            {slides.length} ta mavzuga mos dizaynli slayd · {theme.label}
          </p>
        </div>
        <div className="no-print flex items-center gap-2.5">
          <button
            type="button"
            disabled={isRegenerating}
            onClick={onRegenerate}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50/40 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`}
            />
            <span>Slaydlarni yangilash</span>
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            className="btn-sheen inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white shadow-sm shadow-blue-700/20 hover:bg-blue-800 whitespace-nowrap shrink-0"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Namoyish rejimi</span>
          </button>
        </div>
      </div>

      {/* Main Viewer Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Slide Thumbnails Rail */}
        <div className="no-print lg:col-span-4 space-y-2 max-h-[620px] overflow-y-auto pr-1">
          {slides.map((slide, idx) => {
            const isSelected = idx === currentIndex;
            return (
              <button
                key={slide.slideNumber || idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-full rounded-xl border p-3.5 text-left transition-all ${
                  isSelected
                    ? 'border-blue-700 bg-white shadow-sm shadow-blue-900/10'
                    : 'border-blue-200/70 bg-white/80 hover:border-blue-400 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      isSelected ? theme.accentText : 'text-slate-500'
                    }`}
                  >
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span>{LAYOUT_LABELS[slide.layoutType] || 'Slayd'}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">
                  {slide.title}
                </p>
              </button>
            );
          })}
        </div>

        {/* Active Topic-Themed Slide Canvas */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-2xl border border-blue-200/80 bg-white overflow-hidden shadow-md shadow-blue-900/5">
            {/* Topic Artwork Header Banner inside Slide Deck */}
            <div className="relative h-28 sm:h-32 w-full overflow-hidden">
              {!imgFailed ? (
                <img
                  src={theme.imageUrl}
                  alt={topic}
                  referrerPolicy="no-referrer"
                  onError={() => setImgFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div
                  className={`h-full w-full bg-gradient-to-r ${theme.bannerGradient}`}
                />
              )}
              <div
                className={`absolute inset-0 bg-gradient-to-r ${theme.bannerGradient}`}
              />
              <div className="absolute inset-0 flex items-center justify-between px-6 sm:px-8 text-white">
                <div className="min-w-0 pr-4">
                  <p className="text-xs font-medium text-blue-100/90">
                    {subject} · {LAYOUT_LABELS[activeSlide.layoutType] || 'Slayd'}
                  </p>
                  <p className="mt-0.5 truncate font-display text-base sm:text-lg font-semibold">
                    {topic}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-mono text-lg font-bold tabular-nums">
                    {String(currentIndex + 1).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-xs text-blue-200 tabular-nums">
                    {' '}
                    / {String(slides.length).padStart(2, '0')}
                  </span>
                </div>
              </div>
              {/* Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                <div
                  className="h-full bg-amber-300 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Animated Slide Content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide.slideNumber || currentIndex}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className={`relative flex min-h-[380px] flex-col justify-between p-7 sm:p-10 ${
                  activeSlide.layoutType === 'title'
                    ? `bg-gradient-to-br ${theme.bannerGradient} text-white`
                    : 'bg-white text-slate-900'
                }`}
              >
                <div>
                  <h3
                    className={`font-display text-2xl sm:text-3xl font-bold tracking-tight text-balance ${
                      activeSlide.layoutType === 'title'
                        ? 'text-white'
                        : 'text-slate-900'
                    }`}
                  >
                    {activeSlide.title}
                  </h3>
                  {activeSlide.subtitle && (
                    <p
                      className={`mt-2 text-sm sm:text-base ${
                        activeSlide.layoutType === 'title'
                          ? 'text-blue-100'
                          : 'text-slate-500'
                      }`}
                    >
                      {activeSlide.subtitle}
                    </p>
                  )}

                  <div className="mt-6">
                    {renderSlideBody(activeSlide, false)}
                  </div>
                </div>

                <div
                  className={`mt-8 border-t pt-4 ${
                    activeSlide.layoutType === 'title'
                      ? 'border-white/20'
                      : 'border-blue-100'
                  }`}
                >
                  <p
                    className={`text-xs font-semibold flex items-start gap-2 ${
                      activeSlide.layoutType === 'title'
                        ? 'text-amber-200'
                        : theme.accentText
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      Asosiy xulosa:{' '}
                      <span
                        className={`font-normal ${
                          activeSlide.layoutType === 'title'
                            ? 'text-white/95'
                            : 'text-slate-700'
                        }`}
                      >
                        {activeSlide.keyTakeaway}
                      </span>
                    </span>
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Slide Controls Footer */}
            <div className="no-print flex items-center justify-between border-t border-blue-100 bg-blue-50/50 px-5 py-3">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50/50 disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Oldingi</span>
              </button>

              <span className="font-mono text-xs text-slate-600 tabular-nums">
                Slayd {currentIndex + 1} / {slides.length}
              </span>

              <button
                type="button"
                disabled={currentIndex === slides.length - 1}
                onClick={() =>
                  setCurrentIndex((i) => Math.min(slides.length - 1, i + 1))
                }
                className="btn-sheen inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-40 whitespace-nowrap shrink-0"
              >
                <span>Keyingi</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Teacher Speaker Notes & Visual Aid Suggestion */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-blue-200/80 bg-white p-5">
              <h4 className={`text-xs font-semibold ${theme.accentText}`}>
                O‘qituvchi nutqi (Spiker izohi)
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {activeSlide.speakerNotes}
              </p>
              {!leadParagraph && (
                <p className="mt-2 text-xs text-slate-400">
                  Klaviatura ← / → tugmalari bilan slaydlarni boshqarishingiz mumkin.
                </p>
              )}
            </div>
            <div className="rounded-xl border border-blue-200/80 bg-white p-5">
              <div
                className={`flex items-center gap-1.5 text-xs font-semibold ${theme.accentText}`}
              >
                <ImageIcon className="h-3.5 w-3.5" />
                <span>Slayd uchun vizual g‘oya</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                {activeSlide.visualSuggestion}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Fullscreen Animated Presentation Overlay */}
      {isFullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Taqdimot namoyish rejimi"
          className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950 p-5 sm:p-10 text-white"
        >
          {!imgFailed && (
            <img
              src={theme.imageUrl}
              alt=""
              aria-hidden="true"
              referrerPolicy="no-referrer"
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
            />
          )}
          <div className="relative z-10 flex items-center justify-between gap-4">
            <span className="text-sm text-blue-200">
              {topic} · {LAYOUT_LABELS[activeSlide.layoutType] || 'Slayd'}
            </span>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-medium text-white backdrop-blur-sm hover:bg-white/20 whitespace-nowrap shrink-0"
            >
              <Minimize2 className="h-4 w-4" />
              <span>Chiqish (Esc)</span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide.slideNumber || currentIndex}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className={`relative z-10 mx-auto w-full max-w-5xl rounded-2xl border p-8 sm:p-12 shadow-2xl ${
                activeSlide.layoutType === 'title'
                  ? `border-white/20 bg-gradient-to-br ${theme.bannerGradient} text-white`
                  : 'border-blue-200/80 bg-white text-slate-900'
              }`}
            >
              <h2
                className={`font-display text-3xl sm:text-4xl font-bold tracking-tight text-balance ${
                  activeSlide.layoutType === 'title'
                    ? 'text-white'
                    : 'text-slate-900'
                }`}
              >
                {activeSlide.title}
              </h2>
              {activeSlide.subtitle && (
                <p
                  className={`mt-2 text-lg ${
                    activeSlide.layoutType === 'title'
                      ? 'text-blue-100'
                      : 'text-slate-500'
                  }`}
                >
                  {activeSlide.subtitle}
                </p>
              )}
              <div className="mt-6">{renderSlideBody(activeSlide, true)}</div>
              <div
                className={`mt-8 border-t pt-4 text-sm ${
                  activeSlide.layoutType === 'title'
                    ? 'border-white/20 text-amber-200'
                    : 'border-blue-100 text-blue-700'
                }`}
              >
                {activeSlide.keyTakeaway}
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="relative z-10 flex items-center justify-between gap-4">
            <button
              type="button"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm hover:bg-white/20 disabled:opacity-35"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Oldingi</span>
            </button>
            <span className="font-mono text-sm text-blue-100 tabular-nums">
              {currentIndex + 1} / {slides.length}
            </span>
            <button
              type="button"
              disabled={currentIndex === slides.length - 1}
              onClick={() =>
                setCurrentIndex((i) => Math.min(slides.length - 1, i + 1))
              }
              className="btn-sheen inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-35"
            >
              <span>Keyingi</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
