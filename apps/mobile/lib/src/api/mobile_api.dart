import 'dart:convert';

import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:mytuums_mobile/src/api/session_cookie_store.dart';
import 'package:mytuums_mobile/src/mobile_config.dart';

class MobileApi {
  MobileApi({
    required MobileConfig config,
    required SessionCookieStore cookieStore,
    http.Client? client,
  }) : this._(config: config, cookieStore: cookieStore, client: client);

  MobileApi._({
    required this._config,
    required this._cookieStore,
    http.Client? client,
  }) : _client = client ?? http.Client();

  final MobileConfig _config;
  final SessionCookieStore _cookieStore;
  final http.Client _client;

  Future<Map<String, dynamic>> session() {
    return _sendJson('GET', '/api/mobile/v1/session');
  }

  Future<void> signUp({required String email, required String password}) async {
    await _sendJson(
      'POST',
      '/api/auth/sign-up/email',
      body: {
        'email': email,
        'password': password,
        'name': email.split('@').first,
        'callbackURL': _config.verifyEmailCallbackUrl,
      },
    );
  }

  Future<void> verifyEmailToken(String token) async {
    await _sendJson(
      'GET',
      '/api/auth/verify-email',
      query: {'token': token, 'callbackURL': _config.verifyEmailCallbackUrl},
      followRedirects: false,
    );
  }

  Future<void> signIn({required String email, required String password}) async {
    await _sendJson(
      'POST',
      '/api/auth/sign-in/email',
      body: {'email': email, 'password': password},
    );
  }

  Future<void> forgotPassword(String email) async {
    await _sendJson(
      'POST',
      '/api/auth/forget-password',
      body: {'email': email, 'redirectTo': _config.resetPasswordCallbackUrl},
    );
  }

  Future<void> resetPassword({
    required String token,
    required String newPassword,
  }) async {
    await _sendJson(
      'POST',
      '/api/auth/reset-password',
      body: {'token': token, 'newPassword': newPassword},
    );
  }

  Future<void> signOut() async {
    try {
      await _sendJson('POST', '/api/auth/sign-out');
    } finally {
      await _cookieStore.clear();
    }
  }

  Future<Map<String, dynamic>> submitOnboarding({
    required String username,
    String? displayName,
    String? bio,
    String? avatarMediaId,
    List<String> favoriteGameIds = const [],
  }) {
    return _sendJson(
      'POST',
      '/api/mobile/v1/onboarding',
      body: {
        'username': username,
        if (displayName != null && displayName.isNotEmpty)
          'displayName': displayName,
        if (bio != null && bio.isNotEmpty) 'bio': bio,
        if (avatarMediaId != null && avatarMediaId.isNotEmpty)
          'avatarMediaId': avatarMediaId,
        'favoriteGameIds': favoriteGameIds,
      },
    );
  }

  Future<Map<String, dynamic>> usernameAvailability(String username) {
    return _sendJson(
      'GET',
      '/api/mobile/v1/username-availability',
      query: {'username': username},
    );
  }

  Future<Map<String, dynamic>> forYouFeed({String? cursor}) {
    return _sendJson(
      'GET',
      '/api/mobile/v1/feed/for-you',
      query: {'cursor': ?cursor, 'limit': '20'},
    );
  }

  Future<Map<String, dynamic>> followingFeed({String? cursor}) {
    return _sendJson(
      'GET',
      '/api/mobile/v1/feed/following',
      query: {'cursor': ?cursor, 'limit': '20'},
    );
  }

  Future<Map<String, dynamic>> discoverPosts({String? game}) {
    return _sendJson(
      'GET',
      '/api/mobile/v1/discover/posts',
      query: {if (game != null && game.isNotEmpty) 'game': game, 'limit': '20'},
    );
  }

  Future<List<Map<String, dynamic>>> games() async {
    final response = await _sendJson('GET', '/api/mobile/v1/games');
    final data = response['data'];
    if (data is List) {
      return data.whereType<Map<String, dynamic>>().toList();
    }
    return [];
  }

  Future<Map<String, dynamic>> search(String query) {
    return _sendJson(
      'GET',
      '/api/mobile/v1/search',
      query: {'query': query, 'limit': '20'},
    );
  }

  Future<Map<String, dynamic>> postDetail(String publicId) {
    return _sendJson('GET', '/api/mobile/v1/posts/$publicId');
  }

  Future<Map<String, dynamic>> comments(String publicId) {
    return _sendJson('GET', '/api/mobile/v1/posts/$publicId/comments');
  }

  Future<Map<String, dynamic>> createPost({
    required String text,
    String? mediaAttachmentId,
    String? gameTagId,
  }) {
    return _sendJson(
      'POST',
      '/api/mobile/v1/posts',
      body: {
        'text': text,
        'mediaAttachmentId': ?mediaAttachmentId,
        'gameTagId': ?gameTagId,
      },
    );
  }

  Future<String> uploadPostImage(XFile file) async {
    final byteSize = await file.length();
    final mimeType = file.mimeType ?? _mimeTypeFromName(file.name);
    final intent = await _sendJson(
      'POST',
      '/api/mobile/v1/media/uploads',
      body: {
        'mimeType': mimeType,
        'byteSize': byteSize,
        'purpose': 'post_attachment',
      },
    );
    final mediaId = intent['mediaId']?.toString();
    final uploadUrl = intent['uploadUrl']?.toString();
    if (mediaId == null || uploadUrl == null) {
      throw MobileApiException(
        'Upload intent response is incomplete.',
        statusCode: 500,
      );
    }

    await _uploadBlob(
      uploadUrl: uploadUrl,
      file: file,
      mimeType: mimeType,
      byteSize: byteSize,
    );
    await _sendJson('POST', '/api/mobile/v1/media/uploads/$mediaId/confirm');
    return mediaId;
  }

  Future<Map<String, dynamic>> createComment({
    required String publicId,
    required String text,
  }) {
    return _sendJson(
      'POST',
      '/api/mobile/v1/posts/$publicId/comments',
      body: {'text': text},
    );
  }

  Future<Map<String, dynamic>> togglePostLike(String publicId) {
    return _sendJson('POST', '/api/mobile/v1/posts/$publicId/like-toggle');
  }

  Future<Map<String, dynamic>> profile(String username) {
    return _sendJson('GET', '/api/mobile/v1/profiles/$username');
  }

  Future<Map<String, dynamic>> toggleFollow(String username) {
    return _sendJson('POST', '/api/mobile/v1/profiles/$username/follow-toggle');
  }

  Future<Map<String, dynamic>> report({
    required Map<String, dynamic> target,
    required String reason,
    String? notes,
  }) {
    return _sendJson(
      'POST',
      '/api/mobile/v1/reports',
      body: {
        'target': target,
        'reason': reason,
        if (notes != null && notes.isNotEmpty) 'notes': notes,
      },
    );
  }

  Future<Map<String, dynamic>> _sendJson(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? query,
    bool followRedirects = true,
  }) async {
    final uri = _uri(path, query);
    final request = http.Request(method, uri);
    request.followRedirects = followRedirects;
    request.headers['accept'] = 'application/json';
    final cookieHeader = await _cookieStore.readCookieHeader();
    if (cookieHeader != null && cookieHeader.isNotEmpty) {
      request.headers['cookie'] = cookieHeader;
    }
    if (body != null) {
      request.headers['content-type'] = 'application/json';
      request.body = jsonEncode(body);
    }

    final streamedResponse = await _client.send(request);
    await _cookieStore.saveSetCookieHeader(
      streamedResponse.headers['set-cookie'],
    );
    final response = await http.Response.fromStream(streamedResponse);
    if (response.statusCode >= 400) {
      throw MobileApiException.fromResponse(response);
    }
    if (response.body.isEmpty) return <String, dynamic>{};
    final decoded = jsonDecode(response.body);
    return decoded is Map<String, dynamic> ? decoded : {'data': decoded};
  }

  Future<void> _uploadBlob({
    required String uploadUrl,
    required XFile file,
    required String mimeType,
    required int byteSize,
  }) async {
    final request = http.StreamedRequest('PUT', Uri.parse(uploadUrl));
    request.headers['x-ms-blob-type'] = 'BlockBlob';
    request.headers['content-type'] = mimeType;
    request.contentLength = byteSize;
    await request.sink.addStream(file.openRead());
    await request.sink.close();

    final response = await _client.send(request);
    if (response.statusCode >= 400) {
      throw MobileApiException(
        'Storage upload failed.',
        statusCode: response.statusCode,
      );
    }
  }

  Uri _uri(String path, Map<String, String>? query) {
    final base = Uri.parse(_config.apiBaseUrl);
    return base.replace(
      path: path,
      queryParameters: query?.isEmpty ?? true ? null : query,
    );
  }

  String _mimeTypeFromName(String name) {
    final lower = name.toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    return 'image/png';
  }
}

class MobileApiException implements Exception {
  MobileApiException(this.message, {required this.statusCode, this.code});

  factory MobileApiException.fromResponse(http.Response response) {
    try {
      final decoded = jsonDecode(response.body);
      final error = decoded is Map<String, dynamic> ? decoded['error'] : null;
      if (error is Map<String, dynamic>) {
        return MobileApiException(
          error['message']?.toString() ?? 'Request failed.',
          statusCode: response.statusCode,
          code: error['code']?.toString(),
        );
      }
    } catch (_) {
      // Use the generic message below.
    }
    return MobileApiException(
      'Request failed with status ${response.statusCode}.',
      statusCode: response.statusCode,
    );
  }

  final String message;
  final int statusCode;
  final String? code;

  @override
  String toString() => message;
}
