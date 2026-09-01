import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Palette,
  Sparkles,
  Eraser,
  RotateCcw,
  Check,
  X,
  BookOpen,
} from 'lucide-react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (coverData: {
    coverColor: string;
    coverEmoji: string;
    drawingDataUrl: string | null;
    title: string;
  }) => void;
  defaultTitle?: string;
}

const THEME_COLORS = [
  { id: 'purple', bg: '#7C3AED', label: 'Roxo Mágico' },
  { id: 'green', bg: '#059669', label: 'Floresta' },
  { id: 'blue', bg: '#2563EB', label: 'Oceano' },
  { id: 'amber', bg: '#D97706', label: 'Sol Dourado' },
  { id: 'pink', bg: '#DB2777', label: 'Algodão Doce' },
  { id: 'red', bg: '#DC2626', label: 'Aventura' },
];

const STICKERS = ['🐶', '🐱', '🚀', '🌟', '🏰', '🌳', '👑', '🦄', '⚽', '🌸', '🐠', '📚', '🦖', '🎨'];

const BRUSH_COLORS = ['#1E1B4B', '#DC2626', '#EA580C', '#EAB308', '#16A34A', '#2563EB', '#9333EA', '#FFFFFF'];

export const DrawingCoverModal: React.FC<Props> = ({
  visible,
  onClose,
  onSave,
  defaultTitle = 'Minha História Mágica',
}) => {
  const isWeb = Platform.OS === 'web';
  const [title, setTitle] = useState(defaultTitle);
  const [selectedColor, setSelectedColor] = useState(THEME_COLORS[0].bg);
  const [selectedEmoji, setSelectedEmoji] = useState(STICKERS[0]);
  const [brushColor, setBrushColor] = useState(BRUSH_COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (!isWeb || !visible) return;
    const timer = setTimeout(() => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [isWeb, visible]);

  const handleStartDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isWeb) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const handleDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !isWeb) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushColor === '#FFFFFF' ? 18 : 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handleEndDraw = () => {
    setIsDrawing(false);
  };

  const handleClearCanvas = () => {
    if (!isWeb) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleConfirm = () => {
    let drawingDataUrl: string | null = null;
    if (isWeb && canvasRef.current) {
      try {
        drawingDataUrl = canvasRef.current.toDataURL('image/png');
      } catch {
        drawingDataUrl = null;
      }
    }
    onSave({
      coverColor: selectedColor,
      coverEmoji: selectedEmoji,
      drawingDataUrl,
      title: title.trim() || 'Minha História Mágica',
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(30, 27, 75, 0.7)',
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
            maxWidth: 520,
            maxHeight: '90%',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Modal Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 20,
              paddingVertical: 16,
              backgroundColor: '#F5F3FF',
              borderBottomWidth: 1.5,
              borderColor: '#E9D5FF',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Palette size={24} color="#7C3AED" />
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#5B21B6' }}>
                Desenhe a Capa do Livro! 🎨
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={22} color="#6B7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Title Input */}
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', marginBottom: 6 }}>
              Título do Livro:
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Nome da historinha..."
              style={{
                backgroundColor: '#F9FAFB',
                borderWidth: 1.5,
                borderColor: '#D1D5DB',
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 10,
                fontSize: 16,
                fontWeight: '700',
                color: '#1F2937',
                marginBottom: 16,
              }}
            />

            {/* Theme Colors */}
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', marginBottom: 8 }}>
              Cor da Capa:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {THEME_COLORS.map((col) => {
                const isSelected = selectedColor === col.bg;
                return (
                  <Pressable
                    key={col.id}
                    onPress={() => setSelectedColor(col.bg)}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: col.bg,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: isSelected ? 3 : 1.5,
                      borderColor: isSelected ? '#F59E0B' : '#E5E7EB',
                      transform: [{ scale: isSelected ? 1.1 : 1 }],
                      cursor: isWeb ? ('pointer' as const) : undefined,
                    }}
                  >
                    {isSelected && <Check size={20} color="#FFF" strokeWidth={3} />}
                  </Pressable>
                );
              })}
            </View>

            {/* Sticker / Emoji Picker */}
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase', marginBottom: 8 }}>
              Adesivo Especial:
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {STICKERS.map((emoji) => {
                  const isSelected = selectedEmoji === emoji;
                  return (
                    <Pressable
                      key={emoji}
                      onPress={() => setSelectedEmoji(emoji)}
                      style={{
                        padding: 8,
                        borderRadius: 12,
                        backgroundColor: isSelected ? '#EDE9FE' : '#F3F4F6',
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected ? '#7C3AED' : '#E5E7EB',
                        transform: [{ scale: isSelected ? 1.15 : 1 }],
                        cursor: isWeb ? ('pointer' as const) : undefined,
                      }}
                    >
                      <Text style={{ fontSize: 24 }}>{emoji}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Drawing Canvas */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' }}>
                Desenho Livre da Criança:
              </Text>
              <Pressable
                onPress={handleClearCanvas}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <RotateCcw size={14} color="#EF4444" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>Limpar</Text>
              </Pressable>
            </View>

            {/* Brush Colors */}
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10, alignItems: 'center' }}>
              {BRUSH_COLORS.map((bc, idx) => {
                const isSelected = brushColor === bc;
                return (
                  <Pressable
                    key={idx}
                    onPress={() => setBrushColor(bc)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: bc,
                      borderWidth: isSelected ? 3 : 1,
                      borderColor: isSelected ? '#F59E0B' : '#9CA3AF',
                      cursor: isWeb ? ('pointer' as const) : undefined,
                    }}
                  />
                );
              })}
              <Pressable
                onPress={() => setBrushColor('#FFFFFF')}
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  backgroundColor: brushColor === '#FFFFFF' ? '#EDE9FE' : '#F3F4F6',
                  borderWidth: 1,
                  borderColor: brushColor === '#FFFFFF' ? '#7C3AED' : '#D1D5DB',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  marginLeft: 4,
                }}
              >
                <Eraser size={14} color="#6B7280" />
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#4B5563' }}>Borracha</Text>
              </Pressable>
            </View>

            {/* Canvas container */}
            <View
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: selectedColor,
                borderRadius: 20,
                padding: 12,
                marginBottom: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              <View style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
                <Text style={{ fontSize: 32 }}>{selectedEmoji}</Text>
              </View>
              {isWeb ? (
                // HTML5 Canvas on web
                React.createElement('canvas', {
                  ref: canvasRef,
                  width: 320,
                  height: 180,
                  onMouseDown: handleStartDraw,
                  onMouseMove: handleDraw,
                  onMouseUp: handleEndDraw,
                  onMouseLeave: handleEndDraw,
                  onTouchStart: handleStartDraw,
                  onTouchMove: handleDraw,
                  onTouchEnd: handleEndDraw,
                  style: {
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    cursor: 'crosshair',
                    touchAction: 'none',
                    maxWidth: '100%',
                  },
                })
              ) : (
                <View
                  style={{
                    width: 320,
                    height: 180,
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 48 }}>{selectedEmoji}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#4B5563', marginTop: 8 }}>
                    {title}
                  </Text>
                </View>
              )}
            </View>

            {/* Confirm button */}
            <Pressable
              onPress={handleConfirm}
              style={({ pressed }) => ({
                backgroundColor: pressed ? '#047857' : '#059669',
                paddingVertical: 14,
                borderRadius: 18,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                shadowColor: '#059669',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
                cursor: isWeb ? ('pointer' as const) : undefined,
              })}
            >
              <BookOpen size={20} color="#FFF" />
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFF' }}>
                Salvar Livro na Minha Estante 🌟
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
