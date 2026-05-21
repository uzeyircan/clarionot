# ClarioNot Mobile

Bu proje Capacitor ile Android ve iOS uygulamasi olarak paketlenir. Mobil kabuk varsayilan olarak canli web uygulamasini acar:

```txt
https://clarionot.com
```

Bu tercih Next.js API route'lari, Supabase auth ve odeme akislarini mobil pakette statik export'a zorlamadan calistirir.

## Su An Neden Calismiyor?

Android APK derleniyor, fakat cihaz/emulator tarafinda hedef yoksa uygulama calismaz.

Bu makinede kontrol edilen durum:

- `android/` projesi var.
- Debug APK uretiliyor.
- Android SDK kurulu.
- `adb` sistem PATH'inde degil.
- `Pixel_4_XL` emulator tanimi var, fakat su an calisan/ bagli cihaz gorunmuyor.
- `ios/` projesi yok; App Store build'i icin macOS + Xcode gerekiyor.

Android'de calistirmak icin:

```powershell
$env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
npm run android:run
```

Alternatif olarak Android Studio'yu acip `Pixel_4_XL` emulatorunu baslatin:

```bash
npm run android
```

## Gereksinimler

Android:

- Node.js ve npm
- Android Studio
- Android SDK
- JDK 17 veya Android Studio'nun bundled JDK'si
- En az bir Android emulator veya USB debugging acik fiziksel cihaz

iOS:

- macOS
- Xcode
- Apple Developer Program hesabi
- App Store Connect erisimi
- CocoaPods

## Android'i Acma

```bash
npm install
npm run android:sync
npm run android
```

Android Studio acildiktan sonra bir emulator veya fiziksel cihaz secip uygulamayi calistirin.

## iOS Projesi Olusturma

Bu adim Windows'ta degil, Mac uzerinde yapilmalidir:

```bash
npm install
npm run ios:add
npm run ios:sync
npm run ios
```

Xcode acildiktan sonra:

- Bundle Identifier: `com.clarionot.app`
- Signing Team: Apple Developer hesabiniz
- Deployment target: App Store hedefinize uygun iOS surumu

## Farkli Bir Web URL ile Paketleme

Staging veya lokal bir sunucuya baglamak icin:

```bash
CAPACITOR_SERVER_URL=https://staging.example.com npm run android:sync
```

Windows PowerShell:

```powershell
$env:CAPACITOR_SERVER_URL="https://staging.example.com"; npm run android:sync
```

## Play Store Icin AAB Uretme

Android Studio icinde:

```txt
Build > Generate Signed Bundle / APK > Android App Bundle
```

Paket adi:

```txt
com.clarionot.app
```

Play Store'a debug APK yuklenmez. Release imzali `.aab` yuklenmelidir.

## App Store Icin Archive Uretme

Mac uzerinde Xcode icinde:

```txt
Product > Archive > Distribute App > App Store Connect
```

App Store'a Android'deki APK/AAB yuklenmez. iOS icin Xcode archive gerekir.
