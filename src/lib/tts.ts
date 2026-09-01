/**
 * Dedicated Brazilian Portuguese (pt-BR) Text-To-Speech (TTS) Engine
 */

let cachedPtBrVoice: SpeechSynthesisVoice | null = null;

export function getBrazilianVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  if (cachedPtBrVoice) return cachedPtBrVoice;

  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Explicit pt-BR voices
  const ptBrVoices = voices.filter((v) => {
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    const name = (v.name || '').toLowerCase();
    return (
      lang === 'pt-br' ||
      lang.startsWith('pt-br') ||
      name.includes('brasil') ||
      name.includes('brazil') ||
      name.includes('luciana') ||
      name.includes('felipe') ||
      name.includes('leticia') ||
      name.includes('fernanda')
    );
  });

  if (ptBrVoices.length > 0) {
    // Prefer Google or high-quality natural voices if present
    const preferred =
      ptBrVoices.find((v) => v.name.toLowerCase().includes('google')) ||
      ptBrVoices.find((v) => v.name.toLowerCase().includes('natural')) ||
      ptBrVoices.find((v) => v.name.toLowerCase().includes('enhanced')) ||
      ptBrVoices[0];

    cachedPtBrVoice = preferred;
    return preferred;
  }

  // 2. Portuguese voices that are strictly NOT Portugal (pt-PT)
  const nonPortugalVoices = voices.filter((v) => {
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    const name = (v.name || '').toLowerCase();
    return (
      lang.startsWith('pt') &&
      lang !== 'pt-pt' &&
      !name.includes('portugal') &&
      !name.includes('joana')
    );
  });

  if (nonPortugalVoices.length > 0) {
    cachedPtBrVoice = nonPortugalVoices[0];
    return nonPortugalVoices[0];
  }

  // 3. Fallback to any Portuguese voice
  const fallback = voices.find((v) => (v.lang || '').toLowerCase().startsWith('pt'));
  if (fallback) cachedPtBrVoice = fallback;
  return fallback || null;
}

// Warm up and cache voices when browser loads them
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = () => {
    getBrazilianVoice();
  };
  getBrazilianVoice();
}

export interface StoryWordSpan {
  index: number;
  word: string;
  cleanWord: string;
  charStart: number;
  charEnd: number;
}

export function getWordSpans(text: string): StoryWordSpan[] {
  const spans: StoryWordSpan[] = [];
  const regex = /\S+/g;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = regex.exec(text)) !== null) {
    spans.push({
      index: idx++,
      word: match[0],
      cleanWord: match[0].replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, ''),
      charStart: match.index,
      charEnd: match.index + match[0].length,
    });
  }
  return spans;
}

/**
 * Creates and configures a SpeechSynthesisUtterance with explicit pt-BR settings
 */
export function createBrazilianUtterance(
  text: string,
  options?: { rate?: number; pitch?: number },
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  utterance.rate = options?.rate ?? 0.88;
  utterance.pitch = options?.pitch ?? 1.02; // Warm, natural storytelling tone

  const voice = getBrazilianVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || 'pt-BR';
  }

  return utterance;
}
