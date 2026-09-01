import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Sparkles,
  X,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Cpu,
  ShieldCheck,
} from 'lucide-react-native';
import { useAIProviderStore, AI_PROVIDERS, AIProviderId } from '../store/aiProviderStore';

export const AIProviderModal: React.FC = () => {
  const isWeb = Platform.OS === 'web';
  const {
    activeProvider,
    keys,
    models,
    customBaseUrl,
    isModalOpen,
    setModalOpen,
    setActiveProvider,
    setKey,
    setModel,
    setCustomBaseUrl,
  } = useAIProviderStore();

  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>(activeProvider);
  const [apiKeyInput, setApiKeyInput] = useState(keys[activeProvider] || '');
  const [selectedModel, setSelectedModel] = useState(
    models[activeProvider] || AI_PROVIDERS[activeProvider].defaultModel,
  );
  const [baseUrlInput, setBaseUrlInput] = useState(customBaseUrl);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Sync state when active provider changes or modal opens
  React.useEffect(() => {
    if (isModalOpen) {
      setSelectedProvider(activeProvider);
      setApiKeyInput(keys[activeProvider] || '');
      setSelectedModel(models[activeProvider] || AI_PROVIDERS[activeProvider].defaultModel);
      setBaseUrlInput(customBaseUrl);
      setTestStatus('idle');
      setTestMessage('');
    }
  }, [isModalOpen, activeProvider, keys, models, customBaseUrl]);

  const handleSelectProvider = (provId: AIProviderId) => {
    setSelectedProvider(provId);
    setApiKeyInput(keys[provId] || '');
    setSelectedModel(models[provId] || AI_PROVIDERS[provId].defaultModel);
    setTestStatus('idle');
    setTestMessage('');
  };

  const handleSave = () => {
    setKey(selectedProvider, apiKeyInput);
    setModel(selectedProvider, selectedModel);
    if (selectedProvider === 'custom') {
      setCustomBaseUrl(baseUrlInput);
    }
    setActiveProvider(selectedProvider);
    setModalOpen(false);
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('Testando comunicação com ' + AI_PROVIDERS[selectedProvider].name + '...');

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: 'O gato viu uma estrela brilhando.',
          provider: selectedProvider,
          apiKey: apiKeyInput.trim(),
          model: selectedModel,
          baseUrl: selectedProvider === 'custom' ? baseUrlInput : undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Servidor respondeu com código ${res.status}`);
      }

      const data = await res.json();
      if (data.usedProvider === 'fallback' && apiKeyInput.trim().length > 0) {
        setTestStatus('error');
        setTestMessage('Chave inválida ou erro na API. Verifique a chave ou o modelo.');
      } else {
        setTestStatus('success');
        setTestMessage(
          `Conexão confirmada com ${AI_PROVIDERS[selectedProvider].name}! (${data.gaps?.length || 2} palavras identificadas)`,
        );
      }
    } catch (err: unknown) {
      setTestStatus('error');
      setTestMessage('Falha ao conectar: ' + ((err as Error)?.message || 'Erro desconhecido'));
    }
  };

  const currentMeta = AI_PROVIDERS[selectedProvider];
  const providerList: AIProviderId[] = ['claude', 'gemini', 'grok', 'openai', 'custom'];

  if (!isModalOpen) return null;

  return (
    <Modal visible={isModalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 16,
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            width: '100%',
            maxWidth: 540,
            maxHeight: '90%',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
            elevation: 10,
          }}
        >
          {/* Header */}
          <View
            style={{
              backgroundColor: currentMeta.brandColor,
              paddingHorizontal: 20,
              paddingVertical: 18,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 28 }}>{currentMeta.logoEmoji}</Text>
              <View>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFF' }}>
                  Escolher IA do Antoni 🧠
                </Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.85)' }}>
                  Use Claude, Gemini, Grok, OpenAI ou Devin
                </Text>
              </View>
            </View>

            <Pressable onPress={() => setModalOpen(false)} hitSlop={10}>
              <X size={22} color="#FFF" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Provider Picker Pills */}
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#4B5563', marginBottom: 8, textTransform: 'uppercase' }}>
              Selecione o Provedor de IA:
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {providerList.map((pId) => {
                const meta = AI_PROVIDERS[pId];
                const isSelected = selectedProvider === pId;
                const hasKey = Boolean(keys[pId]);

                return (
                  <Pressable
                    key={pId}
                    onPress={() => handleSelectProvider(pId)}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 14,
                      backgroundColor: isSelected ? meta.brandColor : '#F3F4F6',
                      borderWidth: 2,
                      borderColor: isSelected ? meta.brandColor : '#E5E7EB',
                      opacity: pressed ? 0.9 : 1,
                      transform: [{ scale: isSelected ? 1.02 : 1 }],
                      cursor: isWeb ? ('pointer' as const) : undefined,
                    })}
                  >
                    <Text style={{ fontSize: 16 }}>{meta.logoEmoji}</Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '800',
                        color: isSelected ? '#FFFFFF' : '#374151',
                      }}
                    >
                      {meta.name}
                    </Text>
                    {hasKey && (
                      <View
                        style={{
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.3)' : '#D1FAE5',
                          borderRadius: 6,
                          paddingHorizontal: 4,
                          paddingVertical: 1,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 9,
                            fontWeight: '900',
                            color: isSelected ? '#FFFFFF' : '#059669',
                          }}
                        >
                          KEY
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Provider Info Banner */}
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: '#E2E8F0',
                marginBottom: 20,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '800', color: '#1E293B' }}>
                {currentMeta.logoEmoji} {currentMeta.name} — {currentMeta.tagline}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#64748B', marginTop: 4 }}>
                Insira sua chave de API abaixo para usar sua própria cota, ou deixe em branco para usar o servidor padrão.
              </Text>
            </View>

            {/* API Key Input */}
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151' }}>
                  🔑 Chave de API ({currentMeta.name}):
                </Text>
                {isWeb && (
                  <a
                    href={currentMeta.helpUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: currentMeta.brandColor,
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}
                  >
                    Obter Chave ↗
                  </a>
                )}
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 14,
                  borderWidth: 1.5,
                  borderColor: apiKeyInput.trim() ? currentMeta.brandColor : '#D1D5DB',
                  paddingHorizontal: 12,
                }}
              >
                <Key size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
                <TextInput
                  value={apiKeyInput}
                  onChangeText={(t) => {
                    setApiKeyInput(t);
                    setTestStatus('idle');
                  }}
                  placeholder={currentMeta.keyPlaceholder}
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    flex: 1,
                    fontSize: 13,
                    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
                    color: '#1F2937',
                    paddingVertical: 10,
                    outlineStyle: 'none',
                  } as unknown as Record<string, unknown>}
                />
                <Pressable onPress={() => setShowKey(!showKey)} hitSlop={8} style={{ padding: 4 }}>
                  {showKey ? <EyeOff size={16} color="#6B7280" /> : <Eye size={16} color="#6B7280" />}
                </Pressable>
              </View>
            </View>

            {/* Custom Base URL (if custom provider) */}
            {selectedProvider === 'custom' && (
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 }}>
                  🌐 Base URL da API:
                </Text>
                <TextInput
                  value={baseUrlInput}
                  onChangeText={setBaseUrlInput}
                  placeholder="https://openrouter.ai/api/v1"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: '#D1D5DB',
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 13,
                    color: '#1F2937',
                    outlineStyle: 'none',
                  } as unknown as Record<string, unknown>}
                />
              </View>
            )}

            {/* Model Selector */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 }}>
                ⚙️ Modelo:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {currentMeta.availableModels.map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setSelectedModel(m)}
                    style={{
                      backgroundColor: selectedModel === m ? '#EDE9FE' : '#F3F4F6',
                      borderWidth: 1.5,
                      borderColor: selectedModel === m ? '#7C3AED' : '#E5E7EB',
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 10,
                      cursor: isWeb ? ('pointer' as const) : undefined,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: selectedModel === m ? '#6D28D9' : '#4B5563',
                      }}
                    >
                      {m}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Test Connection Results */}
            {testStatus !== 'idle' && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor:
                    testStatus === 'success' ? '#D1FAE5' : testStatus === 'error' ? '#FEE2E2' : '#EFF6FF',
                  padding: 12,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor:
                    testStatus === 'success' ? '#10B981' : testStatus === 'error' ? '#EF4444' : '#3B82F6',
                  marginBottom: 16,
                }}
              >
                {testStatus === 'testing' && <ActivityIndicator size="small" color="#2563EB" />}
                {testStatus === 'success' && <CheckCircle2 size={18} color="#059669" />}
                {testStatus === 'error' && <AlertCircle size={18} color="#DC2626" />}
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '700',
                    color:
                      testStatus === 'success'
                        ? '#065F46'
                        : testStatus === 'error'
                        ? '#991B1B'
                        : '#1E40AF',
                    flex: 1,
                  }}
                >
                  {testMessage}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={{ gap: 10 }}>
              <Pressable
                onPress={handleTestConnection}
                disabled={testStatus === 'testing'}
                style={({ pressed }) => ({
                  backgroundColor: '#F3F4F6',
                  borderWidth: 1.5,
                  borderColor: '#D1D5DB',
                  paddingVertical: 11,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  opacity: pressed ? 0.9 : 1,
                  cursor: isWeb ? ('pointer' as const) : undefined,
                })}
              >
                <Cpu size={16} color="#374151" />
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#374151' }}>
                  Testar Conexão com {currentMeta.name} ⚡
                </Text>
              </Pressable>

              <Pressable
                onPress={handleSave}
                style={({ pressed }) => ({
                  backgroundColor: currentMeta.brandColor,
                  paddingVertical: 13,
                  borderRadius: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  shadowColor: currentMeta.brandColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                  elevation: 4,
                  opacity: pressed ? 0.9 : 1,
                  cursor: isWeb ? ('pointer' as const) : undefined,
                })}
              >
                <ShieldCheck size={18} color="#FFF" />
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFF' }}>
                  Salvar e Usar {currentMeta.name} 🚀
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
