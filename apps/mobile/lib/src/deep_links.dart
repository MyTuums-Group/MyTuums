import 'dart:async';

import 'package:app_links/app_links.dart';
import 'package:mytuums_mobile/src/app_state.dart';

class DeepLinkController {
  DeepLinkController(this._state);

  final AppState _state;
  final AppLinks _appLinks = AppLinks();
  StreamSubscription<Uri>? _subscription;

  Future<void> start() async {
    final initialUri = await _appLinks.getInitialLink();
    if (initialUri != null) {
      await handle(initialUri);
    }
    _subscription = _appLinks.uriLinkStream.listen(handle);
  }

  Future<void> handle(Uri uri) async {
    if (uri.scheme != 'mytuums' || uri.host != 'auth') return;
    final token = uri.queryParameters['token'];
    if (token == null || token.isEmpty) return;

    if (uri.path == '/verify-email') {
      await _state.verifyEmailToken(token);
    }
    if (uri.path == '/reset-password') {
      _state.openResetPassword(token);
    }
  }

  Future<void> dispose() async {
    await _subscription?.cancel();
  }
}
