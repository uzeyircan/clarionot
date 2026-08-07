# ClarioNot Mobile

Bu proje Capacitor ile Android ve iOS uygulamasi olarak paketlenir. Mobil kabuk varsayilan olarak canli web uygulamasini acar:

```txt
https://clarionot.com
```

Bu tercih Next.js API route'lari, Supabase auth ve odeme akislarini mobil pakette statik export'a zorlamadan calistirir.

## Android Gelistirme Durumu (Dogrulandi)

Bu makinede asagidaki adimlar fiilen calistirilip dogrulandi:

- `android/` projesi var; `npx cap sync android` basarili.
- Java: ayri bir JDK kurulu degil, Android Studio'nun bundled JBR'i (`Android Studio.app/Contents/jbr`) `JAVA_HOME` olarak kullanildi ve build'ler bununla calisti.
- Android SDK `~/Library/Android/sdk` altinda kurulu; `adb` bu SDK icinde (`platform-tools/adb`) calisiyor ama sistem PATH'inde degil.
- `./gradlew assembleDebug` basarili, `app-debug.apk` uretiliyor.
- `./gradlew bundleRelease` basarili (yerel `android/key.properties` + gecerli keystore mevcutken), imzali `app-release.aab` uretiliyor ve imza `jarsigner -verify` ile dogrulandi.
- Mevcut/kullanilabilir AVD: `Medium_Phone_API_36.1` (onceki `Pixel_4_XL` referansi bu makinede artik gecerli degil).
- Debug APK bu AVD'ye kuruldu ve `com.clarionot.app/.MainActivity` ile acildi: uygulama crash/beyaz ekran olmadan canli web ana sayfasini (giris yapilmamis misafir gorunumu) gosterdi. Durdur + yeniden baslat testinde de crash, beyaz ekran veya sonsuz yukleme gozlenmedi.
- Giris, oturum kalıcılığı ve dashboard akislari bu testte DENENMEDI; kullanici tarafindan manuel dogrulanmali.
- `ios/` projesi repoda mevcut (Capacitor ile eklenmis). Derleme ve imzalama icin macOS + Xcode gerekiyor; bu henuz dogrulanmadi.

Android'de calistirmak icin:

```powershell
$env:Path += ";$env:LOCALAPPDATA\Android\Sdk\platform-tools"
npm run android:run
```

Alternatif olarak Android Studio'yu acip `Medium_Phone_API_36.1` emulatorunu baslatin:

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

## iOS Projesini Acma

`ios/` klasoru repoda zaten mevcut (Capacitor ile eklenmis), bu yuzden `npm run ios:add` tekrar calistirilmamali. Bu adim Windows'ta degil, Mac uzerinde yapilmalidir:

```bash
npm install
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

## Android Release Signing

Release build'i imzalamak icin gereken keystore repoda tutulmaz ve repo icinde olusturulmaz. Kurulum:

1. Keystore'u repo disinda, guvenli bir klasorde uretin. Bu ortamda `android/key.properties` icinde referans verilen keystore'un varligi Gradle uzerinden dogrulandi (mutlak yol ve sifreler bu dokumana yazilmaz).
2. `android/key.properties.example` dosyasini `android/key.properties` olarak kopyalayin ve gercek `storeFile` (mutlak yol), `storePassword`, `keyAlias`, `keyPassword` degerlerini bu yerel dosyaya yazin.
3. `android/key.properties` ve `.jks`/`.keystore` dosyalari `.gitignore` icinde oldugu icin commit edilmez; yalnizca yerel makinede/CI secret store'da tutulur.
4. Keystore'un sifreli bir yedegini (ör. sifre yoneticisi veya guvenli bulut depolama) saklayin — kaybolursa Play Store'daki uygulamayi guncelleyemezsiniz.

`android/key.properties` yoksa release build Gradle tarafinda acik bir hata ile durur (sessizce debug anahtariyla imzalanmaz). Debug build bu yapilandirmadan etkilenmez.

Release AAB uretmek icin (key.properties hazir oldugunda):

```bash
cd android
./gradlew bundleRelease
```

Alternatif olarak Android Studio icinde:

```txt
Build > Generate Signed Bundle / APK > Android App Bundle
```

Paket adi:

```txt
com.clarionot.app
```

Play Store'a debug APK yuklenmez. Release imzali `.aab` yuklenmelidir. Bu ortamda `./gradlew bundleRelease` calistirilip basarili oldu; uretilen `app-release.aab` imzali oldugu `jarsigner -verify` ile dogrulandi (bkz. yukaridaki "Android Gelistirme Durumu"). Play Store'a henuz yukleme yapilmadi.

## App Store Icin Archive Uretme

Mac uzerinde Xcode icinde:

```txt
Product > Archive > Distribute App > App Store Connect
```

App Store'a Android'deki APK/AAB yuklenmez. iOS icin Xcode archive gerekir.
