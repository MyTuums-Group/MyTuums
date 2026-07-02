import 'package:mytuums_mobile/src/api/mobile_api.dart';
import 'package:mytuums_mobile/src/api/session_cookie_store.dart';
import 'package:mytuums_mobile/src/app_state.dart';
import 'package:mytuums_mobile/src/deep_links.dart';
import 'package:mytuums_mobile/src/mobile_config.dart';
import 'package:mytuums_mobile/src/mobile_theme.dart';
import 'package:mytuums_mobile/src/screens/app_home_screen.dart';
import 'package:mytuums_mobile/src/screens/auth_screens.dart';
import 'package:mytuums_mobile/src/screens/onboarding_screen.dart';
import 'package:shadcn_flutter/shadcn_flutter.dart';

class MyTuumsMobileApp extends StatefulWidget {
  const MyTuumsMobileApp({super.key});

  @override
  State<MyTuumsMobileApp> createState() => _MyTuumsMobileAppState();
}

class _MyTuumsMobileAppState extends State<MyTuumsMobileApp> {
  late final AppState _state;
  late final DeepLinkController _deepLinks;

  @override
  void initState() {
    super.initState();
    final api = MobileApi(
      config: MobileConfig.fromEnvironment(),
      cookieStore: SecureSessionCookieStore(),
    );
    _state = AppState(api: api);
    _deepLinks = DeepLinkController(_state);
    _state.bootstrap();
    _deepLinks.start();
  }

  @override
  void dispose() {
    _deepLinks.dispose();
    _state.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ShadcnApp(
      title: 'MyTuums',
      theme: MobileTheme.lightTheme,
      darkTheme: MobileTheme.darkTheme,
      themeMode: ThemeMode.system,
      home: AnimatedBuilder(
        animation: _state,
        builder: (context, _) =>
            AppScope(state: _state, child: _phaseScreen(_state.phase)),
      ),
    );
  }

  Widget _phaseScreen(AppPhase phase) {
    return switch (phase) {
      AppPhase.booting => const SplashScreen(),
      AppPhase.signedOut => const LoginScreen(),
      AppPhase.verifyEmail => const VerifyEmailScreen(),
      AppPhase.onboarding => const OnboardingScreen(),
      AppPhase.signedIn => const AppHomeScreen(),
      AppPhase.resetPassword => const ResetPasswordScreen(),
    };
  }
}

class AppScope extends InheritedWidget {
  const AppScope({required this.state, required super.child, super.key});

  final AppState state;

  static AppState of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope is missing.');
    return scope!.state;
  }

  @override
  bool updateShouldNotify(AppScope oldWidget) => state != oldWidget.state;
}
