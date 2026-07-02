import 'package:flutter_secure_storage/flutter_secure_storage.dart';

abstract class SessionCookieStore {
  Future<String?> readCookieHeader();
  Future<void> saveSetCookieHeader(String? setCookieHeader);
  Future<void> clear();
}

class SecureSessionCookieStore implements SessionCookieStore {
  SecureSessionCookieStore({
    FlutterSecureStorage storage = const FlutterSecureStorage(),
  }) : this._(storage);

  SecureSessionCookieStore._(this._storage);

  static const _storageKey = 'mytuums.session.cookies';
  final FlutterSecureStorage _storage;

  @override
  Future<String?> readCookieHeader() => _storage.read(key: _storageKey);

  @override
  Future<void> saveSetCookieHeader(String? setCookieHeader) async {
    if (setCookieHeader == null || setCookieHeader.isEmpty) return;

    final cookies = <String, String>{};
    final currentHeader = await readCookieHeader();
    if (currentHeader != null && currentHeader.isNotEmpty) {
      for (final cookie in currentHeader.split(';')) {
        final parts = cookie.trim().split('=');
        if (parts.length >= 2) {
          cookies[parts.first] = parts.sublist(1).join('=');
        }
      }
    }

    for (final setCookie in _splitSetCookie(setCookieHeader)) {
      final pair = setCookie.split(';').first.trim();
      final separator = pair.indexOf('=');
      if (separator <= 0) continue;
      cookies[pair.substring(0, separator)] = pair.substring(separator + 1);
    }

    await _storage.write(
      key: _storageKey,
      value: cookies.entries
          .map((entry) => '${entry.key}=${entry.value}')
          .join('; '),
    );
  }

  @override
  Future<void> clear() => _storage.delete(key: _storageKey);

  List<String> _splitSetCookie(String header) {
    return header.split(RegExp(r',\s*(?=[^;,]+=)'));
  }
}
