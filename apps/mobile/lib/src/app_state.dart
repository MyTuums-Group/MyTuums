import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:mytuums_mobile/src/api/mobile_api.dart';

enum AppPhase {
  booting,
  signedOut,
  verifyEmail,
  onboarding,
  signedIn,
  resetPassword,
}

class AppState extends ChangeNotifier {
  AppState({required MobileApi api}) : this._(api);

  AppState._(this._api);

  final MobileApi _api;
  AppPhase phase = AppPhase.booting;
  String? errorMessage;
  String? resetToken;
  Map<String, dynamic>? sessionState;
  Map<String, dynamic>? activeFeed;
  List<Map<String, dynamic>> activeGames = const [];

  Future<void> bootstrap() async {
    await _run(() async {
      final session = await _api.session();
      _applySession(session);
      if (phase == AppPhase.signedIn) {
        activeFeed = await _api.forYouFeed();
      }
    });
  }

  Future<void> register({
    required String email,
    required String password,
    required String confirmation,
    required bool ageConfirmed,
  }) async {
    if (!ageConfirmed) {
      _fail('Confirm that you are at least 15 years old.');
      return;
    }
    if (password != confirmation) {
      _fail('Passwords do not match.');
      return;
    }
    await _run(() async {
      await _api.signUp(email: email, password: password);
      phase = AppPhase.verifyEmail;
    });
  }

  Future<void> verifyEmailToken(String token) async {
    await _run(() async {
      await _api.verifyEmailToken(token);
      await bootstrap();
    });
  }

  Future<void> login({required String email, required String password}) async {
    await _run(() async {
      await _api.signIn(email: email, password: password);
      await bootstrap();
    });
  }

  Future<void> forgotPassword(String email) async {
    await _run(() => _api.forgotPassword(email));
  }

  void openResetPassword(String token) {
    resetToken = token;
    phase = AppPhase.resetPassword;
    notifyListeners();
  }

  Future<void> resetPassword({
    required String newPassword,
    required String confirmation,
  }) async {
    final token = resetToken;
    if (token == null) {
      _fail('Reset link is incomplete.');
      return;
    }
    if (newPassword != confirmation) {
      _fail('Passwords do not match.');
      return;
    }
    await _run(() async {
      await _api.resetPassword(token: token, newPassword: newPassword);
      resetToken = null;
      phase = AppPhase.signedOut;
    });
  }

  Future<void> completeOnboarding({
    required String username,
    String? displayName,
    String? bio,
  }) async {
    await _run(() async {
      await _api.submitOnboarding(
        username: username,
        displayName: displayName,
        bio: bio,
      );
      await bootstrap();
    });
  }

  Future<void> refreshForYouFeed() async {
    await _run(() async {
      activeFeed = await _api.forYouFeed();
    });
  }

  Future<void> refreshFollowingFeed() async {
    await _run(() async {
      activeFeed = await _api.followingFeed();
    });
  }

  Future<Map<String, dynamic>> search(String query) {
    return _api.search(query);
  }

  Future<List<Map<String, dynamic>>> games() async {
    if (activeGames.isNotEmpty) return activeGames;
    final games = await _api.games();
    activeGames = games;
    notifyListeners();
    return games;
  }

  Future<Map<String, dynamic>> postDetail(String publicId) {
    return _api.postDetail(publicId);
  }

  Future<Map<String, dynamic>> comments(String publicId) {
    return _api.comments(publicId);
  }

  Future<Map<String, dynamic>> createComment({
    required String publicId,
    required String text,
  }) {
    return _api.createComment(publicId: publicId, text: text);
  }

  Future<Map<String, dynamic>> togglePostLike(String publicId) {
    return _api.togglePostLike(publicId);
  }

  Future<Map<String, dynamic>> profile(String username) {
    return _api.profile(username);
  }

  Future<Map<String, dynamic>> toggleFollow(String username) {
    return _api.toggleFollow(username);
  }

  Future<Map<String, dynamic>> report({
    required Map<String, dynamic> target,
    required String reason,
    String? notes,
  }) {
    return _api.report(target: target, reason: reason, notes: notes);
  }

  Future<String?> uploadPostImage(XFile file) async {
    String? mediaId;
    await _run(() async {
      mediaId = await _api.uploadPostImage(file);
    });
    return mediaId;
  }

  Future<void> createPost(
    String text, {
    String? mediaAttachmentId,
    String? gameTagId,
  }) async {
    if (text.trim().isEmpty) {
      _fail('Write something before posting.');
      return;
    }
    await _run(() async {
      await _api.createPost(
        text: text.trim(),
        mediaAttachmentId: mediaAttachmentId,
        gameTagId: gameTagId,
      );
      activeFeed = await _api.forYouFeed();
    });
  }

  Future<void> logout() async {
    await _run(() async {
      await _api.signOut();
      sessionState = null;
      activeFeed = null;
      activeGames = const [];
      phase = AppPhase.signedOut;
    });
  }

  void clearError() {
    errorMessage = null;
    notifyListeners();
  }

  Future<void> _run(Future<void> Function() action) async {
    errorMessage = null;
    notifyListeners();
    try {
      await action();
      notifyListeners();
    } on MobileApiException catch (error) {
      _fail(error.message);
    } catch (_) {
      _fail('Something went wrong.');
    }
  }

  void _applySession(Map<String, dynamic> session) {
    sessionState = session;
    final kind = session['kind']?.toString();
    if (kind == null || kind == 'anonymous' || kind == 'unauthenticated') {
      phase = AppPhase.signedOut;
    } else if (kind == 'verified_profileless') {
      phase = AppPhase.onboarding;
    } else {
      phase = AppPhase.signedIn;
    }
  }

  void _fail(String message) {
    errorMessage = message;
    if (phase == AppPhase.booting) {
      phase = AppPhase.signedOut;
    }
    notifyListeners();
  }
}
