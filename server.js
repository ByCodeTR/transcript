import express from 'express';
import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

function normalizeTranscript(items) {
  return items
    .map((item) => item.text.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanCueText(text) {
  return text
    .replace(/\[[^\]]*]/g, ' ')
    .replace(/[♪♫♬♩♭♮♯]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

app.post('/api/transcript', async (req, res) => {
  const { url } = req.body ?? {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Gecerli bir YouTube linki gir.' });
  }

  try {
    const transcriptItems = await YoutubeTranscript.fetchTranscript(url);

    if (!transcriptItems?.length) {
      return res.status(404).json({ error: 'Bu video icin transcript bulunamadi.' });
    }

    const cleanedChunks = transcriptItems
      .map((item) => ({ ...item, text: cleanCueText(item.text || '') }))
      .filter((item) => item.text);

    if (!cleanedChunks.length) {
      return res.status(404).json({ error: 'Temizlenmis transcript bulunamadi.' });
    }

    return res.json({
      chunks: cleanedChunks,
      text: normalizeTranscript(cleanedChunks),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transcript alinamadi.';
    return res.status(500).json({ error: message });
  }
});

app.listen(PORT, () => {
  console.log(`Transcript app running on http://localhost:${PORT}`);
});
