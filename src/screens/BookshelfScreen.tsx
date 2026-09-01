import React, { useState, useRef } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  BookOpen,
  Play,
  Pause,
  Trash2,
  Volume2,
  Sparkles,
  X,
  Mic,
  Download,
  Upload,
  Share2,
} from 'lucide-react-native';
import { useBookshelfStore, SavedBook } from '../store/bookshelfStore';
import { useGameStore } from '../store/gameStore';
import { formatSyllableString } from '../lib/syllables';
import { createBrazilianUtterance, getWordSpans } from '../lib/tts';
import { exportBookshelfToZip, exportSingleBookToZip, importBookshelfFromZip } from '../lib/zipBackup';
import { AIProviderBadge } from '../components/AIProviderBadge';
import { AIProviderModal } from '../components/AIProviderModal';

const logoImg = require('../../assets/logo.jpg');

export const BookshelfScreen: React.FC = () => {
  const isWeb = Platform.OS === 'web';
  const { books, deleteBook, importBooks } = useBookshelfStore();
  const { setScreen } = useGameStore();

  const [activeBook, setActiveBook] = useState<SavedBook | null>(null);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);
  const [isPlayingChildVoice, setIsPlayingChildVoice] = useState(false);
  const [activeWordIdx, setActiveWordIdx] = useState(-1);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSharingBook, setIsSharingBook] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleExportZip = async () => {
    if (books.length === 0) {
      Alert.alert('Estante Vazia', 'Crie pelo menos uma história antes de exportar sua coleção!');
      return;
    }
    setIsExporting(true);
    try {
      await exportBookshelfToZip(books);
    } catch (err) {
      console.error('Export error:', err);
      Alert.alert('Erro ao exportar', 'Não foi possível gerar o arquivo ZIP da coleção.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const imported = await importBookshelfFromZip(file);
      const count = await importBooks(imported);
      Alert.alert('Coleção Importada! 🎉📚', `${count} novas histórias foram adicionadas à sua estante com sucesso!`);
    } catch (err) {
      console.error('Import error:', err);
      Alert.alert('Erro na Importação', 'Não foi possível ler o arquivo ZIP/JSON selecionado.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleShareBook = async () => {
    if (!activeBook) return;
    setIsSharingBook(true);
    try {
      await exportSingleBookToZip(activeBook);
    } catch (err) {
      console.error('Share book error:', err);
      Alert.alert('Erro ao compartilhar', 'Não foi possível compartilhar este livro.');
    } finally {
      setIsSharingBook(false);
    }
  };

  const handleOpenBook = (book: SavedBook) => {
    setActiveBook(book);
    setIsPlayingTTS(false);
    setIsPlayingChildVoice(false);
    setActiveWordIdx(-1);
  };

  const handleCloseModal = () => {
    clearTimer();
    if (isWeb && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (htmlAudioRef.current) {
      htmlAudioRef.current.pause();
    }
    setActiveBook(null);
    setIsPlayingTTS(false);
    setIsPlayingChildVoice(false);
  };

  const handlePlayTTS = () => {
    if (!activeBook) return;
    if (isPlayingTTS) {
      if (isWeb && window.speechSynthesis) window.speechSynthesis.cancel();
      clearTimer();
      setIsPlayingTTS(false);
      setActiveWordIdx(-1);
      return;
    }

    if (isPlayingChildVoice && htmlAudioRef.current) {
      htmlAudioRef.current.pause();
      setIsPlayingChildVoice(false);
    }

    const spans = getWordSpans(activeBook.fullStory);
    setIsPlayingTTS(true);
    setActiveWordIdx(0);

    const onFinish = () => {
      clearTimer();
      setIsPlayingTTS(false);
      setActiveWordIdx(-1);
    };

    if (isWeb && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const u = createBrazilianUtterance(activeBook.fullStory, { rate: 0.85 });
      if (u) {
        u.onboundary = (e: SpeechSynthesisEvent) => {
          if (typeof e.charIndex === 'number') {
            const span =
              spans.find((s) => e.charIndex >= s.charStart && e.charIndex < s.charEnd) ||
              spans.find((s) => e.charIndex <= s.charStart);
            if (span) {
              setActiveWordIdx(span.index);
            }
          }
        };
        u.onend = onFinish;
        u.onerror = onFinish;
        window.speechSynthesis.speak(u);
      } else {
        onFinish();
      }
    } else {
      let idx = 0;
      clearTimer();
      timerRef.current = setInterval(() => {
        idx += 1;
        if (idx >= spans.length) {
          onFinish();
        } else {
          setActiveWordIdx(idx);
        }
      }, 550);
    }
  };

  const handlePlayChildVoice = () => {
    if (!activeBook?.childAudioUrl) return;

    if (isPlayingChildVoice) {
      if (htmlAudioRef.current) htmlAudioRef.current.pause();
      setIsPlayingChildVoice(false);
      return;
    }

    if (isPlayingTTS) {
      if (isWeb && window.speechSynthesis) window.speechSynthesis.cancel();
      clearTimer();
      setIsPlayingTTS(false);
    }

    setIsPlayingChildVoice(true);
    const audio = htmlAudioRef.current || new (window.Audio || Audio)(activeBook.childAudioUrl);
    htmlAudioRef.current = audio;
    if (audio.src !== activeBook.childAudioUrl) {
      audio.src = activeBook.childAudioUrl;
    }
    audio.currentTime = 0;
    audio.onended = () => setIsPlayingChildVoice(false);
    audio.onerror = (e) => {
      console.warn('Child audio playback error:', e);
      setIsPlayingChildVoice(false);
    };
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio play error in Bookshelf:', err);
        setIsPlayingChildVoice(false);
      });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FEF3C7' }}>
      {/* Top Navbar */}
      <View
        style={{
          paddingTop: isWeb ? 24 : 48,
          paddingHorizontal: 20,
          paddingBottom: 16,
          backgroundColor: '#92400E',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 5,
        }}
      >
        <Pressable
          onPress={() => setScreen('RECORDER')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            backgroundColor: pressed ? '#78350F' : '#B45309',
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 12,
            cursor: isWeb ? ('pointer' as const) : undefined,
          })}
        >
          <ArrowLeft size={18} color="#FFF" />
          <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>Criar Nova História</Text>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image
            source={logoImg}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              borderWidth: 1.5,
              borderColor: '#FDE68A',
            }}
            resizeMode="cover"
          />
          <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFF' }}>Minha Estante 📚</Text>
        </View>

        <AIProviderBadge />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, flexGrow: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#78350F', textAlign: 'center', marginBottom: 12 }}>
          {books.length === 1
            ? 'Você tem 1 história mágica guardada!'
            : `Você tem ${books.length} histórias mágicas na sua biblioteca!`}
        </Text>

        {/* Backup ZIP & Import Actions */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
            flexWrap: 'wrap',
          }}
        >
          <Pressable
            onPress={handleExportZip}
            disabled={isExporting}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: isExporting ? '#9CA3AF' : pressed ? '#1E3A8A' : '#2563EB',
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 14,
              shadowColor: '#2563EB',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
              cursor: isWeb && !isExporting ? ('pointer' as const) : undefined,
            })}
          >
            <Download size={16} color="#FFF" />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFF' }}>
              {isExporting ? 'Gerando ZIP...' : 'Salvar Coleção (.ZIP) 📦'}
            </Text>
          </Pressable>

          <Pressable
            onPress={triggerImportClick}
            disabled={isImporting}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: isImporting ? '#9CA3AF' : pressed ? '#047857' : '#059669',
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 14,
              shadowColor: '#059669',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 3,
              cursor: isWeb && !isImporting ? ('pointer' as const) : undefined,
            })}
          >
            <Upload size={16} color="#FFF" />
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFF' }}>
              {isImporting ? 'Importando...' : 'Importar Livros 📥'}
            </Text>
          </Pressable>

          {/* Hidden input on Web for picking ZIP/JSON */}
          {isWeb && (
            <input
              ref={fileInputRef as unknown as React.RefObject<HTMLInputElement>}
              type="file"
              accept=".zip,.json,application/zip"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          )}
        </View>

        {/* Bookshelf Grid */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: 20,
            maxWidth: 800,
            alignSelf: 'center',
            width: '100%',
          }}
        >
          {books.map((book) => (
            <Pressable
              key={book.id}
              onPress={() => handleOpenBook(book)}
              style={({ pressed }) => ({
                width: 150,
                height: 220,
                backgroundColor: book.coverColor,
                borderRadius: 18,
                padding: 14,
                justifyContent: 'space-between',
                shadowColor: '#000',
                shadowOffset: { width: 4, height: 8 },
                shadowOpacity: 0.25,
                shadowRadius: 10,
                elevation: 6,
                transform: [{ scale: pressed ? 0.96 : 1 }],
                borderLeftWidth: 8,
                borderLeftColor: 'rgba(0, 0, 0, 0.25)',
                cursor: isWeb ? ('pointer' as const) : undefined,
              })}
            >
              {/* Cover Top badge */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 28 }}>{book.coverEmoji}</Text>
                {Boolean(book.childAudioUrl) && (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.3)', padding: 4, borderRadius: 8 }}>
                    <Mic size={14} color="#FFF" />
                  </View>
                )}
              </View>

              {/* Drawing Preview or Icon */}
              {book.drawingDataUrl ? (
                <Image
                  source={{ uri: book.drawingDataUrl }}
                  style={{ width: '100%', height: 65, borderRadius: 8, backgroundColor: '#FFF' }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    height: 50,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={24} color="#FFF" />
                </View>
              )}

              {/* Title */}
              <View>
                <Text
                  numberOfLines={2}
                  style={{ fontSize: 13, fontWeight: '900', color: '#FFF', lineHeight: 16 }}
                >
                  {book.title}
                </Text>
                <Text style={{ fontSize: 10, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
                  {book.createdAt}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Shelf bar visual */}
        <View
          style={{
            height: 14,
            backgroundColor: '#B45309',
            borderRadius: 7,
            marginTop: -8,
            marginBottom: 32,
            maxWidth: 840,
            alignSelf: 'center',
            width: '100%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
          }}
        />
      </ScrollView>

      {/* Book Reader Modal */}
      {Boolean(activeBook) && (
        <Modal visible={true} transparent animationType="fade" onRequestClose={handleCloseModal}>
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(30, 27, 75, 0.75)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 16,
            }}
          >
            <View
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: 28,
                width: '100%',
                maxWidth: 580,
                maxHeight: '90%',
                overflow: 'hidden',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              {/* Reader Header */}
              <View
                style={{
                  backgroundColor: activeBook?.coverColor,
                  paddingHorizontal: 20,
                  paddingVertical: 18,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 32 }}>{activeBook?.coverEmoji}</Text>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFF' }}>
                      {activeBook?.title}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' }}>
                      Escrito por você em {activeBook?.createdAt}
                    </Text>
                  </View>
                </View>

                <Pressable onPress={handleCloseModal} hitSlop={10}>
                  <X size={24} color="#FFF" />
                </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ padding: 24 }}>
                {/* Drawing Banner if present */}
                {activeBook?.drawingDataUrl && (
                  <View style={{ alignItems: 'center', marginBottom: 20 }}>
                    <Image
                      source={{ uri: activeBook.drawingDataUrl }}
                      style={{
                        width: '100%',
                        height: 180,
                        borderRadius: 18,
                        borderWidth: 2,
                        borderColor: '#E5E7EB',
                      }}
                      resizeMode="contain"
                    />
                  </View>
                )}

                {/* Story text with karaoke highlighting */}
                <View
                  style={{
                    backgroundColor: '#F5F3FF',
                    borderRadius: 20,
                    padding: 20,
                    borderWidth: 2,
                    borderColor: '#DDD6FE',
                    marginBottom: 20,
                  }}
                >
                  <Text style={{ fontSize: 24, lineHeight: 40, fontWeight: '700', color: '#1F2937' }}>
                    {(activeBook ? getWordSpans(activeBook.fullStory) : []).map((span, i) => {
                      const isHighlighted = span.index === activeWordIdx;
                      return (
                        <React.Fragment key={i}>
                          <Text
                            style={
                              isHighlighted
                                ? {
                                    backgroundColor: '#FEF08A',
                                    color: '#4C1D95',
                                    fontWeight: '900',
                                    borderRadius: 6,
                                    paddingHorizontal: 4,
                                  }
                                : undefined
                            }
                          >
                            {span.word}
                          </Text>
                          {' '}
                        </React.Fragment>
                      );
                    })}
                  </Text>
                </View>

                {/* Syllables breakdown guide */}
                <View style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#7C3AED', textTransform: 'uppercase', marginBottom: 8 }}>
                    🔤 Sílabas das Palavras-Chave:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {activeBook?.gaps.map((g) => (
                      <View
                        key={g.id}
                        style={{
                          backgroundColor: '#EDE9FE',
                          borderRadius: 12,
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          borderWidth: 1,
                          borderColor: '#C4B5FD',
                        }}
                      >
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#5B21B6' }}>
                          {g.word}: <Text style={{ color: '#7C3AED' }}>{formatSyllableString(g.word)}</Text>
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Audio controls */}
                <View style={{ gap: 10 }}>
                  <Pressable
                    onPress={handlePlayTTS}
                    style={({ pressed }) => ({
                      backgroundColor: isPlayingTTS ? '#DC2626' : '#7C3AED',
                      paddingVertical: 14,
                      borderRadius: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: pressed ? 0.9 : 1,
                      cursor: isWeb ? ('pointer' as const) : undefined,
                    })}
                  >
                    {isPlayingTTS ? (
                      <>
                        <Pause size={20} color="#FFF" fill="#FFF" />
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFF' }}>Pausar Narração</Text>
                      </>
                    ) : (
                      <>
                        <Volume2 size={20} color="#FFF" />
                        <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFF' }}>Ouvir História Narrada</Text>
                      </>
                    )}
                  </Pressable>

                  {Boolean(activeBook?.childAudioUrl) && (
                    <Pressable
                      onPress={handlePlayChildVoice}
                      style={({ pressed }) => ({
                        backgroundColor: isPlayingChildVoice ? '#DC2626' : '#059669',
                        paddingVertical: 14,
                        borderRadius: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        opacity: pressed ? 0.9 : 1,
                        cursor: isWeb ? ('pointer' as const) : undefined,
                      })}
                    >
                      {isPlayingChildVoice ? (
                        <>
                          <Pause size={20} color="#FFF" fill="#FFF" />
                          <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFF' }}>Pausar Minha Voz</Text>
                        </>
                      ) : (
                        <>
                          <Mic size={20} color="#FFF" />
                          <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFF' }}>
                            Ouvir Minha Voz Lendo 🌟
                          </Text>
                        </>
                      )}
                    </Pressable>
                  )}

                  {/* Share individual book button (AirDrop / Share Sheet) */}
                  <Pressable
                    onPress={handleShareBook}
                    disabled={isSharingBook}
                    style={({ pressed }) => ({
                      backgroundColor: isSharingBook ? '#9CA3AF' : pressed ? '#1E40AF' : '#2563EB',
                      paddingVertical: 14,
                      borderRadius: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: pressed ? 0.9 : 1,
                      cursor: isWeb && !isSharingBook ? ('pointer' as const) : undefined,
                    })}
                  >
                    <Share2 size={20} color="#FFF" />
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFF' }}>
                      {isSharingBook ? 'Preparando...' : 'Compartilhar História (AirDrop) 📤'}
                    </Text>
                  </Pressable>

                  {/* Delete button */}
                  <Pressable
                    onPress={() => {
                      if (activeBook) {
                        deleteBook(activeBook.id);
                        handleCloseModal();
                      }
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      marginTop: 6,
                      padding: 8,
                    }}
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#EF4444' }}>
                      Remover este livro da estante
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Multi-AI Provider Switcher & Key Modal */}
      <AIProviderModal />
    </View>
  );
};
