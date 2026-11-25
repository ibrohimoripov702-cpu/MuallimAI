import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import {
  buildCrosswordGrid,
  normalizeCrosswordWord,
} from './src/utils/crosswordBuilder.ts';
import { buildWordSearchGrid } from './src/utils/wordSearchBuilder.ts';
import { inferVisualTheme } from './src/utils/themeRegistry.ts';
import {
  getTelegramBotState,
  handleTelegramUpdate,
  startTelegramBot,
} from './src/bot/telegramBot.ts';
import type {
  DifficultyLevel,
  GeneratedLesson,
  InteractiveGamesData,
  LessonLanguage,
  LessonRequest,
  LessonVisualTheme,
  ModuleKey,
} from './src/types/lesson.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY topilmadi. Iltimos, Settings > Secrets bo'limida API kalitini tekshiring.",
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const LANGUAGE_LABELS: Record<LessonLanguage, string> = {
  uz: "O'zbek tili (lotin alifbosida, ravon adabiy va pedagogik uslubda)",
  ru: 'Русский язык (грамотный академический и педагогический стиль)',
  en: 'English (clear, engaging academic and pedagogical tone)',
};

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  oson: "Oson / Boshlang'ich tushunchalar",
  orta: "O'rta / Standart maktab dasturi darajasi",
  qiyin: 'Chuqurlashtirilgan / Olimpiada va tahliliy daraja',
};

const SLIDES_SCHEMA = {
  type: Type.ARRAY,
  description:
    '10 rich, comprehensive, logically ordered presentation slides for the lesson.',
  items: {
    type: Type.OBJECT,
    properties: {
      slideNumber: { type: Type.INTEGER },
      layoutType: {
        type: Type.STRING,
        description:
          'One of: title, concept, comparison, process, fact_grid, summary',
      },
      title: { type: Type.STRING },
      subtitle: { type: Type.STRING },
      leadParagraph: {
        type: Type.STRING,
        description:
          'Clear, accurate 2-3 sentence core explanation with real facts, definitions, or examples.',
      },
      bulletPoints: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description:
          '4 to 5 detailed, informative bullet points with concrete concepts, dates, formulas, or mechanisms.',
      },
      keyFacts: {
        type: Type.ARRAY,
        description:
          '2 to 3 crisp key highlight facts, formulas, dates, or definitions.',
        items: {
          type: Type.OBJECT,
          properties: {
            label: { type: Type.STRING },
            value: { type: Type.STRING },
          },
          required: ['label', 'value'],
        },
      },
      comparisonData: {
        type: Type.OBJECT,
        description:
          'Include when layoutType is comparison: two contrasting concepts or categories.',
        properties: {
          leftTitle: { type: Type.STRING },
          leftPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          rightTitle: { type: Type.STRING },
          rightPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['leftTitle', 'leftPoints', 'rightTitle', 'rightPoints'],
      },
      processSteps: {
        type: Type.ARRAY,
        description:
          'Include when layoutType is process: 3 to 4 sequential flow stages.',
        items: {
          type: Type.OBJECT,
          properties: {
            step: { type: Type.STRING },
            detail: { type: Type.STRING },
          },
          required: ['step', 'detail'],
        },
      },
      keyTakeaway: {
        type: Type.STRING,
        description: 'One-sentence core conclusion for the slide.',
      },
      visualSuggestion: {
        type: Type.STRING,
        description:
          'Specific diagram, chart, or visual aid recommendation for the teacher.',
      },
      speakerNotes: {
        type: Type.STRING,
        description:
          'Detailed 3-5 sentence narration script for the teacher plus a classroom discussion question.',
      },
    },
    required: [
      'slideNumber',
      'layoutType',
      'title',
      'leadParagraph',
      'bulletPoints',
      'keyFacts',
      'keyTakeaway',
      'visualSuggestion',
      'speakerNotes',
    ],
  },
};

const HOMEWORK_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    overview: {
      type: Type.STRING,
      description: 'Brief guidance for assigning and reviewing the homework.',
    },
    tasks: {
      type: Type.ARRAY,
      description:
        'Exactly 3 tiered homework tasks: Bazaviy, Amaliy, and Ijodiy.',
      items: {
        type: Type.OBJECT,
        properties: {
          tier: {
            type: Type.STRING,
            description: 'Must be one of: Bazaviy, Amaliy, Ijodiy',
          },
          title: { type: Type.STRING },
          instructions: { type: Type.STRING },
          deliverable: { type: Type.STRING },
          estimatedMinutes: { type: Type.INTEGER },
          gradingCriteria: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: [
          'tier',
          'title',
          'instructions',
          'deliverable',
          'estimatedMinutes',
          'gradingCriteria',
        ],
      },
    },
  },
  required: ['overview', 'tasks'],
};

const GAMES_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    crosswordTitle: { type: Type.STRING },
    crosswordWords: {
      type: Type.ARRAY,
      description:
        '12 single-word topic terms for a crossword grid. Each word MUST be a single uppercase word with 4 to 10 letters, NO spaces, NO hyphens, NO apostrophes.',
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          clue: { type: Type.STRING },
        },
        required: ['word', 'clue'],
      },
    },
    wordSearchTitle: { type: Type.STRING },
    wordSearchWords: {
      type: Type.ARRAY,
      description:
        '8 single-word key terms (4 to 9 letters, uppercase, no spaces or apostrophes) hidden inside a word search grid.',
      items: {
        type: Type.OBJECT,
        properties: {
          word: { type: Type.STRING },
          clue: { type: Type.STRING },
        },
        required: ['word', 'clue'],
      },
    },
    matchingPuzzle: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        instructions: { type: Type.STRING },
        pairs: {
          type: Type.ARRAY,
          description: '6 concept-to-definition matching puzzle pairs.',
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              term: { type: Type.STRING },
              definition: { type: Type.STRING },
              hint: { type: Type.STRING },
            },
            required: ['id', 'term', 'definition', 'hint'],
          },
        },
      },
      required: ['title', 'instructions', 'pairs'],
    },
    sequencePuzzle: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        instructions: { type: Type.STRING },
        steps: {
          type: Type.ARRAY,
          description:
            '5 sequential logical or chronological steps related to the topic in exact correct order.',
          items: {
            type: Type.OBJECT,
            properties: {
              order: { type: Type.INTEGER },
              title: { type: Type.STRING },
              detail: { type: Type.STRING },
            },
            required: ['order', 'title', 'detail'],
          },
        },
      },
      required: ['title', 'instructions', 'steps'],
    },
    anagramPuzzle: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        instructions: { type: Type.STRING },
        items: {
          type: Type.ARRAY,
          description:
            '6 single-word topic terms (4 to 9 uppercase letters, no spaces or apostrophes) with helpful hints for letter-tile unscrambling.',
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              word: { type: Type.STRING },
              hint: { type: Type.STRING },
            },
            required: ['id', 'word', 'hint'],
          },
        },
      },
      required: ['title', 'instructions', 'items'],
    },
    trueFalseBlitz: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        instructions: { type: Type.STRING },
        items: {
          type: Type.ARRAY,
          description:
            '8 clear, engaging true-or-false statements about the topic (mix of true and false).',
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              statement: { type: Type.STRING },
              isTrue: { type: Type.BOOLEAN },
              explanation: { type: Type.STRING },
            },
            required: ['id', 'statement', 'isTrue', 'explanation'],
          },
        },
      },
      required: ['title', 'instructions', 'items'],
    },
  },
  required: [
    'crosswordTitle',
    'crosswordWords',
    'wordSearchTitle',
    'wordSearchWords',
    'matchingPuzzle',
    'sequencePuzzle',
    'anagramPuzzle',
    'trueFalseBlitz',
  ],
};

const METHODOLOGIES_SCHEMA = {
  type: Type.ARRAY,
  description:
    '4 distinct interactive pedagogical methodologies (e.g. Klaster, B-B-B, Insert, Sinkveyn, Baliq skeleti, Venn diagrammasi) adapted specifically for this topic.',
  items: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING },
      category: { type: Type.STRING },
      durationMinutes: { type: Type.INTEGER },
      groupFormat: { type: Type.STRING },
      purpose: { type: Type.STRING },
      materialsNeeded: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      steps: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      topicExample: {
        type: Type.OBJECT,
        properties: {
          prompt: { type: Type.STRING },
          sampleEntries: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ['prompt', 'sampleEntries'],
      },
    },
    required: [
      'name',
      'category',
      'durationMinutes',
      'groupFormat',
      'purpose',
      'materialsNeeded',
      'steps',
      'topicExample',
    ],
  },
};

const TESTS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    passingScorePercent: { type: Type.INTEGER },
    questions: {
      type: Type.ARRAY,
      description: '10 multiple-choice questions with 4 options each.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          question: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Exactly 4 answer choices.',
          },
          correctIndex: {
            type: Type.INTEGER,
            description: '0-based index (0, 1, 2, or 3) of the correct option.',
          },
          difficulty: {
            type: Type.STRING,
            description: "One of: Oson, O'rta, Qiyin",
          },
          explanation: {
            type: Type.STRING,
            description: 'Clear pedagogical explanation of why this answer is right.',
          },
        },
        required: [
          'id',
          'question',
          'options',
          'correctIndex',
          'difficulty',
          'explanation',
        ],
      },
    },
  },
  required: ['title', 'passingScorePercent', 'questions'],
};

async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const isRetryable =
        msg.includes('503') ||
        msg.includes('500') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('DEADLINE_EXCEEDED');
      if (!isRetryable || attempt === retries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 800 * Math.pow(2, attempt)));
    }
  }
  throw lastError;
}

function buildLessonPrompt(req: LessonRequest, modules: ModuleKey[]): string {
  const moduleDescriptions: string[] = [];
  if (modules.includes('slides')) {
    moduleDescriptions.push(
      "- TAQDIMOT SLAYDLARI (slides): 10 ta chuqur, aniq va mazmunli slayd yarating (title, concept, process, comparison, fact_grid, summary turlarini aralashtiring). Har bir slaydda batafsil 'leadParagraph' (2-3 gapli aniq ilmiy/amaliy tushuntirish), 4-5 ta konkret fakt/misolli 'bulletPoints', 2-3 ta 'keyFacts' (asosiy formula, sana, ko'rsatkich yoki atama), kerakli slaydlarda 'comparisonData' va 'processSteps', hamda boy 'speakerNotes' bo'lsin.",
    );
  }
  if (modules.includes('homework')) {
    moduleDescriptions.push(
      "- UYGA VAZIFALAR (homework): 3 darajali (Bazaviy, Amaliy, Ijodiy) topshiriqlar, bajarish yo'riqnomasi, kutilayotgan natija va aniq baholash mezonlari.",
    );
  }
  if (modules.includes('games')) {
    moduleDescriptions.push(
      "- INTERAKTIV O'YINLAR (games): 6 xil o'yin yarating: 1) Krossvord uchun 12 ta bir so'zli atama (FAQAT 1 so'z, bo'shliq/tutuq belgisiz, 4-10 harf); 2) So'z izlash (wordSearchWords) uchun 8 ta bir so'zli atama; 3) Moslashtirish pazli (6 juftlik); 4) Ketma-ketlik pazli (5 bosqich); 5) Anagramma (6 ta bir so'zli atama va ishora); 6) Tezkor Viktorina (trueFalseBlitz: 8 ta To'g'ri/Noto'g'ri mulohaza va izoh).",
    );
  }
  if (modules.includes('methodologies')) {
    moduleDescriptions.push(
      "- PEDAGOGIK METODIKALAR (methodologies): Darsda qo'llash uchun 4 ta zamonaviy interfaol metodika (masalan: Klaster, B-B-B, Insert, Sinkveyn, Baliq skeleti, Venn diagrammasi) — bosqichma-bosqich ko'rsatma va AYNAN shu mavzu uchun to'ldirilgan tayyor namuna bilan.",
    );
  }
  if (modules.includes('tests')) {
    moduleDescriptions.push(
      "- MAVZUGA DOIR TESTLAR (tests): 10 ta sifatli, 4 variantli (A, B, C, D) test savoli (oson, o'rta va qiyin darajalar aralash), to'g'ri javob indeksi (0-3) va har bir savol uchun qisqa tushuntirish izohi.",
    );
  }

  return `Siz tajribali metodist va pedagog-ekspertsiz. O'qituvchi uchun to'liq, chuqur, ilmiy aniq va darsda darhol ishlatishga tayyor o'quv materiallari majmuasini yarating.

DARS MA'LUMOTLARI:
- Mavzu: "${req.topic}"
- Fan: ${req.subject}
- Sinf / Auditoriya: ${req.gradeLevel}
- Dars davomiyligi: ${req.durationMinutes} daqiqa
- Qiyinlik darajasi: ${DIFFICULTY_LABELS[req.difficulty]}
- Yaratish tili: ${LANGUAGE_LABELS[req.language]}
${req.extraNotes ? `- O'qituvchining qo'shimcha talabi: ${req.extraNotes}` : ''}

TANLANGAN BO'LIMLAR:
${moduleDescriptions.join('\n')}

MUHIM QOIDALAR:
1. Barcha matnlar ko'rsatilgan tilda (${req.language.toUpperCase()}) savodli, aniq ilmiy dalillar va hayotiy misollar bilan boyitilgan bo'lsin.
2. Krossvord, So'z izlash va Anagramma so'zlari faqat bitta so'zdan iborat bo'lsin, probel, chiziqcha yoki apostrof bo'lmasin (masalan, OSIMLIK, XLOROFILL, ENERGIYA kabi).
3. Test savollarida correctIndex 0 dan 3 gacha bo'lsin va to'g'ri javoblar har xil indekslarga teng taqsimlansin.
4. visualTheme maydonini mavzuga qarab quyidagilardan biriga belgilang: biology_nature, math_tech, history_heritage, physics_cosmos, language_arts.`;
}

function formatCrosswordFromRaw(rawGames: {
  crosswordTitle?: string;
  crosswordWords?: Array<{ word: string; clue: string }>;
  wordSearchTitle?: string;
  wordSearchWords?: Array<{ word: string; clue: string }>;
  matchingPuzzle?: InteractiveGamesData['matchingPuzzle'];
  sequencePuzzle?: InteractiveGamesData['sequencePuzzle'];
  anagramPuzzle?: InteractiveGamesData['anagramPuzzle'];
  trueFalseBlitz?: InteractiveGamesData['trueFalseBlitz'];
}): InteractiveGamesData {
  const crossword = buildCrosswordGrid(
    rawGames.crosswordTitle || 'Mavzu krossvordi',
    rawGames.crosswordWords || [],
    10,
  );
  const wordSearch = buildWordSearchGrid(
    rawGames.wordSearchTitle || 'Harflar dengizidan so‘z toping',
    rawGames.wordSearchWords?.length
      ? rawGames.wordSearchWords
      : rawGames.crosswordWords || [],
    11,
  );

  const anagramItems = (rawGames.anagramPuzzle?.items || [])
    .map((item, idx) => ({
      id: item.id || String(idx + 1),
      word: normalizeCrosswordWord(item.word),
      hint: item.hint,
    }))
    .filter((item) => item.word.length >= 3 && item.word.length <= 12);

  return {
    crossword,
    wordSearch,
    matchingPuzzle: rawGames.matchingPuzzle ?? {
      title: 'Moslashtirish pazli',
      instructions: 'Atama va ta’riflarni moslang.',
      pairs: [],
    },
    sequencePuzzle: rawGames.sequencePuzzle ?? {
      title: 'Ketma-ketlik pazli',
      instructions: 'Bosqichlarni to‘g‘ri tartibda joylashtiring.',
      steps: [],
    },
    anagramPuzzle: {
      title: rawGames.anagramPuzzle?.title || 'Anagramma: Yashirin so‘zni yig‘ing',
      instructions:
        rawGames.anagramPuzzle?.instructions ||
        'Aralashgan harflarni ketma-ket bosib, mavzuga oid atamani hosil qiling.',
      items: anagramItems,
    },
    trueFalseBlitz: rawGames.trueFalseBlitz ?? {
      title: 'Tezkor Viktorina: To‘g‘ri yoki Noto‘g‘ri',
      instructions: 'Har bir mulohazani vaqt tugamasdan baholang.',
      items: [],
    },
  };
}

function formatApiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return {
      status: 403,
      message:
        "Gemini API kaliti yaroqsiz yoki ruxsat etilmagan. Iltimos, Settings > Secrets bo'limida GEMINI_API_KEY ni tekshiring.",
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('429')) {
    return {
      status: 429,
      message:
        "So'rovlar limiti vaqtincha tugadi. Biroz kutib qayta urinib ko'ring.",
    };
  }
  if (raw.includes('GEMINI_API_KEY topilmadi')) {
    return { status: 500, message: raw };
  }
  return {
    status: 500,
    message: `Materiallarni yaratishda xatolik yuz berdi: ${raw}`,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/generate-lesson', async (req: Request, res: Response) => {
    try {
      const body = req.body as Partial<LessonRequest>;
      const topic = (body.topic || '').trim();
      if (!topic || topic.length < 2) {
        res.status(400).json({ error: 'Iltimos, dars mavzusini kiriting.' });
        return;
      }

      const validModules: ModuleKey[] = [
        'slides',
        'homework',
        'games',
        'methodologies',
        'tests',
      ];
      const selectedModules = (body.selectedModules || []).filter((m): m is ModuleKey =>
        validModules.includes(m),
      );

      if (selectedModules.length === 0) {
        res.status(400).json({
          error: "Kamida bitta bo'limga ptichka qo'ying.",
        });
        return;
      }

      const normalizedReq: LessonRequest = {
        topic,
        subject: (body.subject || 'Umumiy fan').trim(),
        gradeLevel: (body.gradeLevel || '7-sinf').trim(),
        language: body.language || 'uz',
        durationMinutes: Number(body.durationMinutes) || 45,
        difficulty: body.difficulty || 'orta',
        selectedModules,
        extraNotes: body.extraNotes?.trim(),
      };

      const properties: Record<string, unknown> = {
        visualTheme: {
          type: Type.STRING,
          description:
            'Best visual theme for the subject/topic. One of: biology_nature, math_tech, history_heritage, physics_cosmos, language_arts',
        },
        summary: {
          type: Type.STRING,
          description: '2-3 sentence pedagogical overview of the lesson.',
        },
        learningObjectives: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: '3 to 4 concrete learning objectives for students.',
        },
      };
      const required = ['visualTheme', 'summary', 'learningObjectives'];

      if (selectedModules.includes('slides')) {
        properties.slides = SLIDES_SCHEMA;
        required.push('slides');
      }
      if (selectedModules.includes('homework')) {
        properties.homework = HOMEWORK_SCHEMA;
        required.push('homework');
      }
      if (selectedModules.includes('games')) {
        properties.games = GAMES_SCHEMA;
        required.push('games');
      }
      if (selectedModules.includes('methodologies')) {
        properties.methodologies = METHODOLOGIES_SCHEMA;
        required.push('methodologies');
      }
      if (selectedModules.includes('tests')) {
        properties.tests = TESTS_SCHEMA;
        required.push('tests');
      }

      const ai = getGeminiClient();
      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: buildLessonPrompt(normalizedReq, selectedModules),
          config: {
            systemInstruction:
              "Siz O'zbekiston va xalqaro ta'lim standartlarini chuqur biladigan senior metodist va dars loyihalovchisiz. Javob faqat berilgan JSON sxemasiga qat'iy mos bo'lishi kerak.",
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties,
              required,
            },
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        }),
      );

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);

      const lesson: GeneratedLesson = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        topic: normalizedReq.topic,
        subject: normalizedReq.subject,
        gradeLevel: normalizedReq.gradeLevel,
        language: normalizedReq.language,
        durationMinutes: normalizedReq.durationMinutes,
        difficulty: normalizedReq.difficulty,
        visualTheme: inferVisualTheme(
          normalizedReq.subject,
          normalizedReq.topic,
          parsed.visualTheme as LessonVisualTheme | undefined,
        ),
        summary: parsed.summary || '',
        learningObjectives: Array.isArray(parsed.learningObjectives)
          ? parsed.learningObjectives
          : [],
        selectedModules,
        slides: parsed.slides,
        homework: parsed.homework,
        games: parsed.games ? formatCrosswordFromRaw(parsed.games) : undefined,
        methodologies: parsed.methodologies,
        tests: parsed.tests,
      };

      res.json(lesson);
    } catch (err: unknown) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/regenerate-module', async (req: Request, res: Response) => {
    try {
      const body = req.body as Partial<LessonRequest> & { moduleKey?: ModuleKey };
      const topic = (body.topic || '').trim();
      const moduleKey = body.moduleKey;

      if (!topic || !moduleKey) {
        res.status(400).json({ error: "Mavzu va bo'lim ko'rsatilishi shart." });
        return;
      }

      const schemaMap: Record<ModuleKey, unknown> = {
        slides: SLIDES_SCHEMA,
        homework: HOMEWORK_SCHEMA,
        games: GAMES_SCHEMA,
        methodologies: METHODOLOGIES_SCHEMA,
        tests: TESTS_SCHEMA,
      };

      const targetSchema = schemaMap[moduleKey];
      if (!targetSchema) {
        res.status(400).json({ error: "Noto'g'ri bo'lim nomi." });
        return;
      }

      const normalizedReq: LessonRequest = {
        topic,
        subject: (body.subject || 'Umumiy fan').trim(),
        gradeLevel: (body.gradeLevel || '7-sinf').trim(),
        language: body.language || 'uz',
        durationMinutes: Number(body.durationMinutes) || 45,
        difficulty: body.difficulty || 'orta',
        selectedModules: [moduleKey],
        extraNotes: body.extraNotes?.trim(),
      };

      const ai = getGeminiClient();
      const response = await callGeminiWithRetry(() =>
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents:
            buildLessonPrompt(normalizedReq, [moduleKey]) +
            "\n\nESLATMA: Avvalgisidan farqli, yangi va ijodiy variant yarating.",
          config: {
            systemInstruction:
              "Siz tajribali metodistsiz. Faqat so'ralgan JSON obyektni qaytaring.",
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                data: targetSchema,
              },
              required: ['data'],
            },
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        }),
      );

      const rawText = (response.text ?? '{}').trim();
      const parsed = JSON.parse(rawText);
      const data =
        moduleKey === 'games' ? formatCrosswordFromRaw(parsed.data) : parsed.data;

      res.json({ moduleKey, data });
    } catch (err: unknown) {
      const formatted = formatApiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.get('/api/telegram/info', (_req: Request, res: Response) => {
    const bot = getTelegramBotState();
    res.json({
      configured: bot.configured,
      username: bot.username,
      miniAppUrl: bot.miniAppUrl || process.env.APP_URL || '',
    });
  });

  app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
    const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    if (!token) {
      res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN sozlanmagan' });
      return;
    }
    res.sendStatus(200);
    const appUrl = (process.env.APP_URL || '').trim();
    await handleTelegramUpdate(req.body, token, appUrl, getGeminiClient);
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Muallim Studio server running on http://0.0.0.0:${PORT}`);
    const appUrl = (process.env.APP_URL || '').trim();
    void startTelegramBot(appUrl, getGeminiClient);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
