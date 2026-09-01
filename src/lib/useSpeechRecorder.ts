/**
 * On web: delegates to the browser's SpeechRecognition API (real STT).
 * On native: records with expo-av and sends to the backend /api/transcribe
 *            (falls back to a mock transcript when backend is unavailable).
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

export type RecorderState = 'IDLE' | 'REQUESTING' | 'RECORDING' | 'PROCESSING';

export interface SpeechRecordingResult {
  transcript: string;
  audioUrl: string | null;
}

interface UseSpeechRecorder {
  recorderState: RecorderState;
  interimTranscript: string;
  elapsedSeconds: number;
  errorMessage: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<SpeechRecordingResult>;
  clearError: () => void;
}

const API_URL =
  typeof process !== 'undefined' && typeof process.env.EXPO_PUBLIC_API_URL === 'string'
    ? process.env.EXPO_PUBLIC_API_URL
    : (Platform.OS === 'web' ? '' : 'http://localhost:3001');

// Define safe SpeechRecognition types for TypeScript in environments without DOM Speech types
interface WebSpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      0: { transcript: string };
    };
  };
}

interface WebSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: (event: WebSpeechRecognitionEvent) => void;
  onerror: (event: unknown) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
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

function useWebRecorder(): UseSpeechRecorder {
  const [recorderState, setRecorderState] = useState<RecorderState>('IDLE');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const finalRef = useRef('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearError = useCallback(() => setErrorMessage(null), []);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      processorRef.current?.disconnect();
      sourceRef.current?.disconnect();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
      if (timerRef.current) clearInterval(timerRef.current);
    },
    [],
  );

  const startRecording = useCallback(async () => {
    if (typeof window === 'undefined') return;

    setErrorMessage(null);
    finalRef.current = '';
    setInterimTranscript('');
    setElapsedSeconds(0);
    audioChunksRef.current = [];
    setRecorderState('REQUESTING');

    // 1. Start Web Audio API PCM capture (works reliably in all browsers)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
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
      }
    } catch (err: unknown) {
      console.warn('Microphone permission or AudioContext failed:', err);
      const isNotAllowed =
        (err as { name?: string })?.name === 'NotAllowedError' ||
        (err as { name?: string })?.name === 'PermissionDeniedError';
      if (isNotAllowed) {
        setErrorMessage('Permissão de microfone bloqueada. Permita o microfone no ícone da URL no navegador.');
        setRecorderState('IDLE');
        return;
      }
    }

    // 2. Optionally start browser SpeechRecognition for live preview if supported
    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: new () => WebSpeechRecognition; webkitSpeechRecognition?: new () => WebSpeechRecognition })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => WebSpeechRecognition })
        .webkitSpeechRecognition;

    if (SpeechRecognitionAPI) {
      try {
        const rec = new SpeechRecognitionAPI();
        rec.lang = 'pt-BR';
        rec.continuous = true;
        rec.interimResults = true;

        rec.onresult = (e: WebSpeechRecognitionEvent) => {
          let interim = '';
          let final = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0].transcript;
            if (e.results[i].isFinal) {
              final += (final ? ' ' : '') + t.trim();
            } else {
              interim += t;
            }
          }
          if (final) {
            finalRef.current = (finalRef.current ? finalRef.current + ' ' : '') + final;
          }
          const display = (finalRef.current + ' ' + interim).trim();
          setInterimTranscript(display);
        };

        rec.onerror = (event: unknown) => {
          console.warn('Live SpeechRecognition note (handled via Whisper fallback):', event);
        };

        recognitionRef.current = rec;
        rec.start();
      } catch (err) {
        console.warn('Live SpeechRecognition not started, using Whisper pipeline:', err);
      }
    }

    setRecorderState('RECORDING');
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
  }, []);

  const stopRecording = useCallback((): Promise<SpeechRecordingResult> => {
    return new Promise(async (resolve) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecorderState('PROCESSING');

      // Stop speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          /* ignore */
        }
      }

      // Stop Web Audio capture
      if (processorRef.current) {
        try {
          processorRef.current.disconnect();
        } catch {
          /* ignore */
        }
      }
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch {
          /* ignore */
        }
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      const recordedSampleRate = audioContextRef.current?.sampleRate || 44100;
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch {
          /* ignore */
        }
        audioContextRef.current = null;
      }

      let audioDataUrl: string | null = null;
      let wavBlob: Blob | null = null;
      if (audioChunksRef.current.length > 0) {
        const totalLength = audioChunksRef.current.reduce((acc, cur) => acc + cur.length, 0);
        const allSamples = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of audioChunksRef.current) {
          allSamples.set(chunk, offset);
          offset += chunk.length;
        }

        const downsampled = downsampleTo16k(allSamples, recordedSampleRate);
        wavBlob = encodeWAV(downsampled, 16000);

        try {
          audioDataUrl = await new Promise<string>((res, rej) => {
            const reader = new FileReader();
            reader.onloadend = () => res(reader.result as string);
            reader.onerror = rej;
            reader.readAsDataURL(wavBlob!);
          });
        } catch (e) {
          console.warn('Failed to convert wavBlob to data URL:', e);
        }
      }

      // Check if browser SpeechRecognition already captured words
      const browserSpoken = (finalRef.current || interimTranscript).trim();
      if (browserSpoken.length > 0) {
        setRecorderState('IDLE');
        setInterimTranscript('');
        resolve({ transcript: browserSpoken, audioUrl: audioDataUrl });
        return;
      }

      // Transcribe via Backend Whisper if speech recognition returned empty
      if (wavBlob) {
        try {
          const formData = new FormData();
          formData.append('audio', wavBlob, 'recording.wav');

          const res = await fetch(`${API_URL}/api/transcribe`, {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = (await res.json()) as { transcript?: string };
            const whisperText = (data.transcript || '').trim();
            if (whisperText.length > 0) {
              setRecorderState('IDLE');
              setInterimTranscript('');
              resolve({ transcript: whisperText, audioUrl: audioDataUrl });
              return;
            }
          }
        } catch (err) {
          console.warn('Backend Whisper transcription error:', err);
        }
      }

      setRecorderState('IDLE');
      setInterimTranscript('');
      setErrorMessage('Não conseguimos ouvir sua fala. Fale um pouquinho mais alto ou digite a frase abaixo!');
      resolve({ transcript: '', audioUrl: audioDataUrl });
    });
  }, [interimTranscript]);

  return { recorderState, interimTranscript, elapsedSeconds, errorMessage, startRecording, stopRecording, clearError };
}

// ---------------------------------------------------------------------------
// Native implementation (expo-av)
// ---------------------------------------------------------------------------

function useNativeRecorder(): UseSpeechRecorder {
  const [recorderState, setRecorderState] = useState<RecorderState>('IDLE');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setRecorderState('REQUESTING');
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) { setRecorderState('IDLE'); return; }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setElapsedSeconds(0);
      setRecorderState('RECORDING');
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error('startRecording:', err);
      setRecorderState('IDLE');
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<SpeechRecordingResult> => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecorderState('PROCESSING');

    let uri: string | null = null;
    try {
      await recordingRef.current?.stopAndUnloadAsync();
      uri = recordingRef.current?.getURI() ?? null;
      recordingRef.current = null;
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch { /* ignore cleanup errors */ }

    if (uri) {
      try {
        const form = new FormData();
        form.append('audio', { uri, type: 'audio/m4a', name: 'recording.m4a' } as unknown as Blob);
        const res = await fetch(`${API_URL}/api/transcribe`, { method: 'POST', body: form });
        if (res.ok) {
          const { transcript } = (await res.json()) as { transcript: string };
          setRecorderState('IDLE');
          return { transcript: transcript || '', audioUrl: uri };
        }
      } catch { /* fall through */ }
    }

    setRecorderState('IDLE');
    return { transcript: '', audioUrl: uri };
  }, []);

  return {
    recorderState,
    interimTranscript: '',
    elapsedSeconds,
    errorMessage: null,
    startRecording,
    stopRecording,
    clearError: () => {},
  };
}

// ---------------------------------------------------------------------------
// Platform switch
// ---------------------------------------------------------------------------

export function useSpeechRecorder(): UseSpeechRecorder {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return Platform.OS === 'web' ? useWebRecorder() : useNativeRecorder();
}
