import { useCallback, useEffect, useRef } from 'react';
import * as Speech from 'expo-speech';
import { useGameStore } from '../store/gameStore';
import { buildFullStory } from './aiParser';
import { createBrazilianUtterance, getWordSpans } from './tts';

interface UseAudio {
  speakWord: (word: string) => void;
  playKaraoke: () => void;
  stopKaraoke: () => void;
}

export function useAudio(): UseAudio {
  const { parsedStory, setIsPlayingKaraoke, setKaraokeWordIndex } = useGameStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const speakWord = useCallback((word: string) => {
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = createBrazilianUtterance(word.toLowerCase(), { rate: 0.88 });
        if (utterance) window.speechSynthesis.speak(utterance);
      } else {
        Speech.speak(word.toLowerCase(), { language: 'pt-BR', rate: 0.85 });
      }
    } catch (err) {
      console.warn('speakWord error:', err);
    }
  }, []);

  const playKaraoke = useCallback(() => {
    if (!parsedStory) return;

    const text = buildFullStory(parsedStory);
    const spans = getWordSpans(text);

    clearTimer();
    setIsPlayingKaraoke(true);
    setKaraokeWordIndex(0);

    const onFinish = () => {
      clearTimer();
      setIsPlayingKaraoke(false);
      setKaraokeWordIndex(-1);
    };

    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = createBrazilianUtterance(text, { rate: 0.85 });
        if (utterance) {
          // Native word boundary event for millisecond-exact synchronization!
          utterance.onboundary = (e: SpeechSynthesisEvent) => {
            if (typeof e.charIndex === 'number') {
              const span =
                spans.find((s) => e.charIndex >= s.charStart && e.charIndex < s.charEnd) ||
                spans.find((s) => e.charIndex <= s.charStart);
              if (span) {
                setKaraokeWordIndex(span.index);
              }
            }
          };
          utterance.onend = onFinish;
          utterance.onerror = onFinish;
          window.speechSynthesis.speak(utterance);
        } else {
          onFinish();
        }
      } else {
        let idx = 0;
        timerRef.current = setInterval(() => {
          idx += 1;
          if (idx >= spans.length) {
            onFinish();
          } else {
            setKaraokeWordIndex(idx);
          }
        }, 550);

        Speech.speak(text, {
          language: 'pt-BR',
          rate: 0.8,
          onDone: onFinish,
          onStopped: onFinish,
          onError: onFinish,
        });
      }
    } catch (err) {
      console.warn('playKaraoke error:', err);
      onFinish();
    }
  }, [parsedStory, setIsPlayingKaraoke, setKaraokeWordIndex]);

  const stopKaraoke = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      Speech.stop();
    } catch {
      // ignore
    }
    clearTimer();
    setIsPlayingKaraoke(false);
    setKaraokeWordIndex(-1);
  }, [setIsPlayingKaraoke, setKaraokeWordIndex]);

  useEffect(() => {
    return () => {
      Speech.stop();
      clearTimer();
    };
  }, []);

  return { speakWord, playKaraoke, stopKaraoke };
}
