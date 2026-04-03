import { YoutubeTranscript } from 'youtube-transcript/dist/youtube-transcript.esm.js';

const INVIDIOUS_INSTANCES = [
  'https://yewtu.be',
  'https://invidious.fdn.fr',
  'https://inv.nadeko.net',
];

function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
  });
}

export function normalizeTranscript(items) {
  return items
    .map((item) => item.text.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanCueText(text) {
  return (text || '')
    .replace(/\[[^\]]*]/g, ' ')
    .replace(/[♪♫♬♩♭♮♯]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function canonicalizeYouTubeUrl(input) {
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

export function extractVideoId(input) {
  if (!input) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const parsed = new URL(input);
    if (parsed.searchParams.get('v')) return parsed.searchParams.get('v').slice(0, 11);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.replace('/', '').slice(0, 11);

    const match = parsed.pathname.match(/\/(embed|shorts)\/([a-zA-Z0-9_-]{11})/);
    if (match) return match[2];
  } catch {
    return null;
  }

  return null;
}

function parseVttTimeToSeconds(value) {
  const normalized = value.replace(',', '.').trim();
  const parts = normalized.split(':').map((part) => part.trim());

  if (parts.length === 3) {
    const [h, m, s] = parts;
    return Number(h) * 3600 + Number(m) * 60 + Number(s);
  }

  if (parts.length === 2) {
    const [m, s] = parts;
    return Number(m) * 60 + Number(s);
  }

  return Number(parts[0]) || 0;
}

function parseVttCaptions(vttText, lang = 'und') {
  const lines = vttText.split(/\r?\n/);
  const chunks = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line.includes('-->')) continue;

    const [startPart] = line.split('-->');
    const offset = parseVttTimeToSeconds(startPart);

    i += 1;
    const textLines = [];

    while (i < lines.length && lines[i].trim() !== '') {
      const current = lines[i].trim();
      if (!/^\d+$/.test(current)) {
        textLines.push(current.replace(/<[^>]+>/g, ''));
      }
      i += 1;
    }

    const text = cleanCueText(textLines.join(' '));
    if (text) {
      chunks.push({ text, offset, duration: 0, lang });
    }
  }

  return chunks;
}

async function fetchViaInvidious(videoId) {
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const metaRes = await fetchWithTimeout(`${instance}/api/v1/videos/${videoId}`);
      if (!metaRes.ok) continue;

      const meta = await metaRes.json();
      const captions = Array.isArray(meta?.captions) ? meta.captions : [];
      if (!captions.length) continue;

      const chosen = captions[0];
      const label = chosen?.label;
      const lang = chosen?.language_code || chosen?.languageCode || 'und';
      if (!label) continue;

      const captionRes = await fetchWithTimeout(
        `${instance}/api/v1/captions/${videoId}?label=${encodeURIComponent(label)}`
      );
      if (!captionRes.ok) continue;

      const vttText = await captionRes.text();
      const parsed = parseVttCaptions(vttText, lang);
      if (parsed.length) {
        return parsed;
      }
    } catch {
      // try next instance
    }
  }

  return [];
}

export async function fetchTranscriptWithFallback(url) {
  const canonicalUrl = canonicalizeYouTubeUrl(url);
  const videoId = extractVideoId(canonicalUrl) || extractVideoId(url);

  try {
    const direct = await YoutubeTranscript.fetchTranscript(canonicalUrl);
    if (Array.isArray(direct) && direct.length) return direct;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const isRecoverable =
      message.includes('Transcript is disabled on this video') ||
      message.includes('No transcripts are available for this video') ||
      message.includes('No transcripts are available in');

    if (!isRecoverable) {
      throw error;
    }
  }

  if (!videoId) {
    throw new Error('Impossible to retrieve Youtube video ID.');
  }

  const fallback = await fetchViaInvidious(videoId);
  if (fallback.length) return fallback;

  throw new Error('Transcript is disabled on this video');
}

export function mapTranscriptError(error, originalUrl) {
  const message = error instanceof Error ? error.message : 'Transcript alinamadi.';

  if (message.includes('Transcript is disabled on this video')) {
    return {
      status: 422,
      error:
        'Bu videoda altyazi/transcript gorunmuyor. YouTube tarafi kisitliyorsa alternatif kaynaklar da basarisiz olabilir. Baska bir video dene.',
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
