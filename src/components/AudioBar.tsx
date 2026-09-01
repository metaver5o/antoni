import React from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react-native';
import { useGameStore } from '../store/gameStore';
import { buildFullStory } from '../lib/aiParser';
import { useAudio } from '../lib/useAudio';
import { getWordSpans } from '../lib/tts';

export const AudioBar: React.FC = () => {
  const { parsedStory, isPlayingKaraoke, karaokeWordIndex } = useGameStore();
  const { playKaraoke, stopKaraoke } = useAudio();
  const isWeb = Platform.OS === 'web';

  if (!parsedStory) return null;

  const fullStory = buildFullStory(parsedStory);
  const spans = getWordSpans(fullStory);

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        marginHorizontal: 8,
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 2,
        borderColor: '#E9D5FF',
      }}
    >
      {/* Title */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <Volume2 size={20} color="#7C3AED" />
        <Text style={{ fontSize: 14, fontWeight: '800', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 1 }}>
          {isPlayingKaraoke ? 'Lendo a história...' : 'História Pronta'}
        </Text>
      </View>

      {/* Karaoke story text */}
      <ScrollView style={{ maxHeight: 130, marginBottom: 16 }}>
        <Text style={{ fontSize: isWeb ? 22 : 20, lineHeight: 38, flexWrap: 'wrap' }}>
          {spans.map((span, i) => {
            const isHighlighted = isPlayingKaraoke && span.index === karaokeWordIndex;
            return (
              <React.Fragment key={i}>
                <Text
                  style={
                    isHighlighted
                      ? {
                          fontWeight: '900',
                          color: '#4C1D95',
                          backgroundColor: '#FEF08A',
                          borderRadius: 8,
                          paddingHorizontal: 4,
                        }
                      : { fontWeight: '600', color: '#374151' }
                  }
                >
                  {span.word}
                </Text>
                {' '}
              </React.Fragment>
            );
          })}
        </Text>
      </ScrollView>

      {/* Controls */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <Pressable
          onPress={isPlayingKaraoke ? stopKaraoke : playKaraoke}
          style={({ pressed }) => ({
            flex: 1,
            height: 52,
            borderRadius: 16,
            backgroundColor: isPlayingKaraoke ? '#DC2626' : '#7C3AED',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 4,
            opacity: pressed ? 0.9 : 1,
            cursor: isWeb ? ('pointer' as const) : undefined,
          })}
        >
          {isPlayingKaraoke ? (
            <>
              <Pause size={22} color="#FFF" fill="#FFF" />
              <Text style={{ fontWeight: '800', fontSize: 16, color: '#FFF' }}>
                Pausar Leitura
              </Text>
            </>
          ) : (
            <>
              <Play size={22} color="#FFF" fill="#FFF" />
              <Text style={{ fontWeight: '800', fontSize: 16, color: '#FFF' }}>
                Ouvir Novamente
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
};
