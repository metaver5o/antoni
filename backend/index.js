'use strict';

const fs = require('fs');
const path = require('path');

// Try to load .env from project root if present
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      if (!process.env[key]) process.env[key] = value.trim();
    }
  }
}

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const upload = multer({ dest: '/tmp/recordings/' });
const client = new Anthropic.Anthropic();

app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// System prompt for the story parser
const PARSE_SYSTEM = `
You are an intelligent children's story parser for a Brazilian Portuguese literacy app targeting kids aged 5-7.

Given a child's spoken transcript or written text in Portuguese:
1. Preserve the child's authentic words, characters, and ideas as closely as possible. Do NOT replace their words with unrelated stories.
2. Remove speech fillers (aí, né, tipo, assim, então, ãh, uh, hmm, sabe, quer dizer, daí).
3. Clean up grammar and punctuation into 1 to 4 clear, age-appropriate Portuguese sentences based directly on what was said.
4. Extract 1 to 6 concrete, prominent words/nouns from the text in chronological order:
   - For very short phrases (e.g. "teste do app" or "o gato miou"): extract 1 or 2 key words.
   - For standard stories: extract 3 to 5 words.
   - For longer stories: extract up to 6 words.
5. In "cleanStory", replace each chosen word with its marker: [1], [2], [3] (up to [N]). Every marker must appear exactly once in cleanStory.
6. In "gaps", create the array of objects matching every marker in order.

Return ONLY a valid JSON object with this exact structure and no markdown fences:
{
  "cleanStory": "O [1] correu atras da [2] no [3].",
  "gaps": [
    { "id": 1, "word": "CACHORRO", "icon": "paw-print" },
    { "id": 2, "word": "BOLA",     "icon": "circle"    },
    { "id": 3, "word": "PARQUE",   "icon": "leaf"      }
  ]
}

Rules:
- "word" MUST be extracted directly from the input text, in UPPERCASE Portuguese without punctuation or special symbols.
- "icon" must be one of: paw-print, circle, leaf, star, heart, home, sun, fish, bird, car, book, apple, flower, moon, cloud, music, smile, gift, sparkles
- Choose the icon that best represents each word visually (e.g. animals -> paw-print/bird/fish, places -> home/leaf, objects/devices -> car/book/gift/circle/apple, nature -> sun/moon/cloud/flower/leaf/star, joy/fun -> smile/music/sparkles/heart).
- Each [N] marker in cleanStory must have an exact matching { id: N, word: "..." } in gaps.
`.trim();

// ---------------------------------------------------------------------------
// Multi-AI Provider Execution Helpers
// ---------------------------------------------------------------------------
async function parseWithClaude({ transcript, apiKey, model }) {
  const customClient = apiKey ? new Anthropic.Anthropic({ apiKey }) : client;
  const message = await customClient.messages.create({
    model: model || 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: PARSE_SYSTEM,
    messages: [{ role: 'user', content: transcript }],
  });
  return message.content[0]?.type === 'text' ? message.content[0].text : '';
}

async function parseWithGemini({ transcript, apiKey, model }) {
  const key = apiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) throw new Error('API Key para Google Gemini não informada');
  const targetModel = model || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`;

  const payload = {
    system_instruction: { parts: [{ text: PARSE_SYSTEM }] },
    contents: [{ parts: [{ text: transcript }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Gemini error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function parseWithOpenAICompatible({ transcript, apiKey, model, baseUrl, defaultKeyEnv }) {
  const key = apiKey || (defaultKeyEnv ? process.env[defaultKeyEnv] : '');
  if (!key) throw new Error(`API Key não informada para ${baseUrl || 'provedor'}`);

  const endpoint = `${(baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '')}/chat/completions`;
  const payload = {
    model: model,
    messages: [
      { role: 'system', content: PARSE_SYSTEM },
      { role: 'user', content: transcript },
    ],
    temperature: 0.2,
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ---------------------------------------------------------------------------
// POST /api/parse  — transcript -> structured story JSON
// ---------------------------------------------------------------------------
app.post('/api/parse', async (req, res) => {
  const { transcript, provider = 'claude', apiKey = '', model = '', baseUrl = '' } = req.body ?? {};
  if (!transcript || typeof transcript !== 'string') {
    return res.status(400).json({ error: 'transcript is required' });
  }

  try {
    let raw = '';
    console.log(`[AI Parser] Request with provider: ${provider}, model: ${model || 'default'}`);

    if (provider === 'gemini') {
      raw = await parseWithGemini({ transcript, apiKey, model });
    } else if (provider === 'grok') {
      raw = await parseWithOpenAICompatible({
        transcript,
        apiKey,
        model: model || 'grok-2-latest',
        baseUrl: 'https://api.x.ai/v1',
        defaultKeyEnv: 'XAI_API_KEY',
      });
    } else if (provider === 'openai') {
      raw = await parseWithOpenAICompatible({
        transcript,
        apiKey,
        model: model || 'gpt-4o-mini',
        baseUrl: 'https://api.openai.com/v1',
        defaultKeyEnv: 'OPENAI_API_KEY',
      });
    } else if (provider === 'custom') {
      raw = await parseWithOpenAICompatible({
        transcript,
        apiKey,
        model: model || 'anthropic/claude-3.5-haiku',
        baseUrl: baseUrl || 'https://openrouter.ai/api/v1',
      });
    } else {
      // Default: Claude
      raw = await parseWithClaude({ transcript, apiKey, model });
    }

    console.log(`[AI Parser] Raw response (${provider}):`, raw);

    // Strip markdown code fences if the model wraps its JSON
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const parsed = JSON.parse(jsonText);

    if (!parsed.cleanStory || !Array.isArray(parsed.gaps) || parsed.gaps.length < 1) {
      console.warn('Invalid parsed shape:', parsed);
      throw new Error('Unexpected response shape from model');
    }

    // Extract all [1], [2], [3] markers actually present in cleanStory in order
    const presentIds = [];
    const markerRegex = /\[(\d+)\]/g;
    let m;
    while ((m = markerRegex.exec(parsed.cleanStory)) !== null) {
      const id = Number(m[1]);
      if (!presentIds.includes(id)) presentIds.push(id);
    }

    // If cleanStory has fewer markers than gaps, or missing markers, align gaps to cleanStory
    let alignedGaps = presentIds
      .map((id) => parsed.gaps.find((g) => g.id === id))
      .filter(Boolean);

    // If cleanStory had no markers or something broke, re-inject markers for all gaps
    if (alignedGaps.length === 0 && parsed.gaps.length >= 1) {
      let story = parsed.cleanStory;
      parsed.gaps.forEach((g) => {
        const wordRegex = new RegExp(`\\b${g.word}\\b`, 'i');
        if (wordRegex.test(story)) {
          story = story.replace(wordRegex, `[${g.id}]`);
        }
      });
      parsed.cleanStory = story;
      alignedGaps = parsed.gaps.filter((g) => parsed.cleanStory.includes(`[${g.id}]`));
    }

    if (alignedGaps.length < 1) {
      throw new Error('Could not synchronize story gaps');
    }

    return res.json({
      cleanStory: parsed.cleanStory,
      gaps: alignedGaps,
      usedProvider: provider,
    });
  } catch (err) {
    console.error('/api/parse error:', err?.message ?? err);
    // Return a sensible fallback so the app never hard-crashes
    return res.json({
      cleanStory: 'O [1] correu atras da [2] no [3].',
      gaps: [
        { id: 1, word: 'CACHORRO', icon: 'paw-print' },
        { id: 2, word: 'BOLA',     icon: 'circle'    },
        { id: 3, word: 'PARQUE',   icon: 'leaf'      },
      ],
      usedProvider: 'fallback',
    });
  }
});

const { pipeline } = require('@xenova/transformers');
const { WaveFile } = require('wavefile');

let transcriberPromise = null;
function getTranscriber() {
  if (!transcriberPromise) {
    console.log('Initializing Whisper ASR pipeline...');
    transcriberPromise = pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
      quantized: true,
    });
  }
  return transcriberPromise;
}

// ---------------------------------------------------------------------------
// POST /api/transcribe  — audio file -> { transcript }
// ---------------------------------------------------------------------------
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'audio file required' });

  try {
    const openaiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
    if (openaiKey) {
      try {
        const isGroq = Boolean(process.env.GROQ_API_KEY);
        const endpoint = isGroq
          ? 'https://api.groq.com/openai/v1/audio/transcriptions'
          : 'https://api.openai.com/v1/audio/transcriptions';
        const model = isGroq ? 'whisper-large-v3' : 'whisper-1';

        const formData = new FormData();
        const fileBuffer = fs.readFileSync(file.path);
        const blob = new Blob([fileBuffer], { type: file.mimetype || 'audio/wav' });
        formData.append('file', blob, file.originalname || 'recording.wav');
        formData.append('model', model);
        formData.append('language', 'pt');

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${openaiKey}` },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.text) {
            return res.json({ transcript: data.text.trim() });
          }
        }
      } catch (err) {
        console.warn('Cloud STT failed, falling back to local Whisper:', err?.message);
      }
    }

    // Local Whisper pipeline
    const fileBuffer = fs.readFileSync(file.path);
    const wav = new WaveFile(fileBuffer);
    wav.toSampleRate(16000);
    wav.toBitDepth('32f');
    const samples = wav.getSamples(false, Float32Array);

    const transcriber = await getTranscriber();
    const result = await transcriber(samples, {
      language: 'portuguese',
      task: 'transcribe',
    });

    const transcript = (result?.text || '').trim();
    console.log('Local Whisper transcribed:', transcript);
    return res.json({ transcript });
  } catch (err) {
    console.error('/api/transcribe error:', err?.message ?? err);
    return res.json({ transcript: '' });
  } finally {
    if (file?.path) fs.unlink(file.path, () => {});
  }
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Histórias do Tony API listening on :${PORT}`);
  // Warm up Whisper model in background
  getTranscriber().catch((e) => console.warn('Whisper warmup notice:', e?.message));
});
