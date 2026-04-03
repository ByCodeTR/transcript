import express from 'express';
import {
  cleanCueText,
  fetchTranscriptWithFallback,
  mapTranscriptError,
  normalizeTranscript,
} from './lib/transcript-service.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.post('/api/transcript', async (req, res) => {
  const { url } = req.body ?? {};

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Gecerli bir YouTube linki gir.' });
  }

  try {
    const transcriptItems = await fetchTranscriptWithFallback(url);

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
    const mapped = mapTranscriptError(error, url);
    return res.status(mapped.status).json({ error: mapped.error });
  }
});

app.listen(PORT, () => {
  console.log(`Transcript app running on http://localhost:${PORT}`);
});
