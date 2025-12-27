# clarionot (Web + PWA)

clarionot: Link & notlarını kaydet, etiketle, aramayla anında bul.

## 1) Kurulum

```bash
npm install
cp .env.example .env.local
npm run dev
```

## 2) Supabase kurulumu (5 dk)

1. Supabase'de yeni proje oluştur
2. SQL Editor → `supabase/schema.sql` içeriğini çalıştır
3. Project Settings → API:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     değerlerini `.env.local` içine koy

## 3) Deploy

- Vercel'e import et
- Environment Variables'a aynı `.env.local` değerlerini ekle

## Notlar

- İlk MVP: link + not + etiket + arama
- Ödeme / Pro planı sonraki adım (Stripe/Iyzico eklenebilir)
