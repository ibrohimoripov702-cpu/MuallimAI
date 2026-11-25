import type { GoogleGenAI } from '@google/genai';

interface TelegramChat {
  id: number;
}

interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  text?: string;
  from?: {
    first_name?: string;
  };
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

interface BotState {
  configured: boolean;
  username: string | null;
  miniAppUrl: string;
}

const state: BotState = {
  configured: false,
  username: null,
  miniAppUrl: '',
};

async function tgApi<T = unknown>(
  token: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<T | null> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!json.ok) {
      console.warn(`[TelegramBot] ${method} xatosi:`, json.description);
      return null;
    }
    return json.result ?? null;
  } catch (err) {
    console.warn(`[TelegramBot] ${method} tarmoq xatosi:`, err);
    return null;
  }
}

function buildMiniAppKeyboard(miniAppUrl: string, topic?: string) {
  if (!miniAppUrl.startsWith('https://')) {
    return undefined;
  }
  const url = topic
    ? `${miniAppUrl.replace(/\/+$/, '')}/?topic=${encodeURIComponent(topic)}`
    : miniAppUrl;

  return {
    inline_keyboard: [
      [
        {
          text: topic
            ? `✨ "${topic.slice(0, 22)}" bo‘yicha to‘liq darsni ochish`
            : '📘 Muallim Studio’ni ochish',
          web_app: { url },
        },
      ],
    ],
  };
}

export async function handleTelegramUpdate(
  update: TelegramUpdate,
  token: string,
  miniAppUrl: string,
  createAi: () => GoogleGenAI,
): Promise<void> {
  const msg = update.message;
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const firstName = msg.from?.first_name || "ustoz";

  if (text === '/start' || text.startsWith('/start ')) {
    const welcome = [
      `Assalomu alaykum, ${firstName}!`,
      '',
      'Men *Muallim Studio* — o‘qituvchilar uchun sun’iy intellekt yordamchisiman.',
      '',
      'Nimalar qila olaman:',
      '• Mavzuga mos taqdimot slaydlari',
      '• 3 darajali uyga vazifalar',
      '• O‘ynash mumkin bo‘lgan krossvord va pazllar',
      '• Pedagogik metodikalar va testlar',
      '',
      'Pastdagi tugmani bosib to‘liq konstruktorni oching yoki menga shunchaki *dars mavzusini* yozib yuboring.',
    ].join('\n');

    await tgApi(token, 'sendMessage', {
      chat_id: chatId,
      text: welcome,
      parse_mode: 'Markdown',
      reply_markup: buildMiniAppKeyboard(miniAppUrl),
    });
    return;
  }

  if (text === '/yordam' || text === '/help') {
    await tgApi(token, 'sendMessage', {
      chat_id: chatId,
      text:
        "Foydalanish juda oson:\n1. Pastdagi «Muallim Studio» tugmasini bosing.\n2. Mavzuni kiriting va kerakli bo‘limlarga ptichka qo‘ying.\n\nYoki shu chatga dars mavzusini yozing — men sizga tezkor reja va Mini App havolasini yuboraman.",
      reply_markup: buildMiniAppKeyboard(miniAppUrl),
    });
    return;
  }

  if (text.startsWith('/')) {
    return;
  }

  // Treat regular message as a lesson topic
  await tgApi(token, 'sendChatAction', {
    chat_id: chatId,
    action: 'typing',
  });

  try {
    const ai = createAi();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `O'qituvchi "${text}" mavzusi uchun tezkor dars rejasi so'radi. O'zbek tilida qisqa, aniq va amaliy javob bering:
1) Dars maqsadi (1-2 gap)
2) 3 ta asosiy tushuncha
3) 1 ta interfaol metodika tavsiyasi
4) 2 ta qisqa test savoli (javoblari bilan).
Format oddiy va Telegramda o'qishga qulay bo'lsin.`,
    });

    const replyText =
      (response.text || '').trim() ||
      `"${text}" mavzusi tayyor. To‘liq materiallarni ochish uchun pastdagi tugmani bosing.`;

    await tgApi(token, 'sendMessage', {
      chat_id: chatId,
      text: replyText.slice(0, 3900),
      reply_markup: buildMiniAppKeyboard(miniAppUrl, text),
    });
  } catch (err) {
    console.warn('[TelegramBot] Gemini xatosi:', err);
    await tgApi(token, 'sendMessage', {
      chat_id: chatId,
      text: `"${text}" mavzusi uchun to‘liq konstruktorni quyidagi tugma orqali ochishingiz mumkin:`,
      reply_markup: buildMiniAppKeyboard(miniAppUrl, text),
    });
  }
}

export function getTelegramBotState(): BotState {
  return { ...state };
}

export async function startTelegramBot(
  miniAppUrl: string,
  createAi: () => GoogleGenAI,
): Promise<void> {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  state.miniAppUrl = miniAppUrl;

  if (!token) {
    state.configured = false;
    state.username = null;
    return;
  }

  state.configured = true;

  const me = await tgApi<{ username?: string }>(token, 'getMe');
  if (me?.username) {
    state.username = me.username;
    console.log(`[TelegramBot] Ulandi: @${me.username}`);
  }

  await tgApi(token, 'setMyCommands', {
    commands: [
      { command: 'start', description: "Muallim Studio'ni ochish" },
      { command: 'yordam', description: "Foydalanish bo'yicha yordam" },
    ],
  });

  if (miniAppUrl.startsWith('https://')) {
    await tgApi(token, 'setChatMenuButton', {
      menu_button: {
        type: 'web_app',
        text: 'Muallim Studio',
        web_app: { url: miniAppUrl },
      },
    });
  }

  // Clear webhook to use clean background long-polling in this server process
  await tgApi(token, 'deleteWebhook', { drop_pending_updates: false });

  let offset = 0;
  const poll = async () => {
    try {
      const updates = await tgApi<TelegramUpdate[]>(token, 'getUpdates', {
        offset,
        timeout: 25,
        allowed_updates: ['message'],
      });
      if (Array.isArray(updates)) {
        for (const upd of updates) {
          offset = Math.max(offset, upd.update_id + 1);
          await handleTelegramUpdate(upd, token, miniAppUrl, createAi);
        }
      }
    } catch {
      // Transient polling errors will retry
    }
    setTimeout(poll, 600);
  };

  void poll();
}
