import React, { useState, useRef, useEffect } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Mic, Square, Play, Pause, RotateCcw, Sparkles } from 'lucide-react-native';
import { Audio } from 'expo-av';

interface Props {
  storyText: string;
  onRecordedAudio: (audioUrl: string) => void;
  initialAudioUrl?: string | null;
}

export const ChildVoiceRecorder: React.FC<Props> = ({
  storyText,
  onRecordedAudio,
  initialAudioUrl = null,
}) => {
  const isWeb = Platform.OS === 'web';
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(initialAudioUrl);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const nativeRecordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (htmlAudioRef.current) {
        htmlAudioRef.current.pause();
      }
      soundRef.current?.unloadAsync();
    };
  }, []);

  const startRecording = async () => {
    setAudioUrl(null);
    setElapsedSeconds(0);
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    if (isWeb && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const base64data = reader.result as string;
            setAudioUrl(base64data);
            onRecordedAudio(base64data);
          };
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
      } catch (err) {
        console.warn('MediaRecorder error:', err);
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    } else {
      // Native expo-av
      try {
        await Audio.requestPermissionsAsync();
        await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY,
        );
        nativeRecordingRef.current = recording;
      } catch (err) {
        console.warn('Native Audio error:', err);
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    }
  };

  const stopRecording = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);

    if (isWeb && mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('Stop MediaRecorder error:', err);
      }
    } else if (nativeRecordingRef.current) {
      try {
        await nativeRecordingRef.current.stopAndUnloadAsync();
        const uri = nativeRecordingRef.current.getURI();
        if (uri) {
          setAudioUrl(uri);
          onRecordedAudio(uri);
        }
        nativeRecordingRef.current = null;
      } catch (err) {
        console.warn('Native Stop error:', err);
      }
    }
  };

  const togglePlayAudio = async () => {
    if (!audioUrl) return;

    if (isPlaying) {
      if (isWeb && htmlAudioRef.current) {
        htmlAudioRef.current.pause();
      } else if (soundRef.current) {
        await soundRef.current.pauseAsync();
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (isWeb) {
        if (!htmlAudioRef.current) {
          htmlAudioRef.current = new window.Audio(audioUrl);
        } else {
          htmlAudioRef.current.src = audioUrl;
        }
        htmlAudioRef.current.onended = () => setIsPlaying(false);
        htmlAudioRef.current.onerror = () => setIsPlaying(false);
        htmlAudioRef.current.play();
      } else {
        const { sound } = await Audio.Sound.createAsync({ uri: audioUrl });
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        });
        await sound.playAsync();
      }
    }
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <View
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 18,
        marginVertical: 12,
        borderWidth: 2,
        borderColor: '#FDE68A',
        shadowColor: '#D97706',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Sparkles size={18} color="#D97706" />
        <Text style={{ fontSize: 14, fontWeight: '900', color: '#B45309', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Voz do Escritor(a) 🎙️
        </Text>
      </View>

      <Text style={{ fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 12 }}>
        Leia a historinha com a sua voz e guarde para sempre:
      </Text>

      {/* Story reference text */}
      <View
        style={{
          backgroundColor: '#FFFBEB',
          borderRadius: 14,
          padding: 12,
          marginBottom: 14,
          borderWidth: 1,
          borderColor: '#FCD34D',
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#92400E', lineHeight: 24, textAlign: 'center' }}>
          "{storyText}"
        </Text>
      </View>

      {/* Controls */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        {!audioUrl ? (
          <Pressable
            onPress={isRecording ? stopRecording : startRecording}
            style={({ pressed }) => ({
              backgroundColor: isRecording ? '#DC2626' : '#D97706',
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 16,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              opacity: pressed ? 0.9 : 1,
              cursor: isWeb ? ('pointer' as const) : undefined,
            })}
          >
            {isRecording ? (
              <>
                <Square size={20} color="#FFF" fill="#FFF" />
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFF' }}>
                  Concluir ({formatTime(elapsedSeconds)})
                </Text>
              </>
            ) : (
              <>
                <Mic size={20} color="#FFF" />
                <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFF' }}>
                  Gravar Minha Leitura
                </Text>
              </>
            )}
          </Pressable>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' }}>
            <Pressable
              onPress={togglePlayAudio}
              style={({ pressed }) => ({
                flex: 1,
                backgroundColor: isPlaying ? '#DC2626' : '#059669',
                paddingVertical: 12,
                borderRadius: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                opacity: pressed ? 0.9 : 1,
                cursor: isWeb ? ('pointer' as const) : undefined,
              })}
            >
              {isPlaying ? (
                <>
                  <Pause size={18} color="#FFF" fill="#FFF" />
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFF' }}>Pausar Minha Voz</Text>
                </>
              ) : (
                <>
                  <Play size={18} color="#FFF" fill="#FFF" />
                  <Text style={{ fontSize: 14, fontWeight: '900', color: '#FFF' }}>Ouvir Minha Leitura</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={startRecording}
              style={({ pressed }) => ({
                backgroundColor: '#F3F4F6',
                padding: 12,
                borderRadius: 16,
                borderWidth: 1.5,
                borderColor: '#D1D5DB',
                opacity: pressed ? 0.8 : 1,
                cursor: isWeb ? ('pointer' as const) : undefined,
              })}
            >
              <RotateCcw size={18} color="#4B5563" />
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
};
