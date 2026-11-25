import React, { useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';
import type { HomeworkSection, HomeworkTask } from '../types/lesson.ts';

interface HomeworkViewProps {
  homework: HomeworkSection;
  isRegenerating: boolean;
  onRegenerate: () => void;
}

const TIER_STYLES: Record<
  HomeworkTask['tier'],
  {
    border: string;
    topBar: string;
    label: string;
    boxBg: string;
    boxLabel: string;
    dot: string;
  }
> = {
  Bazaviy: {
    border: 'border-sky-200/90',
    topBar: 'from-sky-500 to-blue-500',
    label: 'text-sky-700',
    boxBg: 'bg-sky-50/70',
    boxLabel: 'text-sky-800',
    dot: 'bg-sky-500',
  },
  Amaliy: {
    border: 'border-indigo-200/90',
    topBar: 'from-indigo-500 to-violet-500',
    label: 'text-indigo-700',
    boxBg: 'bg-indigo-50/70',
    boxLabel: 'text-indigo-800',
    dot: 'bg-indigo-500',
  },
  Ijodiy: {
    border: 'border-emerald-200/90',
    topBar: 'from-emerald-500 to-teal-500',
    label: 'text-emerald-700',
    boxBg: 'bg-emerald-50/70',
    boxLabel: 'text-emerald-800',
    dot: 'bg-emerald-500',
  },
};

export const HomeworkView: React.FC<HomeworkViewProps> = ({
  homework,
  isRegenerating,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = [
      homework.overview,
      '',
      ...homework.tasks.map(
        (t, idx) =>
          `${idx + 1}. [${t.tier}] ${t.title} (~${t.estimatedMinutes} daqiqa)\n` +
          `Topshiriq: ${t.instructions}\n` +
          `Natija: ${t.deliverable}\n` +
          `Baholash mezonlari:\n${t.gradingCriteria.map((c) => `- ${c}`).join('\n')}`,
      ),
    ].join('\n\n');

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-semibold text-slate-900">
            Uyga vazifalar (3 darajali)
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            {homework.overview}
          </p>
        </div>

        <div className="no-print flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50/40 whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-700" />
                <span>Nusxa olindi</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Matnni nusxalash</span>
              </>
            )}
          </button>

          <button
            type="button"
            disabled={isRegenerating}
            onClick={onRegenerate}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-200/80 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:border-blue-300 hover:bg-blue-50/40 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`}
            />
            <span>Yangilash</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {homework.tasks.map((task, idx) => {
          const style = TIER_STYLES[task.tier] || TIER_STYLES.Bazaviy;
          return (
            <motion.article
              key={idx}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: idx * 0.06 }}
              className={`print-break-inside-avoid flex flex-col justify-between overflow-hidden rounded-2xl border ${style.border} bg-white shadow-sm shadow-blue-900/5`}
            >
              <div>
                <div className={`h-1.5 w-full bg-gradient-to-r ${style.topBar}`} />
                <div className="p-6">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                    <span className={`font-semibold ${style.label}`}>
                      0{idx + 1}. {task.tier} daraja
                    </span>
                    <span className="font-mono tabular-nums">
                      {task.estimatedMinutes} daqiqa
                    </span>
                  </div>

                  <h3 className="mt-2.5 font-display text-lg font-semibold text-slate-900">
                    {task.title}
                  </h3>

                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {task.instructions}
                  </p>

                  <div className={`mt-4 rounded-xl ${style.boxBg} p-3.5`}>
                    <p className={`text-xs font-semibold ${style.boxLabel}`}>
                      Kutilayotgan natija
                    </p>
                    <p className="mt-1 text-sm text-slate-800">
                      {task.deliverable}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 px-6 py-4">
                <p className="text-xs font-medium text-slate-400">
                  Baholash mezonlari
                </p>
                <ul className="mt-2 space-y-1.5">
                  {task.gradingCriteria.map((criterion, cIdx) => (
                    <li
                      key={cIdx}
                      className="flex items-start gap-2 text-xs leading-relaxed text-slate-600"
                    >
                      <span
                        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${style.dot}`}
                      />
                      <span>{criterion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.article>
          );
        })}
      </div>
    </div>
  );
};
