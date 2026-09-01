import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  PawPrint,
  Circle,
  Leaf,
  Star,
  Heart,
  Home,
  Sun,
  Fish,
  Bird,
  Car,
  Book,
  Apple,
  Flower,
  Moon,
  Cloud,
  Music,
  Smile,
  Gift,
  Sparkles,
  HelpCircle,
} from 'lucide-react-native';
import type { LucideProps } from 'lucide-react-native';
import { useGameStore } from '../store/gameStore';
import { useAudio } from '../lib/useAudio';
import type { Gap } from '../types';

import { formatSyllableString, getSyllables } from '../lib/syllables';

const ICON_MAP: Record<string, React.FC<LucideProps>> = {
  'paw-print': PawPrint,
  circle: Circle,
  leaf: Leaf,
  star: Star,
  heart: Heart,
  home: Home,
  sun: Sun,
  fish: Fish,
  bird: Bird,
  car: Car,
  book: Book,
  apple: Apple,
  flower: Flower,
  moon: Moon,
  cloud: Cloud,
  music: Music,
  smile: Smile,
  gift: Gift,
  sparkles: Sparkles,
};

function GapIcon({ name, size = 30, color = '#7C3AED' }: { name: string; size?: number; color?: string }) {
  const Icon = ICON_MAP[name] ?? HelpCircle;
  return <Icon size={size} color={color} strokeWidth={2.5} />;
}

interface Props {
  gap: Gap;
}

export const StickerCard: React.FC<Props> = ({ gap }) => {
  const { placedCards, selectedCardId, slotLayouts, selectCard, tryPlaceCard } =
    useGameStore();
  const { speakWord } = useAudio();

  const isPlaced = Object.values(placedCards).includes(gap.id);
  const isSelected = selectedCardId === gap.id;
  const syllables = getSyllables(gap.word);

  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const checkDrop = useCallback(
    (absX: number, absY: number) => {
      for (const [slotStr, layout] of Object.entries(slotLayouts)) {
        const slotId = Number(slotStr);
        if (
          absX >= layout.pageX &&
          absX <= layout.pageX + layout.width &&
          absY >= layout.pageY &&
          absY <= layout.pageY + layout.height
        ) {
          tryPlaceCard(slotId, gap.id);
          return;
        }
      }
    },
    [slotLayouts, gap.id, tryPlaceCard],
  );

  const handleTap = useCallback(() => {
    if (isPlaced) return;
    speakWord(gap.word);
    selectCard(isSelected ? null : gap.id);
  }, [isPlaced, isSelected, gap.id, gap.word, selectCard, speakWord]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .activeOffsetY([-8, 8])
    .onStart(() => {
      isDragging.value = true;
      runOnJS(selectCard)(null);
    })
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      'worklet';
      runOnJS(checkDrop)(e.absoluteX, e.absoluteY);
      tx.value = withSpring(0, { damping: 14, stiffness: 180 });
      ty.value = withSpring(0, { damping: 14, stiffness: 180 });
      isDragging.value = false;
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(handleTap)();
  });

  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
    zIndex: isDragging.value ? 999 : 1,
    opacity: isPlaced ? 0.35 : 1,
  }));

  const borderColor = isSelected ? '#F59E0B' : '#DDD6FE';
  const bgColor = isSelected ? '#FFFBEB' : '#FFFFFF';

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animStyle}>
        <View
          style={{
            minWidth: 106,
            height: 86,
            borderRadius: 18,
            borderWidth: isSelected ? 3 : 2,
            borderColor,
            backgroundColor: bgColor,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 8,
            paddingVertical: 6,
            marginHorizontal: 5,
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: isSelected ? 0.3 : 0.1,
            shadowRadius: 6,
            elevation: isSelected ? 6 : 3,
          }}
        >
          <GapIcon name={gap.icon} size={26} color={isPlaced ? '#C4B5FD' : '#7C3AED'} />
          <Text
            style={{
              marginTop: 2,
              fontWeight: '900',
              fontSize: 13,
              letterSpacing: 0.8,
              color: isPlaced ? '#C4B5FD' : '#5B21B6',
            }}
          >
            {gap.word}
          </Text>

          {/* Syllables breakdown pills */}
          <View style={{ flexDirection: 'row', gap: 2, marginTop: 3 }}>
            {syllables.map((syl, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: isSelected ? '#FEF3C7' : '#EDE9FE',
                  paddingHorizontal: 4,
                  paddingVertical: 1,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: '800',
                    color: isSelected ? '#B45309' : '#6D28D9',
                  }}
                >
                  {syl}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};
