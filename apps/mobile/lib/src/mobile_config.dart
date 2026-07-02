class MobileConfig {
  const MobileConfig({
    required this.apiBaseUrl,
    required this.verifyEmailCallbackUrl,
    required this.resetPasswordCallbackUrl,
  });

  factory MobileConfig.fromEnvironment() {
    return const MobileConfig(
      apiBaseUrl: String.fromEnvironment(
        'MYTUUMS_API_BASE_URL',
        defaultValue: 'http://localhost:4000',
      ),
      verifyEmailCallbackUrl: String.fromEnvironment(
        'MYTUUMS_VERIFY_EMAIL_CALLBACK_URL',
        defaultValue: 'mytuums://auth/verify-email',
      ),
      resetPasswordCallbackUrl: String.fromEnvironment(
        'MYTUUMS_RESET_PASSWORD_CALLBACK_URL',
        defaultValue: 'mytuums://auth/reset-password',
      ),
    );
  }

  final String apiBaseUrl;
  final String verifyEmailCallbackUrl;
  final String resetPasswordCallbackUrl;
}
