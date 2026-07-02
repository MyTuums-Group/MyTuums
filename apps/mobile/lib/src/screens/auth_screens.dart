import 'package:mytuums_mobile/src/mytuums_mobile_app.dart';
import 'package:mytuums_mobile/src/screens/shared.dart';
import 'package:shadcn_flutter/shadcn_flutter.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      child: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'MyTuums',
              style: theme.typography.h2.copyWith(
                color: theme.colorScheme.primary,
              ),
            ),
            const Gap(24),
            const CircularProgressIndicator(),
          ],
        ),
      ),
    );
  }
}

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  var _showRegister = false;
  var _showForgotPassword = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_showRegister) {
      return RegisterScreen(
        onBack: () => setState(() => _showRegister = false),
      );
    }
    if (_showForgotPassword) {
      return ForgotPasswordScreen(
        onBack: () => setState(() => _showForgotPassword = false),
      );
    }

    final state = AppScope.of(context);
    return MyTuumsScaffold(
      child: CenteredFormLayout(
        title: 'Log in',
        description: 'Log in to get back to your gaming feed.',
        children: [
          Field(controller: _email, label: 'Email'),
          Field(controller: _password, label: 'Password', obscureText: true),
          PrimaryAction(
            label: 'Log in',
            onPressed: () => state.login(
              email: _email.text.trim(),
              password: _password.text,
            ),
          ),
          const Gap(8),
          GhostLinkAction(
            label: 'Forgot password?',
            onPressed: () => setState(() => _showForgotPassword = true),
          ),
          GhostLinkAction(
            label: 'Create an account',
            onPressed: () => setState(() => _showRegister = true),
          ),
        ],
      ),
    );
  }
}

class RegisterScreen extends StatefulWidget {
  const RegisterScreen({required this.onBack, super.key});

  final VoidCallback onBack;

  @override
  State<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirmation = TextEditingController();
  var _ageConfirmed = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _confirmation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    return MyTuumsScaffold(
      child: CenteredFormLayout(
        title: 'Create account',
        children: [
          Field(controller: _email, label: 'Email'),
          Field(controller: _password, label: 'Password', obscureText: true),
          Field(
            controller: _confirmation,
            label: 'Confirm password',
            obscureText: true,
          ),
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Checkbox(
              state: _ageConfirmed
                  ? CheckboxState.checked
                  : CheckboxState.unchecked,
              onChanged: (value) => setState(
                () => _ageConfirmed = value == CheckboxState.checked,
              ),
              trailing: const Text('I am at least 16 years old'),
            ),
          ),
          PrimaryAction(
            label: 'Create my account',
            onPressed: () => state.register(
              email: _email.text.trim(),
              password: _password.text,
              confirmation: _confirmation.text,
              ageConfirmed: _ageConfirmed,
            ),
          ),
          const Gap(8),
          GhostLinkAction(label: 'Back to login', onPressed: widget.onBack),
        ],
      ),
    );
  }
}

class VerifyEmailScreen extends StatelessWidget {
  const VerifyEmailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return MyTuumsScaffold(
      child: CenteredFormLayout(
        title: 'Verify your email',
        description:
            'Open the email link from this phone. '
            'MyTuums will finish verification and restore your session.',
        children: [
          PrimaryAction(
            label: 'I verified, reload',
            onPressed: AppScope.of(context).bootstrap,
          ),
        ],
      ),
    );
  }
}

class ForgotPasswordScreen extends StatefulWidget {
  const ForgotPasswordScreen({required this.onBack, super.key});

  final VoidCallback onBack;

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  final _email = TextEditingController();
  var _sent = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    return MyTuumsScaffold(
      child: CenteredFormLayout(
        title: 'Reset password',
        children: [
          if (_sent)
            const Padding(
              padding: EdgeInsets.only(bottom: 16),
              child: PageDescription(
                'Check your email, then open the link from this phone.',
                centered: true,
              ),
            ),
          if (!_sent) Field(controller: _email, label: 'Email'),
          if (!_sent)
            PrimaryAction(
              label: 'Send reset link',
              onPressed: () async {
                await state.forgotPassword(_email.text.trim());
                if (mounted && state.errorMessage == null) {
                  setState(() => _sent = true);
                }
              },
            ),
          const Gap(8),
          GhostLinkAction(label: 'Back', onPressed: widget.onBack),
        ],
      ),
    );
  }
}

class ResetPasswordScreen extends StatefulWidget {
  const ResetPasswordScreen({super.key});

  @override
  State<ResetPasswordScreen> createState() => _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends State<ResetPasswordScreen> {
  final _password = TextEditingController();
  final _confirmation = TextEditingController();

  @override
  void dispose() {
    _password.dispose();
    _confirmation.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    return MyTuumsScaffold(
      child: CenteredFormLayout(
        title: 'New password',
        children: [
          Field(controller: _password, label: 'Password', obscureText: true),
          Field(
            controller: _confirmation,
            label: 'Confirm password',
            obscureText: true,
          ),
          PrimaryAction(
            label: 'Save password',
            onPressed: () => state.resetPassword(
              newPassword: _password.text,
              confirmation: _confirmation.text,
            ),
          ),
        ],
      ),
    );
  }
}
