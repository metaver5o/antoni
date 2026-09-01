import type { ParsedStory, StorySegment } from '../types';

// Resolved at build time by Expo's env injector; falls back to localhost.
const API_URL =
  (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL) ||
  'http://localhost:3001';

// Comprehensive icon keywords mapping in Portuguese
const ICON_KEYWORD_MAP: Record<string, string> = {
  // Animals -> paw-print, bird, fish
  cachorro: 'paw-print', cão: 'paw-print', cadela: 'paw-print', gato: 'paw-print', gata: 'paw-print',
  leao: 'paw-print', leão: 'paw-print', urso: 'paw-print', coelho: 'paw-print', dinossauro: 'paw-print',
  passaro: 'bird', pássaro: 'bird', passarinho: 'bird', coruja: 'bird', pato: 'bird',
  peixe: 'fish', tubarao: 'fish', tubarão: 'fish', baleia: 'fish',
  // Nature & Weather -> leaf, sun, moon, cloud, flower, star
  parque: 'leaf', floresta: 'leaf', bosque: 'leaf', arvore: 'leaf', árvore: 'leaf', planta: 'leaf',
  sol: 'sun', praia: 'sun', dia: 'sun', calor: 'sun',
  lua: 'moon', noite: 'moon',
  nuvem: 'cloud', chuva: 'cloud', ceu: 'cloud', céu: 'cloud',
  flor: 'flower', jardim: 'flower', rosa: 'flower',
  estrela: 'star', planeta: 'star', espaco: 'star', espaço: 'star', magica: 'star', mágica: 'star',
  // Objects & Places -> circle, car, book, home, apple, heart
  bola: 'circle', roda: 'circle', moeda: 'circle',
  carro: 'car', carrinho: 'car', foguete: 'car', navio: 'car', bicicleta: 'car',
  livro: 'book', escola: 'book', caderno: 'book', carta: 'book',
  casa: 'home', castelo: 'home', toca: 'home', telhado: 'home', ilha: 'home',
  maca: 'apple', maçã: 'apple', fruta: 'apple', comida: 'apple', bolo: 'apple',
  coracao: 'heart', coração: 'heart', amor: 'heart', amizade: 'heart',
};

const THEMED_FALLBACKS: ParsedStory[] = [
  {
    cleanStory: 'O [1] correu atras da [2] no [3].',
    gaps: [
      { id: 1, word: 'CACHORRO', icon: 'paw-print' },
      { id: 2, word: 'BOLA', icon: 'circle' },
      { id: 3, word: 'PARQUE', icon: 'leaf' },
    ],
  },
  {
    cleanStory: 'O [1] viu uma [2] brilhando no [3].',
    gaps: [
      { id: 1, word: 'GATO', icon: 'paw-print' },
      { id: 2, word: 'ESTRELA', icon: 'star' },
      { id: 3, word: 'TELHADO', icon: 'home' },
    ],
  },
  {
    cleanStory: 'O [1] viajou no [2] até a [3].',
    gaps: [
      { id: 1, word: 'URSO', icon: 'paw-print' },
      { id: 2, word: 'FOGUETE', icon: 'car' },
      { id: 3, word: 'LUA', icon: 'moon' },
    ],
  },
  {
    cleanStory: 'O [1] encontrou uma [2] perfumada no [3].',
    gaps: [
      { id: 1, word: 'PASSARINHO', icon: 'bird' },
      { id: 2, word: 'FLOR', icon: 'flower' },
      { id: 3, word: 'JARDIM', icon: 'flower' },
    ],
  },
  {
    cleanStory: 'O [1] nadou feliz com a [2] no fundo do [3].',
    gaps: [
      { id: 1, word: 'PEIXE', icon: 'fish' },
      { id: 2, word: 'BALEIA', icon: 'fish' },
      { id: 3, word: 'MAR', icon: 'sun' },
    ],
  },
];

function getIconForWord(word: string): string {
  const norm = word.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const [kw, icon] of Object.entries(ICON_KEYWORD_MAP)) {
    const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (norm.includes(kwNorm) || kwNorm.includes(norm)) {
      return icon;
    }
  }
  return 'star';
}

function parseLocallyFromTranscript(rawTranscript: string): ParsedStory {
  if (!rawTranscript || rawTranscript.trim().length < 6) {
    return THEMED_FALLBACKS[Math.floor(Math.random() * THEMED_FALLBACKS.length)];
  }

  // Remove common speech fillers
  const fillers = /\b(aí|ai|né|tipo|assim|então|entao|ãh|uh|sabe|quer dizer|daí|dai|olha)\b/gi;
  let cleaned = rawTranscript.replace(fillers, ' ').replace(/\s+/g, ' ').trim();

  // Extract candidate words (alphanumeric tokens with 3+ letters)
  const words = cleaned
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !/^(uma|uns|umas|este|esta|esse|essa|aquele|aquela|para|com|por|sem|sob|sobre|dele|dela|meu|minha|seu|sua|nosso|onde|quando|como|porque|muito|mais)$/i.test(w));

  // Find words that match our known keyword map or pick 3 unique words
  const chosen: string[] = [];
  for (const w of words) {
    const upper = w.toUpperCase();
    if (!chosen.includes(upper) && (getIconForWord(w) !== 'star' || words.length <= 5)) {
      chosen.push(upper);
      if (chosen.length === 3) break;
    }
  }

  // If we couldn't find 3 distinct words from the speech, supplement with others from the transcript
  if (chosen.length < 3) {
    for (const w of words) {
      const upper = w.toUpperCase();
      if (!chosen.includes(upper)) {
        chosen.push(upper);
        if (chosen.length === 3) break;
      }
    }
  }

  // If still less than 3, fallback to a theme
  if (chosen.length < 3) {
    return THEMED_FALLBACKS[Math.floor(Math.random() * THEMED_FALLBACKS.length)];
  }

  // Build clean story with [1], [2], [3]
  let storyText = cleaned;
  const gaps = chosen.map((word, idx) => {
    const id = idx + 1;
    // Replace the first occurrence of this word (case-insensitive) with [id]
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    storyText = storyText.replace(regex, `[${id}]`);
    return {
      id,
      word,
      icon: getIconForWord(word),
    };
  });

  // Ensure each [1], [2], [3] marker is present
  if (!storyText.includes('[1]') || !storyText.includes('[2]') || !storyText.includes('[3]')) {
    storyText = `O [1] brincou com [2] no [3].`;
  }

  // Capitalize first letter and add period if missing
  storyText = storyText.charAt(0).toUpperCase() + storyText.slice(1);
  if (!/[.!?]$/.test(storyText)) storyText += '.';

  return { cleanStory: storyText, gaps };
}

export async function parseNarrative(transcript: string): Promise<ParsedStory> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const res = await fetch(`${API_URL}/api/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = (await res.json()) as ParsedStory;
    if (!data.cleanStory || !Array.isArray(data.gaps) || data.gaps.length < 2) {
      throw new Error('Invalid API response shape');
    }
    // Filter gaps to ensure only gaps that actually exist in cleanStory are returned
    const presentMarkers = (data.cleanStory.match(/\[\d+\]/g) || []).map((m) =>
      Number(m.replace(/\D/g, '')),
    );
    data.gaps = data.gaps.filter((g) => presentMarkers.includes(g.id));
    return data;
  } catch (err) {
    console.log('parseNarrative: backend unavailable or offline, using smart local parser.', err);
    return parseLocallyFromTranscript(transcript);
  }
}

export function buildFullStory(story: ParsedStory): string {
  let text = story.cleanStory;
  for (const g of story.gaps) {
    text = text.replace(`[${g.id}]`, g.word);
  }
  return text;
}

export function parseStorySegments(cleanStory: string): StorySegment[] {
  return cleanStory
    .split(/(\[\d+\])/)
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^\[(\d+)\]$/);
      return m
        ? ({ type: 'gap', id: Number(m[1]) } as StorySegment)
        : ({ type: 'text', content: part } as StorySegment);
    });
}
