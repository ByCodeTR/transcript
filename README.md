# YouTube Transcript (Hızlı MVP)

YouTube linkinden transcript metni çekmek için basit bir web uygulaması.

## Kurulum

```bash
npm install
```

## Çalıştırma

```bash
npm start
```

Tarayıcıdan aç:

- http://localhost:3000

## Özellikler

- YouTube URL gir, transcript çek
- Tek parça düz metin olarak çıktı
- Panoya kopyala butonu

## API

`POST /api/transcript`

Body örneği:

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
```

## Railway Deploy

1. Railway dashboard'da `New Project` -> `Deploy from GitHub Repo`.
2. Repo olarak `ByCodeTR/transcript` sec.
3. Service acildiginda `railway.json` otomatik okunur.
4. Deploy tamamlaninca verilen `*.up.railway.app` URL'yi ac.
