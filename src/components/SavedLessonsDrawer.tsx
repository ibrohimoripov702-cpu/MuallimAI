import React from 'react';
import { Trash2, X } from 'lucide-react';
import type { GeneratedLesson } from '../types/lesson.ts';

interface SavedLessonsDrawerProps {
  isOpen: boolean;
  lessons: GeneratedLesson[];
  activeLessonId?: string;
  onClose: () => void;
  onSelect: (lesson: GeneratedLesson) => void;
  onDelete: (id: string) => void;
}

export const SavedLessonsDrawer: React.FC<SavedLessonsDrawerProps> = ({
  isOpen,
  lessons,
  activeLessonId,
  onClose,
  onSelect,
  onDelete,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Saqlangan darslar"
      className="no-print fixed inset-0 z-50 flex justify-end bg-blue-950/25 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-blue-200 bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-blue-100 px-6 py-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-slate-900">
              Saqlangan darslar
            </h2>
            <p className="text-xs text-slate-500 tabular-nums">
              Jami {lessons.length} ta dars majmuasi
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Yopish"
            className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-slate-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {lessons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-blue-200 p-8 text-center">
              <p className="text-sm font-medium text-slate-700">
                Hali saqlangan darslar yo‘q
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Yaratilgan har bir dars avtomatik tarzda shu yerda saqlanadi.
              </p>
            </div>
          ) : (
            lessons.map((item) => {
              const isCurrent = item.id === activeLessonId;
              const dateText = new Date(item.createdAt).toLocaleDateString(
                'uz-UZ',
                {
                  day: '2-digit',
                  month: 'short',
                },
              );

              return (
                <div
                  key={item.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    isCurrent
                      ? 'border-blue-700 bg-blue-50/60'
                      : 'border-blue-200/70 bg-white hover:border-blue-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onSelect(item);
                        onClose();
                      }}
                      className="flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                        <span className="font-medium text-blue-700">
                          {item.subject}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{item.gradeLevel}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{dateText}</span>
                      </div>
                      <h3 className="mt-1 text-sm font-medium text-slate-900">
                        {item.topic}
                      </h3>
                    </button>

                    <button
                      type="button"
                      aria-label="Darsni o'chirish"
                      onClick={() => onDelete(item.id)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
