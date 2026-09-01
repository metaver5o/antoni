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

Given a child's spoken transcript or written story in Portuguese:
1. Remove all speech fillers (aí, né, tipo, assim, então, ãh, uh, hmm, sabe, quer dizer, daí).
2. Clean up grammar into 1 to 4 clear, rhythmic, age-appropriate sentences.
3. Identify concrete, easily-visualizable nouns in chronological order:
   - For short stories (1-2 sentences): select exactly 3 key nouns.
   - For medium stories (2-3 sentences): select 4 or 5 key nouns.
   - For longer stories (3+ sentences): select up to 6 key nouns.
4. In "cleanStory", replace each chosen noun with its corresponding marker: [1], [2], [3] (up to [4], [5], [6] if longer). Every marker must appear exactly once in cleanStory.
5. In "gaps", create the array of objects matching every marker in order.

Return ONLY a valid JSON object with this exact structure and no markdown fences:
{
  "cleanStory": "O [1] correu atras da [2] no [3] e subiu na [4].",
  "gaps": [
    { "id": 1, "word": "CACHORRO", "icon": "paw-print" },
    { "id": 2, "word": "BOLA",     "icon": "circle"    },
    { "id": 3, "word": "PARQUE",   "icon": "leaf"      },
    { "id": 4, "word": "ARVORE",   "icon": "leaf"      }
  ]
}

Rules:
- "word" must be in UPPERCASE Portuguese
- "icon" must be one of: paw-print, circle, leaf, star, heart, home, sun, fish, bird, car, book, apple, flower, moon, cloud, music, smile, gift
- Choose the icon that best represents the word visually
- Each [N] marker in cleanStory must have an exact matching { id: N, word: "..." } in gaps
- If the transcript is too short or unintelligible, create a whimsical 3-word story about animals and nature.
`.trim();

// ---------------------------------------------------------------------------
// POST /api/parse  — transcript -> structured story JSON
// ---------------------------------------------------------------------------
app.post('/api/parse', async (req, res) => {
  const { transcript } = req.body ?? {};
  if (!transcript || typeof transcript !== 'string') {
    return res.status(400).json({ error: 'transcript is required' });
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: PARSE_SYSTEM,
      messages: [{ role: 'user', content: transcript }],
    });

    const raw = message.content[0]?.type === 'text' ? message.content[0].text : '';

    // Strip markdown code fences if the model wraps its JSON
    const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const parsed = JSON.parse(jsonText);

    if (!parsed.cleanStory || !Array.isArray(parsed.gaps) || parsed.gaps.length < 2) {
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
    if (alignedGaps.length === 0 && parsed.gaps.length >= 2) {
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

    if (alignedGaps.length < 2) {
      throw new Error('Could not synchronize story gaps');
    }

    return res.json({
      cleanStory: parsed.cleanStory,
      gaps: alignedGaps,
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
