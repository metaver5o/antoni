import React, { useEffect, useState } from 'react';
import { Text, View, Pressable, ActivityIndicator, Platform, Image, TextInput, ScrollView } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Mic, MicOff, BookOpen, Send } from 'lucide-react-native';
import { useSpeechRecorder } from '../lib/useSpeechRecorder';
import { parseNarrative } from '../lib/aiParser';
import { useGameStore } from '../store/gameStore';
import { useBookshelfStore } from '../store/bookshelfStore';
import { AIProviderBadge } from '../components/AIProviderBadge';
import { AIProviderModal } from '../components/AIProviderModal';

const logoImg = require('../../assets/logo.jpg');

export const StoryRecorderScreen: React.FC = () => {
  const { recorderState, interimTranscript, elapsedSeconds, errorMessage, startRecording, stopRecording, clearError } =
    useSpeechRecorder();
  const { setScreen, setTranscript, setChildAudioUrl, setParsedStory } = useGameStore();
  const { books } = useBookshelfStore();
  const [customText, setCustomText] = useState('');

  const isRecording = recorderState === 'RECORDING';
  const isProcessing = recorderState === 'PROCESSING';
  const isBusy = isRecording || isProcessing || recorderState === 'REQUESTING';
  const isWeb = Platform.OS === 'web';

  // Pulse ring behind the mic button
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  useEffect(() => {
    if (isRecording) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.55, { duration: 750, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.0, { duration: 750 }),
          withTiming(0.6, { duration: 750 }),
        ),
        -1,
        false,
      );
    } else {
      pulseScale.value = withTiming(1);
      pulseOpacity.value = withTiming(0);
    }
  }, [isRecording, pulseScale, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const handlePress = async () => {
    if (recorderState === 'IDLE') {
      await startRecording();
    } else if (isRecording) {
      const { transcript, audioUrl } = await stopRecording();
      if (!transcript || transcript.trim().length === 0) {
        return;
      }
      setTranscript(transcript);
      setChildAudioUrl(audioUrl || null);
      setScreen('PROCESSING');

      // Let the processing screen render one frame, then parse
      setTimeout(async () => {
        const story = await parseNarrative(transcript);
        setParsedStory(story);
        setScreen('GAME');
      }, 100);
    }
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const SAMPLE_STORIES = [
    { label: '🐶 O Cachorro e a Bola', text: 'O cachorro correu atras da bola no parque e ficou muito feliz.' },
    { label: '🐱 O Gato e a Estrela', text: 'O gato viu uma estrela brilhando no telhado da casa.' },
    { label: '🚀 O Urso e o Foguete', text: 'O urso viajou no foguete até a lua cheia.' },
  ];

  const handleSelectSample = async (sampleText: string) => {
    setTranscript(sampleText);
    setChildAudioUrl(null);
    setScreen('PROCESSING');
    setTimeout(async () => {
      const story = await parseNarrative(sampleText);
      setParsedStory(story);
      setScreen('GAME');
    }, 400);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F3FF' }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingTop: 48,
          paddingBottom: 40,
        }}
      >
      {/* Top Bar: AI Provider Switcher + Bookshelf */}
      <View
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          right: 16,
          zIndex: 10,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <AIProviderBadge />

        <Pressable
          onPress={() => setScreen('BOOKSHELF')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: pressed ? '#EDE9FE' : '#FFFFFF',
            paddingHorizontal: 12,
            paddingVertical: 7,
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: '#C4B5FD',
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
            cursor: isWeb ? ('pointer' as const) : undefined,
          })}
        >
          <BookOpen size={16} color="#7C3AED" />
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#5B21B6' }}>
            Estante ({books.length})
          </Text>
        </Pressable>
      </View>

      {/* Main Brand Logo */}
      <View
        style={{
          alignItems: 'center',
          marginBottom: 16,
          shadowColor: '#7C3AED',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.22,
          shadowRadius: 20,
          elevation: 8,
        }}
      >
        <Image
          source={logoImg}
          style={{
            width: isWeb ? 270 : 220,
            height: isWeb ? 270 : 220,
            borderRadius: 28,
          }}
          resizeMode="contain"
        />
      </View>

      <Text
        style={{
          fontSize: isWeb ? 17 : 16,
          fontWeight: '600',
          color: '#7C3AED',
          textAlign: 'center',
          marginBottom: 28,
        }}
      >
        {isRecording
          ? 'Estou ouvindo... conte sua historinha!'
          : isProcessing
          ? 'Criando sua história mágica...'
          : 'Toque no microfone para falar!'}
      </Text>

      {/* Pulse ring + Button */}
      <View style={{ alignItems: 'center', justifyContent: 'center', width: 170, height: 170 }}>
        <Animated.View
          style={[
            pulseStyle,
            {
              position: 'absolute',
              width: 150,
              height: 150,
              borderRadius: 75,
              backgroundColor: '#EF4444',
            },
          ]}
        />
        <Pressable
          onPress={handlePress}
          disabled={isBusy && !isRecording}
          style={({ pressed }) => ({
            width: 124,
            height: 124,
            borderRadius: 62,
            backgroundColor: isRecording ? '#DC2626' : '#EF4444',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
            shadowColor: '#EF4444',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.45,
            shadowRadius: 16,
            elevation: 10,
            cursor: isWeb ? ('pointer' as const) : undefined,
          })}
        >
          {isProcessing ? (
            <ActivityIndicator size="large" color="#FFF" />
          ) : isRecording ? (
            <MicOff size={52} color="#FFF" strokeWidth={2.5} />
          ) : (
            <Mic size={52} color="#FFF" strokeWidth={2.5} />
          )}
        </Pressable>
      </View>

      {/* Elapsed timer */}
      {isRecording && (
        <Text
          style={{
            marginTop: 20,
            fontSize: 26,
            fontWeight: '800',
            color: '#DC2626',
            fontVariant: ['tabular-nums'],
          }}
        >
          {formatTime(elapsedSeconds)}
        </Text>
      )}

      {/* Live interim transcript */}
      {interimTranscript.length > 0 && (
        <View
          style={{
            marginTop: 20,
            backgroundColor: '#EDE9FE',
            borderRadius: 16,
            paddingHorizontal: 18,
            paddingVertical: 10,
            maxWidth: 340,
            borderWidth: 1.5,
            borderColor: '#C4B5FD',
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: '#5B21B6', textAlign: 'center' }}>
            "{interimTranscript}"
          </Text>
        </View>
      )}

      {/* Error message banner */}
      {Boolean(errorMessage) && (
        <View
          style={{
            marginTop: 18,
            backgroundColor: '#FEF2F2',
            borderRadius: 16,
            paddingHorizontal: 16,
            paddingVertical: 12,
            maxWidth: 360,
            borderWidth: 1.5,
            borderColor: '#F87171',
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#991B1B', textAlign: 'center', marginBottom: 8 }}>
            ⚠️ {errorMessage}
          </Text>
          <Pressable
            onPress={clearError}
            style={{
              backgroundColor: '#EF4444',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 8,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#FFF' }}>Entendi</Text>
          </Pressable>
        </View>
      )}

      {/* Preset sample story suggestions and custom text creator */}
      {!isRecording && !isProcessing && (
        <View style={{ marginTop: 32, alignItems: 'center', width: '100%', maxWidth: 440 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '800',
              color: '#8B5CF6',
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              marginBottom: 10,
            }}
          >
            Ou escolha uma história mágica:
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
            {SAMPLE_STORIES.map((sample, idx) => (
              <Pressable
                key={idx}
                onPress={() => handleSelectSample(sample.text)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#DDD6FE' : '#FFFFFF',
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: '#C4B5FD',
                  shadowColor: '#7C3AED',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                  cursor: isWeb ? ('pointer' as const) : undefined,
                })}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#5B21B6' }}>
                  {sample.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Custom Story Input */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              width: '100%',
              backgroundColor: '#FFFFFF',
              borderRadius: 16,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderWidth: 1.5,
              borderColor: '#C4B5FD',
              shadowColor: '#7C3AED',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <TextInput
              value={customText}
              onChangeText={setCustomText}
              placeholder="Ou digite uma frase mágica..."
              placeholderTextColor="#9CA3AF"
              style={{
                flex: 1,
                fontSize: 14,
                fontWeight: '600',
                color: '#1F2937',
                paddingVertical: 8,
                paddingHorizontal: 4,
                outlineStyle: 'none',
              } as unknown as Record<string, unknown>}
              onSubmitEditing={() => {
                if (customText.trim()) handleSelectSample(customText.trim());
              }}
            />
            <Pressable
              onPress={() => {
                if (customText.trim()) handleSelectSample(customText.trim());
              }}
              disabled={!customText.trim()}
              style={({ pressed }) => ({
                backgroundColor: customText.trim() ? (pressed ? '#5B21B6' : '#7C3AED') : '#E5E7EB',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                cursor: customText.trim() && isWeb ? ('pointer' as const) : undefined,
              })}
            >
              <Send size={14} color={customText.trim() ? '#FFF' : '#9CA3AF'} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: customText.trim() ? '#FFF' : '#9CA3AF' }}>
                Jogar
              </Text>
            </Pressable>
          </View>
        </View>
      )}
      </ScrollView>

      {/* Multi-AI Provider Switcher & Key Modal */}
      <AIProviderModal />
    </View>
  );
};
