const form = document.getElementById('form');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');
const copyBtn = document.getElementById('copyBtn');
const urlInput = document.getElementById('url');
const previewPlayer = document.getElementById('previewPlayer');
const previewPlaceholder = document.getElementById('previewPlaceholder');
const videoMeta = document.getElementById('videoMeta');
const statsEl = document.getElementById('stats');
const chunkListEl = document.getElementById('chunkList');

function setStatus(message, type = 'info') {
  statusEl.textContent = message;
  statusEl.dataset.type = type;
}

function getYouTubeId(url) {
  if (!url) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }

  try {
    const parsed = new URL(url);

    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '').slice(0, 11);
    }

    if (parsed.searchParams.get('v')) {
      return parsed.searchParams.get('v').slice(0, 11);
    }

    const pathMatch = parsed.pathname.match(/\/(embed|shorts)\/([a-zA-Z0-9_-]{11})/);
    if (pathMatch) {
      return pathMatch[2];
    }
  } catch {
    return null;
  }

  return null;
}

function updatePreview(url) {
  const videoId = getYouTubeId(url);

  if (!videoId) {
    previewPlayer.removeAttribute('src');
    previewPlayer.style.display = 'none';
    previewPlaceholder.style.display = 'block';
    videoMeta.textContent = '';
    return;
  }

  previewPlayer.src = `https://www.youtube.com/embed/${videoId}`;
  previewPlayer.style.display = 'block';
  previewPlaceholder.style.display = 'none';
  videoMeta.textContent = `Video ID: ${videoId}`;
}

function formatTime(value) {
  const raw = Number(value || 0);
  const seconds = raw > 10000 ? Math.floor(raw / 1000) : Math.floor(raw);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderStats(text) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const chars = text.length;

  statsEl.innerHTML = `
    <div class="stat-item"><span>Kelime</span><strong>${words}</strong></div>
    <div class="stat-item"><span>Karakter</span><strong>${chars}</strong></div>
  `;
}

function renderChunks(chunks) {
  if (!chunks.length) {
    chunkListEl.innerHTML = '<p class="empty">Parça bulunamadı.</p>';
    return;
  }

  chunkListEl.innerHTML = chunks
    .map(
      (chunk) => `
      <article class="chunk-item">
        <span class="time">${formatTime(chunk.offset)}</span>
        <p>${chunk.text}</p>
      </article>
    `
    )
    .join('');
}

urlInput.addEventListener('input', () => {
  updatePreview(urlInput.value.trim());
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const url = formData.get('url')?.toString().trim();

  resultEl.value = '';
  statsEl.innerHTML = '';
  chunkListEl.innerHTML = '';
  updatePreview(url);
  setStatus('Transcript aliniyor...', 'info');

  try {
    const response = await fetch('/api/transcript', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Transcript alinamadi.');
    }

    resultEl.value = data.text;
    renderStats(data.text);
    renderChunks(data.chunks);
    setStatus(`Tamamlandi. ${data.chunks.length} parcadan transcript cekildi.`, 'success');
  } catch (error) {
    setStatus(error.message || 'Bir hata olustu.', 'error');
  }
});

copyBtn.addEventListener('click', async () => {
  if (!resultEl.value) return;

  await navigator.clipboard.writeText(resultEl.value);
  setStatus('Transcript panoya kopyalandi.', 'success');
});
