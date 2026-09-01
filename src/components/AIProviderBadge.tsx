import React from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Sparkles, Key } from 'lucide-react-native';
import { useAIProviderStore, AI_PROVIDERS } from '../store/aiProviderStore';

export const AIProviderBadge: React.FC = () => {
  const isWeb = Platform.OS === 'web';
  const { activeProvider, keys, setModalOpen } = useAIProviderStore();
  const currentMeta = AI_PROVIDERS[activeProvider] || AI_PROVIDERS.claude;
  const hasCustomKey = Boolean(keys[activeProvider]?.trim());

  return (
    <Pressable
      onPress={() => setModalOpen(true)}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: currentMeta.brandColor,
        shadowColor: currentMeta.brandColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
        transform: [{ scale: pressed ? 0.95 : 1 }],
        cursor: isWeb ? ('pointer' as const) : undefined,
      })}
    >
      <Text style={{ fontSize: 13 }}>{currentMeta.logoEmoji}</Text>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '800',
          color: currentMeta.brandColor === '#18181B' ? '#27272A' : currentMeta.brandColor,
        }}
      >
        {currentMeta.name}
      </Text>
      {hasCustomKey ? (
        <View style={{ backgroundColor: '#D1FAE5', borderRadius: 6, padding: 2 }}>
          <Key size={10} color="#059669" />
        </View>
      ) : (
        <View
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#10B981',
          }}
        />
      )}
    </Pressable>
  );
};
