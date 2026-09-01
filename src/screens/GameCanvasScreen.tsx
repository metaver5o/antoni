import React, { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View, Image } from 'react-native';
import { RotateCcw, Volume2, Sparkles, BookOpen, Palette, Mic } from 'lucide-react-native';

const logoImg = require('../../assets/logo.jpg');
import { useGameStore } from '../store/gameStore';
import { parseStorySegments, buildFullStory } from '../lib/aiParser';
import { useAudio } from '../lib/useAudio';
import { useBookshelfStore } from '../store/bookshelfStore';
import { formatSyllableString } from '../lib/syllables';
import { GapSlot } from '../components/GapSlot';
import { StickerCard } from '../components/StickerCard';
import { AudioBar } from '../components/AudioBar';
import { ConfettiOverlay } from '../components/ConfettiOverlay';
import { DrawingCoverModal } from '../components/DrawingCoverModal';
import { ChildVoiceRecorder } from '../components/ChildVoiceRecorder';

import { Gap } from '../types';

export const GameCanvasScreen: React.FC = () => {
  const { parsedStory, isWon, selectedCardId, reset, setScreen } = useGameStore();
  const { playKaraoke } = useAudio();
  const { books, saveBook } = useBookshelfStore();
  const isWeb = Platform.OS === 'web';

  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [recordedChildAudio, setRecordedChildAudio] = useState<string | null>(null);
  const [hasSavedBook, setHasSavedBook] = useState(false);

  // Shuffled sticker cards state for active pedagogical challenge
  const [shuffledGaps, setShuffledGaps] = useState<Gap[]>(parsedStory?.gaps || []);
  const [isShuffling, setIsShuffling] = useState(false);

  useEffect(() => {
    if (!parsedStory) return;
    setShuffledGaps([...parsedStory.gaps]);
    setIsShuffling(true);

    const timer = setTimeout(() => {
      const original = [...parsedStory.gaps];
      if (original.length > 1) {
        let attempts = 0;
        let result = [...original];
        while (attempts < 10) {
          result = [...original].sort(() => Math.random() - 0.5);
          const isSameOrder = result.every((item, i) => item.id === original[i].id);
          if (!isSameOrder) break;
          attempts++;
        }
        setShuffledGaps(result);
      }
      setIsShuffling(false);
    }, 1100);

    return () => clearTimeout(timer);
  }, [parsedStory]);

  // Automatically read story out loud when the child completes all slots correctly!
  useEffect(() => {
    if (isWon) {
      const timer = setTimeout(() => {
        playKaraoke();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isWon, playKaraoke]);

  if (!parsedStory) return null;

  const fullStory = buildFullStory(parsedStory);
  const segments = parseStorySegments(parsedStory.cleanStory);

  const handleSaveToBookshelf = (coverData: {
    coverColor: string;
    coverEmoji: string;
    drawingDataUrl: string | null;
    title: string;
  }) => {
    saveBook({
      title: coverData.title,
      cleanStory: parsedStory.cleanStory,
      fullStory,
      gaps: parsedStory.gaps,
      coverColor: coverData.coverColor,
      coverEmoji: coverData.coverEmoji,
      drawingDataUrl: coverData.drawingDataUrl,
      childAudioUrl: recordedChildAudio,
    });
    setHasSavedBook(true);
    Alert.alert('Livro Guardado! 🎉📚', 'Sua história foi guardada na sua estante com seu desenho e sua voz!', [
      { text: 'Ver Minha Estante', onPress: () => setScreen('BOOKSHELF') },
      { text: 'Continuar', style: 'cancel' },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F3FF' }}>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: 40,
          alignItems: 'center',
        }}
        scrollEnabled={!selectedCardId}
      >
        <View style={{ width: '100%', maxWidth: 640 }}>
          {/* Header */}
          <View
            style={{
              paddingTop: isWeb ? 24 : 52,
              paddingHorizontal: 20,
              paddingBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Image
                source={logoImg}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  borderWidth: 2,
                  borderColor: '#C4B5FD',
                }}
                resizeMode="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: isWeb ? 24 : 22, fontWeight: '900', color: '#5B21B6' }}>
                  {isWon ? 'História Completa! 🎉' : 'Histórias do Antoni 🧩'}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#7C3AED', marginTop: 1 }}>
                  {isWon
                    ? 'Ouça a história mágica que você criou!'
                    : selectedCardId !== null
                    ? 'Toque no espaço numerado correspondente ↓'
                    : 'Toque ou arraste as figurinhas para os espaços!'}
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* Bookshelf quick link */}
              <Pressable
                onPress={() => setScreen('BOOKSHELF')}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#EDE9FE' : '#FFFFFF',
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: '#C4B5FD',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  cursor: isWeb ? ('pointer' as const) : undefined,
                })}
              >
                <BookOpen size={18} color="#7C3AED" />
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#5B21B6' }}>
                  Estante ({books.length})
                </Text>
              </Pressable>

              <Pressable
                onPress={reset}
                hitSlop={12}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#EDE9FE' : '#FFFFFF',
                  padding: 10,
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: '#C4B5FD',
                  shadowColor: '#7C3AED',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                  elevation: 2,
                  cursor: isWeb ? ('pointer' as const) : undefined,
                })}
              >
                <RotateCcw size={20} color="#7C3AED" strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>

          {/* Story strip container */}
          <View
            style={{
              marginHorizontal: 16,
              marginTop: 8,
              backgroundColor: '#FFFFFF',
              borderRadius: 24,
              padding: 22,
              shadowColor: '#7C3AED',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.12,
              shadowRadius: 16,
              elevation: 5,
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: isWon ? '#A7F3D0' : '#E9D5FF',
            }}
          >
            {segments.map((seg, i) =>
              seg.type === 'text' ? (
                <Text
                  key={i}
                  style={{
                    fontSize: isWeb ? 24 : 22,
                    fontWeight: '800',
                    color: '#1F2937',
                    lineHeight: 44,
                    marginHorizontal: 2,
                  }}
                >
                  {seg.content}
                </Text>
              ) : (
                <GapSlot key={i} id={seg.id} gaps={parsedStory.gaps} />
              ),
            )}
          </View>

          {/* Syllables Guide for early literacy */}
          {!isWon && (
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                flexWrap: 'wrap',
                paddingHorizontal: 16,
                marginTop: 14,
                gap: 8,
              }}
            >
              {parsedStory.gaps.map((g) => (
                <View
                  key={g.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#EDE9FE',
                    borderRadius: 12,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderWidth: 1,
                    borderColor: '#DDD6FE',
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '900', color: '#7C3AED' }}>
                    [{g.id}] {g.word}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#8B5CF6' }}>
                    ({formatSyllableString(g.word)})
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Win state: Celebrate + Karaoke AudioBar + Child Voice Recorder + Bookshelf Save */}
          {isWon && (
            <View style={{ marginTop: 20, paddingHorizontal: 16 }}>
              <View
                style={{
                  alignItems: 'center',
                  marginBottom: 14,
                  backgroundColor: '#D1FAE5',
                  borderRadius: 18,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderWidth: 2,
                  borderColor: '#10B981',
                }}
              >
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#065F46' }}>
                  🌟 Parabéns, você acertou tudo! 🌟
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#047857', marginTop: 4, textAlign: 'center' }}>
                  Acompanhe a leitura mágica com a voz do app:
                </Text>
              </View>

              {/* Karaoke player */}
              <AudioBar />

              {/* Child Voice Recorder */}
              <ChildVoiceRecorder
                storyText={fullStory}
                onRecordedAudio={(url) => setRecordedChildAudio(url)}
                initialAudioUrl={recordedChildAudio}
              />

              {/* Action Buttons: Draw Cover & Save to Bookshelf */}
              <View style={{ gap: 10, marginTop: 12, alignItems: 'center' }}>
                <Pressable
                  onPress={() => setIsDrawingModalOpen(true)}
                  style={({ pressed }) => ({
                    width: '100%',
                    backgroundColor: hasSavedBook ? '#059669' : '#D97706',
                    paddingVertical: 14,
                    borderRadius: 18,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    shadowColor: '#D97706',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 8,
                    elevation: 4,
                    opacity: pressed ? 0.9 : 1,
                    cursor: isWeb ? ('pointer' as const) : undefined,
                  })}
                >
                  <Palette size={20} color="#FFF" />
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFF' }}>
                    {hasSavedBook ? '🎨 Editar Capa na Estante 📚' : '🎨 Desenhar Capa & Guardar na Estante 📚'}
                  </Text>
                </Pressable>

                <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                  <Pressable
                    onPress={() => setScreen('BOOKSHELF')}
                    style={({ pressed }) => ({
                      flex: 1,
                      backgroundColor: pressed ? '#5B21B6' : '#7C3AED',
                      paddingVertical: 12,
                      borderRadius: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      cursor: isWeb ? ('pointer' as const) : undefined,
                    })}
                  >
                    <BookOpen size={18} color="#FFF" />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>Ver Estante</Text>
                  </Pressable>

                  <Pressable
                    onPress={reset}
                    style={({ pressed }) => ({
                      flex: 1,
                      backgroundColor: pressed ? '#DDD6FE' : '#EDE9FE',
                      paddingVertical: 12,
                      borderRadius: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      borderWidth: 1.5,
                      borderColor: '#C4B5FD',
                      cursor: isWeb ? ('pointer' as const) : undefined,
                    })}
                  >
                    <Sparkles size={18} color="#7C3AED" />
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#5B21B6' }}>Nova História</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticker rack at bottom when game is active */}
      {!isWon && (
        <View
          style={{
            paddingVertical: 14,
            paddingHorizontal: 12,
            backgroundColor: '#EDE9FE',
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            alignItems: 'center',
            shadowColor: '#7C3AED',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 8,
            borderTopWidth: 2,
            borderColor: '#DDD6FE',
          }}
        >
          {isShuffling && (
            <View
              style={{
                backgroundColor: '#FEF3C7',
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 10,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: '#FDE68A',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#92400E' }}>
                ✨ Misturando as palavras... leia com atenção! 🎲
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            {shuffledGaps.map((g) => (
              <StickerCard key={g.id} gap={g} />
            ))}
          </View>
        </View>
      )}

      {/* Confetti celebration on win */}
      {isWon && <ConfettiOverlay />}

      {/* Drawing Cover Customizer Modal */}
      <DrawingCoverModal
        visible={isDrawingModalOpen}
        onClose={() => setIsDrawingModalOpen(false)}
        onSave={handleSaveToBookshelf}
        defaultTitle={parsedStory.gaps.map((g) => g.word).join(' e ')}
      />
    </View>
  );
};
