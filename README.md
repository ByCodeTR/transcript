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
- Opsiyonel dil kodu (`tr`, `en` gibi)
- Tek parça düz metin olarak çıktı
- Panoya kopyala butonu

## API

`POST /api/transcript`

Body örneği:

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "lang": "en"
}
```
