import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';

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

function canonicalizeYouTubeUrl(input) {
  try {
    const parsed = new URL(input);
    const videoId =
      parsed.searchParams.get('v') ||
      (parsed.hostname.includes('youtu.be') ? parsed.pathname.replace('/', '') : null);

    if (!videoId) return input;
    return `https://www.youtube.com/watch?v=${videoId}`;
  } catch {
    return input;
  }
}

function mapTranscriptError(error, originalUrl) {
  const message = error instanceof Error ? error.message : 'Transcript alinamadi.';

  if (message.includes('Transcript is disabled on this video')) {
    return {
      status: 422,
      error:
        'Bu videoda altyazi/transcript kapali. YouTube tarafinda transcript yoksa teknik olarak cekemeyiz. Baska bir video dene.',
    };
  }

  if (message.includes('No transcripts are available for this video')) {
    return {
      status: 404,
      error: `Bu video icin transcript bulunamadi: ${originalUrl}`,
    };
  }

  if (message.includes('Impossible to retrieve Youtube video ID')) {
    return {
      status: 400,
      error: 'YouTube linki okunamadi. Tam video URLsi gir.',
    };
  }

  return { status: 500, error: message };
}

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
    const canonicalUrl = canonicalizeYouTubeUrl(url);
    const transcriptItems = await YoutubeTranscript.fetchTranscript(canonicalUrl);

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
