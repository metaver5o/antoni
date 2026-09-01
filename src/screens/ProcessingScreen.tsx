import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, Text, View, Image } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Sparkles, Wand2 } from 'lucide-react-native';
import { useGameStore } from '../store/gameStore';

const logoImg = require('../../assets/logo.jpg');

export const ProcessingScreen: React.FC = () => {
  const { transcript } = useGameStore();
  const isWeb = Platform.OS === 'web';

  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    rotate.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        withTiming(-15, { duration: 400, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 600 }),
        withTiming(1.0, { duration: 600 }),
      ),
      -1,
      true,
    );
  }, [rotate, scale]);

  const wandStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }, { scale: scale.value }],
  }));

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#F5F3FF',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
      }}
    >
      {/* Brand Mascot */}
      <View
        style={{
          width: 110,
          height: 110,
          borderRadius: 55,
          overflow: 'hidden',
          borderWidth: 3,
          borderColor: '#C4B5FD',
          marginBottom: 24,
          shadowColor: '#7C3AED',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
          elevation: 5,
        }}
      >
        <Image source={logoImg} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>

      {/* Main title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Sparkles size={24} color="#F59E0B" />
        <Text
          style={{
            fontSize: isWeb ? 26 : 28,
            fontWeight: '900',
            color: '#5B21B6',
            textAlign: 'center',
          }}
        >
          Criando a sua história!
        </Text>
        <Sparkles size={24} color="#F59E0B" />
      </View>

      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#7C3AED',
          textAlign: 'center',
          marginBottom: 32,
        }}
      >
        Transformando suas palavras em uma brincadeira mágica...
      </Text>

      {/* Spoken preview */}
      {Boolean(transcript) && (
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 20,
            padding: 20,
            maxWidth: 420,
            width: '100%',
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 4,
            marginBottom: 32,
            borderWidth: 1.5,
            borderColor: '#DDD6FE',
          }}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: '800',
              color: '#8B5CF6',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 6,
            }}
          >
            Você contou:
          </Text>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '600',
              color: '#374151',
              fontStyle: 'italic',
              lineHeight: 24,
            }}
          >
            "{transcript}"
          </Text>
        </View>
      )}

      <ActivityIndicator size="large" color="#7C3AED" />
    </View>
  );
};
