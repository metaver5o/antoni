import React, { useState, useRef, useEffect } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { Mic, Square, Play, Pause, RotateCcw, Sparkles } from 'lucide-react-native';
import { Audio } from 'expo-av';

interface Props {
  storyText: string;
  onRecordedAudio: (audioUrl: string) => void;
  initialAudioUrl?: string | null;
}

function downsampleTo16k(samples: Float32Array, inputSampleRate: number): Float32Array {
  if (inputSampleRate === 16000) return samples;
  const ratio = inputSampleRate / 16000;
  const newLength = Math.round(samples.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < samples.length; i++) {
      accum += samples[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
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

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);

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
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
    };
  }, []);

  const startRecording = async () => {
    setAudioUrl(null);
    setElapsedSeconds(0);
    setIsRecording(true);
    audioChunksRef.current = [];

    timerRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    if (isWeb && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;

        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          let ctx: AudioContext;
          try {
            ctx = new AudioCtx({ sampleRate: 16000 });
          } catch {
            ctx = new AudioCtx();
          }
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
          audioContextRef.current = ctx;

          const source = ctx.createMediaStreamSource(stream);
          sourceRef.current = source;

          const processor = ctx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (e) => {
            const input = e.inputBuffer.getChannelData(0);
            audioChunksRef.current.push(new Float32Array(input));
          };

          source.connect(processor);
          processor.connect(ctx.destination);
        }
      } catch (err) {
        console.warn('Child Voice AudioContext error:', err);
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

    if (isWeb && audioChunksRef.current.length > 0) {
      try {
        const recordedSampleRate = audioContextRef.current?.sampleRate || 44100;
        const totalLength = audioChunksRef.current.reduce((acc, cur) => acc + cur.length, 0);
        const allSamples = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of audioChunksRef.current) {
          allSamples.set(chunk, offset);
          offset += chunk.length;
        }

        if (processorRef.current) processorRef.current.disconnect();
        if (sourceRef.current) sourceRef.current.disconnect();
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        if (audioContextRef.current) audioContextRef.current.close();

        // Downsample accurately to 16kHz for universal compatibility & small storage size
        const downsampled = downsampleTo16k(allSamples, recordedSampleRate);
        const wavBlob = encodeWAV(downsampled, 16000);

        const reader = new FileReader();
        reader.readAsDataURL(wavBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAudioUrl(base64data);
          onRecordedAudio(base64data);
        };
      } catch (err) {
        console.warn('Stop recording error:', err);
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
        htmlAudioRef.current.currentTime = 0;
      } else if (soundRef.current) {
        await soundRef.current.pauseAsync();
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      if (isWeb) {
        const audio = htmlAudioRef.current || new (window.Audio || Audio)(audioUrl);
        htmlAudioRef.current = audio;
        if (audio.src !== audioUrl) {
          audio.src = audioUrl;
        }
        audio.currentTime = 0;
        audio.onended = () => setIsPlaying(false);
        audio.onerror = (e) => {
          console.warn('Playback error:', e);
          setIsPlaying(false);
        };
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err) => {
            console.warn('Audio play error:', err);
            setIsPlaying(false);
          });
        }
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
