import { create } from 'zustand';
import type { AppScreen, Gap, ParsedStory, SlotLayout } from '../types';

interface GameStore {
  screen: AppScreen;
  transcript: string;
  parsedStory: ParsedStory | null;

  // { slotId -> gapId } — win when every slotId === gapId
  placedCards: Record<number, number>;
  selectedCardId: number | null;
  // non-null for ~600ms after a wrong drop, triggers GapSlot shake
  incorrectSlotId: number | null;
  isWon: boolean;

  isPlayingKaraoke: boolean;
  karaokeWordIndex: number;
  childAudioUrl: string | null;

  // absolute screen coords populated by each GapSlot via onLayout+measure
  slotLayouts: Record<number, SlotLayout>;

  setScreen: (screen: AppScreen) => void;
  setTranscript: (transcript: string) => void;
  setChildAudioUrl: (url: string | null) => void;
  setParsedStory: (story: ParsedStory) => void;
  selectCard: (gapId: number | null) => void;
  /** Returns true when placement is correct. */
  tryPlaceCard: (slotId: number, gapId: number) => boolean;
  removePlacedCard: (slotId: number) => void;
  setSlotLayout: (slotId: number, layout: SlotLayout) => void;
  setIsPlayingKaraoke: (v: boolean) => void;
  setKaraokeWordIndex: (i: number) => void;
  reset: () => void;
}

const INITIAL: Omit<
  GameStore,
  | 'setScreen'
  | 'setTranscript'
  | 'setChildAudioUrl'
  | 'setParsedStory'
  | 'selectCard'
  | 'tryPlaceCard'
  | 'removePlacedCard'
  | 'setSlotLayout'
  | 'setIsPlayingKaraoke'
  | 'setKaraokeWordIndex'
  | 'reset'
> = {
  screen: 'RECORDER',
  transcript: '',
  parsedStory: null,
  childAudioUrl: null,
  placedCards: {},
  selectedCardId: null,
  incorrectSlotId: null,
  isWon: false,
  isPlayingKaraoke: false,
  karaokeWordIndex: -1,
  slotLayouts: {},
};

import { playFanfareSound, playNudgeSound, playPopSound } from '../lib/soundEffects';

export const useGameStore = create<GameStore>((set, get) => ({
  ...INITIAL,

  setScreen: (screen) => set({ screen }),
  setTranscript: (transcript) => set({ transcript }),
  setChildAudioUrl: (childAudioUrl) => set({ childAudioUrl }),
  setParsedStory: (parsedStory) => set({ parsedStory }),
  selectCard: (selectedCardId) => set({ selectedCardId }),

  tryPlaceCard: (slotId, gapId) => {
    const correct = slotId === gapId;
    if (correct) {
      const placed = { ...get().placedCards, [slotId]: gapId };
      const story = get().parsedStory;
      const activeGaps = story?.gaps || [];
      const won =
        activeGaps.length > 0 &&
        activeGaps.every((g) => placed[g.id] === g.id);

      if (won) {
        playFanfareSound();
      } else {
        playPopSound();
      }

      set({ placedCards: placed, selectedCardId: null, isWon: won });
    } else {
      playNudgeSound();
      set({ incorrectSlotId: slotId });
      setTimeout(() => set({ incorrectSlotId: null }), 700);
    }
    return correct;
  },

  removePlacedCard: (slotId) => {
    const placed = { ...get().placedCards };
    delete placed[slotId];
    set({ placedCards: placed, isWon: false });
  },

  setSlotLayout: (slotId, layout) =>
    set((s) => ({ slotLayouts: { ...s.slotLayouts, [slotId]: layout } })),

  setIsPlayingKaraoke: (isPlayingKaraoke) => set({ isPlayingKaraoke }),
  setKaraokeWordIndex: (karaokeWordIndex) => set({ karaokeWordIndex }),

  reset: () => set(INITIAL),
}));
