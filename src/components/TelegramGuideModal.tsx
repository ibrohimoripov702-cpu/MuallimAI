import React, { useEffect, useState } from 'react';
import { Check, Copy, ExternalLink, Send, X } from 'lucide-react';

interface TelegramGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TelegramGuideModal: React.FC<TelegramGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [miniAppUrl, setMiniAppUrl] = useState('');
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fallbackUrl = window.location.origin;
    setMiniAppUrl(fallbackUrl);

    fetch('/api/telegram/info')
      .then((r) => r.json())
      .then((data: { username?: string | null; miniAppUrl?: string }) => {
        if (data.miniAppUrl && data.miniAppUrl.startsWith('https://')) {
          setMiniAppUrl(data.miniAppUrl);
        }
        setBotUsername(data.username ?? null);
      })
      .catch(() => {
        // Keep window.location.origin fallback
      });
  }, [isOpen]);

  if (!isOpen) return null;

  const copyUrl = async () => {
    await navigator.clipboard.writeText(miniAppUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Telegram botga ulash qo'llanmasi"
      className="no-print fixed inset-0 z-50 flex items-center justify-center bg-blue-950/30 p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-blue-200 bg-white p-6 sm:p-7 shadow-xl shadow-blue-950/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-blue-100 pb-4">
          <div>
            <p className="text-xs font-medium text-blue-700">
              Telegram Mini App va Bot
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold text-slate-900">
              Ilovani Telegram bot ichiga joylashtirish
            </h2>
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

        <div className="mt-5 space-y-5 text-sm text-slate-700">
          {botUsername && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50/70 px-4 py-3">
              <div className="flex items-center gap-2.5 text-blue-950">
                <Send className="h-4 w-4 text-blue-700" />
                <span className="font-medium">
                  Bot ulangan: @{botUsername}
                </span>
              </div>
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
              >
                <span>Telegramda ochish</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          <ol className="space-y-3.5">
            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-50 font-mono text-xs font-semibold text-blue-700">
                1
              </span>
              <div>
                <p className="font-medium text-slate-900">
                  Telegramda @BotFather ga kiring va yangi bot oching
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  <code className="font-mono text-blue-800">/newbot</code>{' '}
                  buyrug‘ini yuboring, bot nomini va username’ini (masalan,{' '}
                  <code className="font-mono">muallim_dars_bot</code>) kiriting.
                </p>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-50 font-mono text-xs font-semibold text-blue-700">
                2
              </span>
              <div>
                <p className="font-medium text-slate-900">
                  Bot menyusiga Mini App havolasini qo‘shing
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  @BotFather da{' '}
                  <code className="font-mono text-blue-800">/setmenubutton</code>{' '}
                  yoki{' '}
                  <code className="font-mono text-blue-800">/newapp</code>{' '}
                  buyrug‘ini tanlab, quyidagi ilova havolasini yuboring:
                </p>

                <div className="mt-2 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50/40 p-2">
                  <code className="flex-1 truncate font-mono text-xs text-slate-800 px-1">
                    {miniAppUrl}
                  </code>
                  <button
                    type="button"
                    onClick={copyUrl}
                    className="inline-flex items-center gap-1.5 rounded-md bg-white border border-blue-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-blue-50 shrink-0"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-700" />
                        <span>Nusxalandi</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Nusxalash</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </li>

            <li className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-50 font-mono text-xs font-semibold text-blue-700">
                3
              </span>
              <div>
                <p className="font-medium text-slate-900">
                  Bot tokenini serverga ulang (ixtiyoriy, chatda ham ishlashi uchun)
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                  @BotFather bergan tokenni AI Studio’dagi{' '}
                  <strong className="text-slate-700">Settings → Secrets</strong>{' '}
                  bo‘limiga{' '}
                  <code className="font-mono text-blue-800">
                    TELEGRAM_BOT_TOKEN
                  </code>{' '}
                  nomi bilan qo‘shsangiz, bot{' '}
                  <code className="font-mono">/start</code> buyrug‘iga javob beradi va
                  chatda yozilgan mavzularga ham tezkor reja qaytaradi.
                </p>
              </div>
            </li>
          </ol>
        </div>

        <div className="mt-6 flex justify-end border-t border-blue-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="btn-sheen rounded-lg bg-blue-700 px-5 py-2 text-xs font-medium text-white hover:bg-blue-800"
          >
            Tushunarli
          </button>
        </div>
      </div>
    </div>
  );
};
