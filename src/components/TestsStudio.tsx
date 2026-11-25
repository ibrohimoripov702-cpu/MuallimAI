import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  RotateCcw,
  Trophy,
  XCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { TestsSection } from '../types/lesson.ts';

interface TestsStudioProps {
  tests: TestsSection;
  isRegenerating: boolean;
  onRegenerate: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export const TestsStudio: React.FC<TestsStudioProps> = ({
  tests,
  isRegenerating,
  onRegenerate,
}) => {
  const [mode, setMode] = useState<'interactive' | 'teacher'>('interactive');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showTeacherKey, setShowTeacherKey] = useState(true);

  useEffect(() => {
    setAnswers({});
    setSubmitted(false);
  }, [tests]);

  const total = tests.questions.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent =
    total > 0 ? Math.round((answeredCount / total) * 100) : 0;
  const correctCount = tests.questions.reduce((acc, q) => {
    return acc + (answers[q.id] === q.correctIndex ? 1 : 0);
  }, 0);
  const scorePercent =
    total > 0 ? Math.round((correctCount / total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">
            {tests.title}
          </h2>
          <p className="mt-0.5 text-sm text-slate-600 tabular-nums">
            {total} ta savol · O‘tish chegarasi: {tests.passingScorePercent}%
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1 rounded-lg border border-blue-200/70 bg-white/80 p-1">
            <button
              type="button"
              onClick={() => setMode('interactive')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                mode === 'interactive'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-600 hover:text-blue-900'
              }`}
            >
              Interaktiv sinov
            </button>
            <button
              type="button"
              onClick={() => setMode('teacher')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                mode === 'teacher'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-600 hover:text-blue-900'
              }`}
            >
              O‘qituvchi varaqasi
            </button>
          </div>

          <button
            type="button"
            disabled={isRegenerating}
            onClick={onRegenerate}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50/40 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`}
            />
            <span>Testni yangilash</span>
          </button>
        </div>
      </div>

      {/* Interactive Student Quiz Mode */}
      {mode === 'interactive' && (
        <div className="space-y-4">
          {!submitted && (
            <div className="rounded-xl border border-sky-200/80 bg-white px-5 py-3.5 shadow-xs">
              <div className="flex items-center justify-between text-xs font-medium text-slate-600">
                <span>Test bajarilish jarayoni</span>
                <span className="font-mono font-semibold text-sky-700 tabular-nums">
                  {answeredCount} / {total} ({progressPercent}%)
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-sky-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {submitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 shadow-sm ${
                scorePercent >= tests.passingScorePercent
                  ? 'border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-950'
                  : 'border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-950'
              }`}
            >
              <div className="flex items-center gap-3">
                {scorePercent >= tests.passingScorePercent ? (
                  <Trophy className="h-6 w-6 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="h-6 w-6 shrink-0 text-amber-600" />
                )}
                <div>
                  <p className="font-display text-lg font-bold tabular-nums">
                    Natija: {correctCount} / {total} ({scorePercent}%)
                  </p>
                  <p className="text-sm opacity-90">
                    {scorePercent >= tests.passingScorePercent
                      ? 'Mavzu muvaffaqiyatli o‘zlashtirildi.'
                      : 'Xato qilingan savollarning tahliliy izohini ko‘rib chiqing.'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAnswers({});
                  setSubmitted(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-blue-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Qayta yechish</span>
              </button>
            </motion.div>
          )}

          {tests.questions.map((q, qIdx) => {
            const chosen = answers[q.id];
            const isCorrect = chosen === q.correctIndex;

            return (
              <motion.article
                key={q.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(qIdx * 0.04, 0.3) }}
                className="rounded-2xl border border-blue-200/80 bg-white p-6 shadow-xs"
              >
                <div className="flex items-center justify-between gap-4 text-xs text-slate-400">
                  <span className="font-mono font-semibold text-sky-700 tabular-nums">
                    Savol {String(qIdx + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={`font-medium ${
                      q.difficulty === 'Qiyin'
                        ? 'text-rose-600'
                        : q.difficulty === "O'rta"
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                    }`}
                  >
                    Daraja: {q.difficulty}
                  </span>
                </div>

                <h3 className="mt-2.5 text-base font-semibold leading-relaxed text-slate-900">
                  {q.question}
                </h3>

                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = chosen === optIdx;
                    const isRightOption = optIdx === q.correctIndex;

                    let stateStyle =
                      'border-blue-200/80 bg-white hover:border-blue-400 text-slate-700';

                    if (submitted) {
                      if (isRightOption) {
                        stateStyle =
                          'border-emerald-400 bg-emerald-50/70 text-emerald-950 font-medium';
                      } else if (isSelected && !isRightOption) {
                        stateStyle =
                          'border-rose-300 bg-rose-50/70 text-rose-950';
                      } else {
                        stateStyle =
                          'border-blue-100 bg-blue-50/30 text-slate-400';
                      }
                    } else if (isSelected) {
                      stateStyle =
                        'border-blue-700 bg-blue-50/80 text-blue-950 font-medium';
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        disabled={submitted}
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [q.id]: optIdx }))
                        }
                        className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm ${stateStyle}`}
                      >
                        <span className="font-mono text-xs font-semibold mt-0.5 shrink-0">
                          {OPTION_LETTERS[optIdx]})
                        </span>
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                {submitted && (
                  <div
                    className={`mt-4 rounded-lg px-4 py-3 text-xs leading-relaxed ${
                      isCorrect
                        ? 'bg-emerald-50/60 text-emerald-900'
                        : 'bg-blue-50/50 text-slate-600'
                    }`}
                  >
                    <span className="font-medium text-slate-900">
                      {isCorrect ? 'To‘g‘ri javob: ' : 'Tahlil: '}
                    </span>
                    {q.explanation}
                  </div>
                )}
              </motion.article>
            );
          })}

          {!submitted && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-blue-200/80 bg-white p-5">
              <span className="text-sm text-slate-500 tabular-nums">
                Belgilangan savollar: {answeredCount} / {total}
              </span>
              <button
                type="button"
                disabled={answeredCount === 0}
                onClick={() => setSubmitted(true)}
                className="btn-sheen rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-blue-700/20 hover:bg-blue-800 disabled:bg-slate-300 disabled:shadow-none"
              >
                Testni yakunlash va tekshirish
              </button>
            </div>
          )}
        </div>
      )}

      {/* Teacher Printable Sheet Mode */}
      {mode === 'teacher' && (
        <div className="rounded-xl border border-blue-200/80 bg-white p-6 space-y-6">
          <div className="no-print flex items-center justify-between border-b border-blue-100 pb-4">
            <p className="text-sm text-slate-500">
              Chop etish uchun tayyor nazorat varaqasi
            </p>
            <button
              type="button"
              onClick={() => setShowTeacherKey((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50/50"
            >
              {showTeacherKey ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  <span>Kalitni yashirish</span>
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  <span>Javoblar kalitini ko‘rsatish</span>
                </>
              )}
            </button>
          </div>

          <div className="space-y-6">
            {tests.questions.map((q, idx) => (
              <div
                key={q.id}
                className="print-break-inside-avoid border-b border-blue-100 pb-5 last:border-b-0 last:pb-0"
              >
                <p className="text-sm font-medium text-slate-900">
                  <span className="font-mono mr-2 tabular-nums">
                    {idx + 1}.
                  </span>
                  {q.question}
                </p>
                <div className="mt-2.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2 pl-6">
                  {q.options.map((opt, oIdx) => {
                    const isRight = oIdx === q.correctIndex;
                    return (
                      <p
                        key={oIdx}
                        className={`text-sm ${
                          showTeacherKey && isRight
                            ? 'font-medium text-emerald-700'
                            : 'text-slate-600'
                        }`}
                      >
                        <span className="font-mono mr-1.5">
                          {OPTION_LETTERS[oIdx]})
                        </span>
                        {opt}
                      </p>
                    );
                  })}
                </div>
                {showTeacherKey && (
                  <p className="mt-2 pl-6 text-xs text-slate-400">
                    Izoh: {q.explanation}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
