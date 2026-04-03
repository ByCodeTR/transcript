import {
  cleanCueText,
  fetchTranscriptWithFallback,
  mapTranscriptError,
  normalizeTranscript,
} from '../lib/transcript-service.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST desteklenir.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const { url } = body;

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

    return res.status(200).json({
      chunks: cleanedChunks,
      text: normalizeTranscript(cleanedChunks),
    });
  } catch (error) {
    const mapped = mapTranscriptError(error, url);
    return res.status(mapped.status).json({ error: mapped.error });
  }
}
