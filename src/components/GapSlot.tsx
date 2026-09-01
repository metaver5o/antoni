import React, { useCallback, useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useGameStore } from '../store/gameStore';
import { formatSyllableString } from '../lib/syllables';
import type { Gap } from '../types';

interface Props {
  id: number;
  gaps: Gap[];
}

export const GapSlot: React.FC<Props> = ({ id, gaps }) => {
  const viewRef = useRef<View>(null);
  const {
    placedCards,
    selectedCardId,
    incorrectSlotId,
    setSlotLayout,
    tryPlaceCard,
    removePlacedCard,
  } = useGameStore();

  const placedGapId = placedCards[id];
  const placedGap = placedGapId !== undefined ? gaps.find((g) => g.id === placedGapId) : undefined;
  const isPlaced = placedGap !== undefined;
  const hasSelection = selectedCardId !== null;

  const shakeX = useSharedValue(0);
  const popScale = useSharedValue(1);

  // Shake on incorrect drop
  useEffect(() => {
    if (incorrectSlotId === id) {
      shakeX.value = withSequence(
        withTiming(-10, { duration: 55 }),
        withTiming(10, { duration: 55 }),
        withTiming(-7, { duration: 55 }),
        withTiming(7, { duration: 55 }),
        withTiming(0, { duration: 55 }),
      );
    }
  }, [incorrectSlotId, id, shakeX]);

  // Pop on correct placement
  useEffect(() => {
    if (isPlaced) {
      popScale.value = withSequence(
        withSpring(1.18, { damping: 4, stiffness: 300 }),
        withSpring(1.0, { damping: 10, stiffness: 200 }),
      );
    }
  }, [isPlaced, popScale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { scale: popScale.value }],
  }));

  const measureLayout = useCallback(() => {
    viewRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      setSlotLayout(id, { pageX, pageY, width, height });
    });
  }, [id, setSlotLayout]);

  const handlePress = useCallback(() => {
    if (isPlaced) {
      // Tap placed slot to remove it back to tray
      removePlacedCard(id);
      return;
    }
    if (selectedCardId !== null) {
      tryPlaceCard(id, selectedCardId);
    }
  }, [isPlaced, selectedCardId, id, tryPlaceCard, removePlacedCard]);

  const borderColor = isPlaced ? '#059669' : hasSelection ? '#F59E0B' : '#C4B5FD';
  const bg = isPlaced ? '#ECFDF5' : hasSelection ? '#FFFBEB' : '#F5F3FF';

  return (
    <Animated.View style={animStyle}>
      <Pressable onPress={handlePress}>
        <View
          ref={viewRef}
          onLayout={measureLayout}
          style={{
            minWidth: 96,
            height: isPlaced ? 56 : 52,
            borderRadius: 14,
            borderWidth: isPlaced ? 2.5 : 2,
            borderStyle: isPlaced ? 'solid' : 'dashed',
            borderColor,
            backgroundColor: bg,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 12,
            marginHorizontal: 4,
            marginVertical: 4,
          }}
        >
          {isPlaced ? (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontWeight: '900', fontSize: 15, color: '#065F46', letterSpacing: 0.5 }}>
                {placedGap?.word} ✨
              </Text>
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#059669', letterSpacing: 0.8 }}>
                {placedGap ? formatSyllableString(placedGap.word) : ''}
              </Text>
            </View>
          ) : (
            <Text
              style={{
                fontWeight: '900',
                fontSize: 20,
                color: hasSelection ? '#D97706' : '#8B5CF6',
              }}
            >
              [ {id} ]
            </Text>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
};
