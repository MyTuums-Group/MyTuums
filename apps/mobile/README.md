# MyTuums Mobile MVP

Flutter Android/iOS companion app for the MyTuums MVP.

## Scope

- Complete auth: register, email verification deep link, login, forgot/reset password, persisted session, logout.
- Onboarding: username required, display name, bio, avatar media id, favorite games optional.
- Core app surfaces: feeds, discover/search, post detail/comments, composer, profile/follow, report sheet.
- Android and iOS only. Flutter desktop is intentionally out of scope.

## Local Setup

Install Flutter, then from this directory run:

```bash
flutter create --platforms=android,ios .
flutter pub get
flutter analyze
flutter test
```

The source files and mobile deep-link manifests are committed here. If `flutter create` rewrites native host files, keep the deep-link entries from:

- `android/app/src/main/AndroidManifest.xml`
- `ios/Runner/Info.plist`

Run against the local API:

```bash
flutter run --dart-define=MYTUUMS_API_BASE_URL=http://10.0.2.2:4000
```

Use `http://localhost:4000` for iOS simulator and `http://10.0.2.2:4000` for Android emulator.
