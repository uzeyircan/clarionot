# ClarioNot Development Guide

## Product

ClarioNot; kullanıcıların not ve bağlantı kaydetmesini, düzenlemesini, gruplamasını ve uzun süredir açılmayan kayıtları yeniden keşfetmesini sağlayan bir SaaS ürünüdür.

Ürünler aynı hesabı ve veriyi kullanır:

- Web: https://clarionot.com
- Chrome eklentisi: ClarioNot Clip
- Android/iOS: Capacitor tabanlı native kabuk
- Mobil ve web ayrı ürünler değildir; veriler Supabase üzerinden eş zamanlıdır.

Kısa vadeli öncelik mobil mağaza yayınıdır. Mobil yayın tamamlanmadan sosyal akış, oyun veya büyük yeni özelliklere başlanmaz. Notların sosyal biçimde paylaşılması mobil yayından sonraki ilk büyük ürün geliştirmesidir.

## Technology

- Next.js App Router
- React ve TypeScript
- TailwindCSS
- Supabase Auth, Postgres ve RLS
- Stripe web abonelikleri
- Netlify production deploy
- Capacitor 6 Android/iOS
- Chrome Extension, vanilla JavaScript

Production Android applicationId:

`com.clarionot.app`

Production Capacitor başlangıç adresi:

`https://clarionot.com/dashboard`

## Core Data

Başlıca tablolar:

- `items`
- `groups`
- `user_plan`
- `user_settings`
- `clip_tokens`
- `clip_monthly_usage`

Şema, foreign key, RLS, trigger veya kolon tipi konusunda tahmin yürütme. Migration yazmadan önce mevcut migrationları ve gerekiyorsa gerçek Supabase şemasını doğrula.

`items.last_viewed_at`, Unutulanlar özelliği için kullanılır. Bir kaydı açmak `last_viewed_at` değerini değiştirebilir fakat `updated_at` değerini değiştirmemelidir. Bu davranış kontrollü SQL testiyle doğrulanmıştır.

## Current Limits

- Free toplam kayıt limiti: 50
- Free Chrome eklentisi limiti: ayda 30
- Pro: eklentide sınırsız kullanım
- Free Unutulanlar süresi: 7 gün
- Pro Unutulanlar seçenekleri: 30/60/90 gün

Ekrandaki limitler ile sunucu tarafındaki limitler farklı kaynaklardan yönetilmemelidir. Mümkün olduğunda ortak sabit veya sunucu kaynağı kullan.

## Development Workflow

Her görevden önce:

1. `git status` ve ilgili `git diff` çıktısını incele.
2. Kullanıcının mevcut değişikliklerini belirle ve koru.
3. İlgili dosyaları oku.
4. Semptom yerine kök nedeni belirle.
5. Görev kapsamını netleştir.

Küçük ve açık değişikliklerde doğrudan uygulama yapılabilir.

Aşağıdaki durumlarda önce Plan Mode kullan:

- Auth ve yetkilendirme
- Supabase/RLS/migration
- Stripe ve abonelik
- Mobil native davranış
- Veri silme
- Birden fazla katmanı etkileyen değişiklik
- Kök nedeni kesinleşmemiş hata
- Mağaza kurallarını etkileyen değişiklik

Planlama görevi açıkça salt-okunur ise kullanıcı uygulama istemeden dosya değiştirme.

## Context Management

- Alakasız yeni göreve geçerken `/clear` kullan.
- Aynı görev uzayıp bağlam şişerse `/compact` kullan.
- Eski raporları tekrar tekrar bağlama yükleme.
- Büyük terminal çıktıları yerine ilgili satırları özetle.
- Aynı doğrulamayı gerekçe olmadan tekrar çalıştırma.

## Agents

Ajanları yalnızca bağımsız uzman görüşü gerçek değer katıyorsa kullan.

Normal sınır en fazla 2 ajandır.

Uygun roller:

- Backend Architect: Supabase, API, veri bütünlüğü
- Frontend Developer: React, Next.js, auth UI, responsive tasarım
- Mobile Release Engineer: Capacitor, Android/iOS, mağaza hazırlığı
- Test Automation Engineer: bağımsız test ve regresyon
- Code Reviewer: final diff incelemesi
- Application Security Engineer: auth, RLS, service-role, veri silme ve secret güvenliği

Kurallar:

- Basit metin/CSS değişikliğinde ajan kullanma.
- Birden fazla ajana aynı işi tekrar yaptırma.
- Ajanlar mümkün olduğunda salt-okunur çalışmalı.
- Ajan raporlarını körü körüne kabul etme; ana ajan kanıtları doğrulamalı.
- Ajanın GO kararı test yerine geçmez.
- Ajanların dosya düzenlemesine yalnızca görev açıkça gerektiriyorsa izin ver.

## Implementation Rules

- İstenen kapsamın dışına çıkma.
- Kullanıcının mevcut değişikliklerini geri alma.
- Tasarımı görev gerektirmedikçe değiştirme.
- Büyük refactor yerine küçük ve incelenebilir diff üret.
- Gerçek davranışı doğrulamadan pazarlama iddiası yazma.
- Web ve native davranışlarını açıkça ayır.
- Responsive CSS değişikliklerinin normal mobil webi de etkileyebileceğini unutma.
- Native kontrolü için mevcut merkezi `useIsNativeApp` yapısını kullan.
- Platform çözülmeden native/web effect'lerini yanlışlıkla çalıştırma.
- Geçici debug kodu, test URL'i veya console log bırakma.
- TypeScript hatasını `any`, ignore veya gevşek cast ile gizleme.
- Var olan API ve RLS güvenliğini zayıflatma.

## Authentication and Security

- Kullanıcı kimliğini request body veya query parametresinden güvenilir kabul etme.
- Kimliği doğrulanmış Supabase session/token üzerinden çöz.
- `SUPABASE_SERVICE_ROLE_KEY` yalnızca sunucu tarafında kullanılabilir.
- Service-role anahtarını istemci bundle'ına, loglara veya response'a koyma.
- RLS açık olsa bile tablo grant ve policy durumunu ayrıca doğrula.
- Hesap silme gibi işlemlerde kullanıcının yalnızca kendi hesabını silebildiğini kanıtla.
- Secret, token, parola, keystore içeriği veya kişisel giriş bilgisi yazdırma.
- Production veritabanına manuel işlem uygulamadan önce kullanıcı onayı al.

## Payments

- Web Stripe ödeme akışını görev gerektirmedikçe değiştirme.
- Native uygulamada dijital Pro aboneliğini harici Stripe checkout'a yönlendirmek mağaza riski taşıyabilir.
- Native ödeme davranışını değiştirmeden önce mağaza uyumluluğu analizi yap.
- Mevcut Pro kullanıcıların native uygulamada haklarını kullanması korunmalıdır.
- Fiyatı tahmin ederek veya kod içine sabitleyerek gösterme; mevcut tek fiyat kaynağını kullan.

## Mobile and Capacitor

Production değerleri korunmalıdır:

- URL: `https://clarionot.com/dashboard`
- `cleartext: false`
- `allowMixedContent: false`

Emülatör testi için geçici `10.0.2.2`, localhost veya `cleartext: true` kullanılabilir. Test sonunda:

1. Production config'i geri yükle.
2. `git diff capacitor.config.ts` ile temiz olduğunu doğrula.
3. `npx cap sync android` komutunu production config ile tekrar çalıştır.
4. Geçici network security config ve debug dosyalarını kaldır.
5. Emülatördeki APK'nın local mi production mı olduğunu raporda açıkça belirt.

Android geri tuşu sırası:

1. Açık modal/menü kapanır.
2. Root olmayan sayfada history back çalışır.
3. `/`, `/dashboard` ve `/login` root davranışında uygulama minimize edilir.
4. Uygulama zorla öldürülmez.

## Database and Migrations

Migration hazırlarken:

- Gerçek tablo ve kolon tiplerini doğrula.
- RLS, grants, policies ve function execute yetkilerini incele.
- Atomiklik ve eşzamanlı istekleri değerlendir.
- Güvenli rollback planı yaz.
- Migrationı otomatik olarak production'a uygulama.
- Uygulanmadıysa uygulanmış veya test edilmiş gibi raporlama.
- SQL Editor üzerinden kullanıcı tarafından yapılan işlemleri repo migrationıyla eşleştir.

Destructive SQL, auth user silme ve production migration için açık kullanıcı onayı gereklidir.

## Git and Permissions

Rutin olarak izin verilen işlemler:

- Dosya okuma ve arama
- Salt-okunur git komutları
- İstenen kapsam içindeki dosya düzenlemeleri
- TypeScript, build ve güvenli test komutları
- Geçici test dosyalarını repo dışında oluşturma

Aşağıdakiler için kullanıcıdan açık onay al:

- Commit
- Push veya force push
- Production deploy
- Production Supabase migration
- Veri silme veya destructive SQL
- Secret/env değerlerinde değişiklik
- Git geçmişini yeniden yazma
- Mağazaya APK/AAB/IPA yükleme
- Dış serviste ücret doğuran işlem

Gerçek projede `--dangerously-skip-permissions` veya benzeri tam yetki atlama seçeneklerini kullanma.

## Files Never to Commit

- `.env`
- `.env.local`
- `android/key.properties`
- `*.jks`
- `*.keystore`
- APK/AAB/IPA
- Android build outputs
- `android/local.properties`
- Supabase CLI cache
- Geçici emulator/network config
- Test hesabı bilgileri
- Secret içeren dosyalar

`tsconfig.tsbuildinfo` yalnızca build cache dosyasıdır. Görev kapsamında özellikle gerekmedikçe stage etme veya değiştirilmiş kullanıcı sürümünü geri alma.

## Verification

Kod değişikliği sonrası uygun olanları çalıştır:

```bash
npx tsc --noEmit
npm run build
git diff --check
```
