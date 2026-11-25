import React from 'react';
import type { ModuleKey } from '../types/lesson.ts';

interface HeaderProps {
  activeSection: 'builder' | ModuleKey;
  hasLesson: boolean;
  availableModules: ModuleKey[];
  savedCount: number;
  onNavigate: (target: 'builder' | ModuleKey) => void;
  onOpenSaved: () => void;
}

const NAV_ITEMS: Array<{ key: 'builder' | ModuleKey; label: string }> = [
  { key: 'builder', label: 'Konstruktor' },
  { key: 'slides', label: 'Taqdimot' },
  { key: 'homework', label: 'Uyga vazifa' },
  { key: 'games', label: "O'yinlar" },
  { key: 'methodologies', label: 'Metodika' },
  { key: 'tests', label: 'Testlar' },
];

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  hasLesson,
  availableModules,
  savedCount,
  onNavigate,
  onOpenSaved,
}) => {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-blue-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-8 px-6 py-4">
        <button
          type="button"
          onClick={() => onNavigate('builder')}
          className="font-display text-base font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
        >
          Muallim Studio
        </button>

        <nav
          aria-label="Asosiy bo'limlar"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-500"
        >
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const isBuilder = item.key === 'builder';
            const isEnabled =
              isBuilder ||
              (hasLesson && availableModules.includes(item.key as ModuleKey));
            const isActive = activeSection === item.key;

            return (
              <button
                key={item.key}
                type="button"
                disabled={!isEnabled}
                onClick={() => onNavigate(item.key)}
                className={`whitespace-nowrap shrink-0 border-b-2 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700 ${
                  isActive
                    ? 'border-blue-700 text-blue-950 font-semibold'
                    : isEnabled
                      ? 'border-transparent text-slate-600 hover:border-blue-300 hover:text-blue-900'
                      : 'border-transparent text-slate-300 cursor-not-allowed'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenSaved}
            className="btn-sheen rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-blue-700/20 hover:bg-blue-800 hover:shadow-md hover:shadow-blue-700/25 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {savedCount > 0
              ? `Saqlangan darslar (${savedCount})`
              : 'Saqlangan darslar'}
          </button>
        </div>
      </div>
    </header>
  );
};
