export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

interface TelegramWebApp {
  initData?: string;
  initDataUnsafe?: {
    user?: TelegramUser;
    start_param?: string;
  };
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  isExpanded?: boolean;
  platform?: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function isInsideTelegram(): boolean {
  return Boolean(window.Telegram?.WebApp?.initData);
}

export function initTelegramMiniApp(): void {
  try {
    const tg = window.Telegram?.WebApp;
    if (!tg) return;
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('#E8F1FF');
    tg.setBackgroundColor?.('#E8F1FF');
  } catch {
    // Ignore outside Telegram
  }
}

export function getTelegramUser(): TelegramUser | null {
  try {
    return window.Telegram?.WebApp?.initDataUnsafe?.user ?? null;
  } catch {
    return null;
  }
}

export function getInitialTopicFromUrl(): string {
  try {
    const params = new URLSearchParams(window.location.search);
    return (params.get('topic') || '').trim();
  } catch {
    return '';
  }
}
