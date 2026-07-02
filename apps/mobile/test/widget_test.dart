import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mytuums_mobile/src/api/mobile_api.dart';
import 'package:mytuums_mobile/src/api/session_cookie_store.dart';
import 'package:mytuums_mobile/src/app_state.dart';
import 'package:mytuums_mobile/src/mobile_config.dart';
import 'package:mytuums_mobile/src/mytuums_mobile_app.dart';
import 'package:mytuums_mobile/src/mobile_theme.dart';
import 'package:mytuums_mobile/src/screens/app_home_screen.dart';
import 'package:shadcn_flutter/shadcn_flutter.dart';

void main() {
  testWidgets('bottom navigation spans the footer and changes surfaces', (
    tester,
  ) async {
    _setPhoneViewport(tester);
    final state = _signedInState();

    await _pumpScopedApp(tester, state, const AppHomeScreen());

    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Discover'), findsOneWidget);
    expect(find.text('Post'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
    expect(find.text('Tune For You with favorite games'), findsOneWidget);
    expect(find.text('Elden Ring'), findsOneWidget);
    expect(find.text('1 like'), findsOneWidget);
    expect(find.text('2 comments'), findsOneWidget);

    final homeCenter = tester.getCenter(find.text('Home'));
    final profileCenter = tester.getCenter(find.text('Profile'));
    expect(profileCenter.dx - homeCenter.dx, greaterThan(240));

    await tester.tap(find.text('Discover'));
    await _pumpUi(tester);

    expect(
      find.text('Find players, games, and the posts around them.'),
      findsOneWidget,
    );
  });

  testWidgets('system themes expose light and dark web token schemes', (
    tester,
  ) async {
    expect(MobileTheme.lightTheme.colorScheme.brightness, Brightness.light);
    expect(MobileTheme.darkTheme.colorScheme.brightness, Brightness.dark);
    expect(MobileTheme.lightTheme.colorScheme.primary, const Color(0xFFC6005C));
    expect(MobileTheme.darkTheme.colorScheme.primary, const Color(0xFFA3004C));

    late ColorScheme captured;
    await tester.pumpWidget(
      ShadcnApp(
        theme: MobileTheme.lightTheme,
        darkTheme: MobileTheme.darkTheme,
        themeMode: ThemeMode.dark,
        home: Builder(
          builder: (context) {
            captured = Theme.of(context).colorScheme;
            return const SizedBox();
          },
        ),
      ),
    );

    expect(captured.brightness, Brightness.dark);
    expect(captured.primary, MobileTheme.darkColorScheme.primary);
  });

  testWidgets(
    'composer shows counter, disables invalid post, and loads games',
    (tester) async {
      _setPhoneViewport(tester);
      final state = _signedInState();

      await _pumpScopedApp(tester, state, const AppHomeScreen());
      await tester.tap(find.text('Post'));
      await _pumpUi(tester);

      expect(find.text('Share a public post'), findsOneWidget);
      expect(find.text('0 / 500'), findsOneWidget);
      expect(find.text('Attach an image'), findsOneWidget);

      var postButton = tester.widget<PrimaryButton>(
        find.widgetWithText(PrimaryButton, 'Post'),
      );
      expect(postButton.onPressed, isNull);

      await tester.enterText(find.byType(TextArea), 'Hello pilots');
      await tester.pump();

      expect(find.text('12 / 500'), findsOneWidget);
      postButton = tester.widget<PrimaryButton>(
        find.widgetWithText(PrimaryButton, 'Post'),
      );
      expect(postButton.onPressed, isNotNull);

      await tester.enterText(find.byType(TextArea), 'a' * 501);
      await tester.pump();

      expect(find.text('501 / 500'), findsOneWidget);
      postButton = tester.widget<PrimaryButton>(
        find.widgetWithText(PrimaryButton, 'Post'),
      );
      expect(postButton.onPressed, isNull);
    },
  );

  testWidgets('media attachment panel exposes remove flow', (tester) async {
    var removed = false;
    await tester.pumpWidget(
      ShadcnApp(
        theme: MobileTheme.lightTheme,
        darkTheme: MobileTheme.darkTheme,
        home: MediaAttachmentPanel(
          mediaName: 'preview.png',
          mediaPath: 'preview.png',
          uploading: false,
          onPick: () {},
          onRemove: () => removed = true,
          showPreview: false,
        ),
      ),
    );
    await tester.pump();

    expect(find.text('preview.png'), findsOneWidget);
    expect(find.text('Remove attachment'), findsOneWidget);

    await tester.tap(find.text('Remove attachment'));
    expect(removed, isTrue);
  });

  testWidgets('discover groups user and game results from the mobile API', (
    tester,
  ) async {
    _setPhoneViewport(tester);
    final state = _signedInState();

    await _pumpScopedApp(tester, state, const AppHomeScreen());
    await tester.tap(find.text('Discover'));
    await _pumpUi(tester);
    await tester.enterText(find.byType(TextField), 'ad');
    await tester.tap(find.widgetWithText(PrimaryButton, 'Search'));
    await _pumpUi(tester);

    expect(find.text('Users'), findsOneWidget);
    expect(find.text('Games'), findsOneWidget);
    expect(find.text('Ada'), findsOneWidget);
    expect(find.text('@ada'), findsOneWidget);
    expect(find.text('Lancer Tactics'), findsOneWidget);
  });
}

Future<void> _pumpScopedApp(WidgetTester tester, AppState state, Widget child) {
  return tester.pumpWidget(
    ShadcnApp(
      theme: MobileTheme.lightTheme,
      darkTheme: MobileTheme.darkTheme,
      themeMode: ThemeMode.light,
      home: AppScope(state: state, child: child),
    ),
  );
}

Future<void> _pumpUi(WidgetTester tester) async {
  await tester.pump();
  await tester.pump(const Duration(milliseconds: 300));
}

AppState _signedInState() {
  final state = AppState(
    api: MobileApi(
      config: const MobileConfig(
        apiBaseUrl: 'http://mobile.test',
        verifyEmailCallbackUrl: 'mytuums://auth/verify-email',
        resetPasswordCallbackUrl: 'mytuums://auth/reset-password',
      ),
      cookieStore: _MemoryCookieStore(),
      client: _FakeMobileClient(),
    ),
  );
  state.phase = AppPhase.signedIn;
  state.sessionState = {
    'kind': 'active_onboarded_profile',
    'profile': {
      'username': 'tester',
      'displayName': 'Tester',
      'bio': 'Testing the mobile shell.',
    },
  };
  state.activeFeed = {
    'items': [
      {
        'publicId': 'post_00000001',
        'text': 'What are you playing right now?',
        'author': {'username': 'ada', 'displayName': 'Ada', 'avatarUrl': null},
        'gameTag': {'id': 'game-1', 'slug': 'elden-ring', 'name': 'Elden Ring'},
        'media': null,
        'likeCount': 1,
        'likedByViewer': false,
        'commentCount': 2,
      },
    ],
    'context': {'kind': 'for_you', 'hasFavoriteGames': false},
  };
  return state;
}

void _setPhoneViewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

class _MemoryCookieStore implements SessionCookieStore {
  String? header;

  @override
  Future<void> clear() async {
    header = null;
  }

  @override
  Future<String?> readCookieHeader() async => header;

  @override
  Future<void> saveSetCookieHeader(String? setCookieHeader) async {
    header = setCookieHeader;
  }
}

class _FakeMobileClient extends http.BaseClient {
  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final path = request.url.path;
    if (path == '/api/mobile/v1/games') {
      return _jsonResponse([
        {'id': 'game-1', 'slug': 'elden-ring', 'name': 'Elden Ring'},
        {'id': 'game-2', 'slug': 'lancer-tactics', 'name': 'Lancer Tactics'},
      ]);
    }

    if (path == '/api/mobile/v1/search') {
      return _jsonResponse({
        'users': [
          {
            'id': 'user-1',
            'href': '/@ada',
            'label': 'Ada',
            'username': 'ada',
            'type': 'user',
          },
        ],
        'games': [
          {
            'id': 'game-2',
            'href': '/game/lancer-tactics',
            'label': 'Lancer Tactics',
            'slug': 'lancer-tactics',
            'type': 'game',
          },
        ],
      });
    }

    return _jsonResponse({});
  }

  http.StreamedResponse _jsonResponse(Object body) {
    final bytes = utf8.encode(jsonEncode(body));
    return http.StreamedResponse(
      Stream<List<int>>.value(bytes),
      200,
      headers: {'content-type': 'application/json'},
    );
  }
}
