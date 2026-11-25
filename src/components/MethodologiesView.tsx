import React from 'react';
import { RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import type { MethodologyItem } from '../types/lesson.ts';

interface MethodologiesViewProps {
  methodologies: MethodologyItem[];
  isRegenerating: boolean;
  onRegenerate: () => void;
}

const METHOD_PALETTES = [
  {
    border: 'border-violet-200/90',
    topBar: 'from-violet-500 to-indigo-500',
    label: 'text-violet-700',
    stepNum: 'text-violet-700',
    sampleBg: 'bg-violet-50/70',
    sampleTitle: 'text-violet-900',
    dot: 'bg-violet-500',
  },
  {
    border: 'border-sky-200/90',
    topBar: 'from-sky-500 to-blue-600',
    label: 'text-sky-700',
    stepNum: 'text-sky-700',
    sampleBg: 'bg-sky-50/70',
    sampleTitle: 'text-sky-900',
    dot: 'bg-sky-500',
  },
  {
    border: 'border-emerald-200/90',
    topBar: 'from-emerald-500 to-teal-500',
    label: 'text-emerald-700',
    stepNum: 'text-emerald-700',
    sampleBg: 'bg-emerald-50/70',
    sampleTitle: 'text-emerald-900',
    dot: 'bg-emerald-500',
  },
  {
    border: 'border-amber-200/90',
    topBar: 'from-amber-500 to-orange-500',
    label: 'text-amber-700',
    stepNum: 'text-amber-700',
    sampleBg: 'bg-amber-50/70',
    sampleTitle: 'text-amber-900',
    dot: 'bg-amber-500',
  },
];

export const MethodologiesView: React.FC<MethodologiesViewProps> = ({
  methodologies,
  isRegenerating,
  onRegenerate,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">
            Pedagogik metodikalar va interfaol usullar
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Dars bosqichlarida qo‘llash uchun {methodologies.length} ta tayyor metodika va mavzu namunasi
          </p>
        </div>

        <button
          type="button"
          disabled={isRegenerating}
          onClick={onRegenerate}
          className="no-print inline-flex items-center gap-2 rounded-lg border border-blue-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50/40 disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`}
          />
          <span>Metodikalarni yangilash</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {methodologies.map((m, idx) => {
          const palette = METHOD_PALETTES[idx % METHOD_PALETTES.length];
          return (
            <motion.article
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.05 }}
              className={`print-break-inside-avoid overflow-hidden rounded-2xl border ${palette.border} bg-white shadow-sm shadow-blue-900/5`}
            >
              <div
                className={`h-1.5 w-full bg-gradient-to-r ${palette.topBar}`}
              />
              <div className="p-6 space-y-5">
                <div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className={`font-semibold ${palette.label}`}>
                      {String(idx + 1).padStart(2, '0')}. {m.category}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {m.durationMinutes} daqiqa
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{m.groupFormat}</span>
                  </div>

                  <h3 className="mt-2 font-display text-lg font-semibold text-slate-900">
                    {m.name}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {m.purpose}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-4">
                  <h4 className="text-xs font-medium text-slate-400">
                    O‘tkazish bosqichlari
                  </h4>
                  <ol className="mt-2.5 space-y-2">
                    {m.steps.map((step, sIdx) => (
                      <li
                        key={sIdx}
                        className="flex items-start gap-2.5 text-sm leading-relaxed text-slate-700"
                      >
                        <span
                          className={`font-mono text-xs font-semibold ${palette.stepNum} tabular-nums mt-0.5`}
                        >
                          {sIdx + 1}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className={`rounded-xl ${palette.sampleBg} p-4 space-y-2`}>
                  <h4 className={`text-xs font-semibold ${palette.sampleTitle}`}>
                    Mavzu asosida tayyor namuna
                  </h4>
                  <p className="text-xs font-medium text-slate-800">
                    {m.topicExample.prompt}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {m.topicExample.sampleEntries.map((entry, eIdx) => (
                      <li
                        key={eIdx}
                        className="flex items-start gap-2 text-xs leading-relaxed text-slate-700"
                      >
                        <span
                          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${palette.dot}`}
                        />
                        <span>{entry}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="text-xs text-slate-400">
                  <span className="font-medium text-slate-600">
                    Kerakli jihozlar:{' '}
                  </span>
                  {m.materialsNeeded.join(', ')}
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
};
