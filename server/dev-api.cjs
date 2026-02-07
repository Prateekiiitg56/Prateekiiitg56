const express = require('express');
const cors = require('cors');

// Load env from .env/.env.local if present
try {
  // eslint-disable-next-line import/no-extraneous-dependencies
  require('dotenv').config({ path: '.env.local' });
  require('dotenv').config();
} catch {
  // dotenv not installed or no env files — that's fine
}

const app = express();
app.use(express.json({ limit: '1mb' }));

// Only needed if you hit the API directly (not via Vite proxy)
app.use(
  cors({
    origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
    methods: ['POST', 'OPTIONS'],
  })
);

app.get('/api/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body || {};
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'Missing GROQ_API_KEY',
      details:
        'Create a Groq API key and add GROQ_API_KEY=... to .env.local (do not put it in client code).',
    });
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid request', details: 'messages must be a non-empty array' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model: 'llama-3.3-70b-versatile',
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'Groq request failed',
        details: data?.error?.message || 'Unknown error from Groq',
      });
    }

    return res.status(200).json(data);
  } catch (err) {
    const message = err && typeof err === 'object' && 'message' in err ? String(err.message) : 'Unknown error';
    return res.status(500).json({ error: 'Internal Server Error', details: message });
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[dev-api] listening on http://localhost:${port}`);
});
