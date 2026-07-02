import 'package:mytuums_mobile/src/mytuums_mobile_app.dart';
import 'package:mytuums_mobile/src/screens/shared.dart';
import 'package:shadcn_flutter/shadcn_flutter.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _username = TextEditingController();
  final _displayName = TextEditingController();
  final _bio = TextEditingController();

  @override
  void dispose() {
    _username.dispose();
    _displayName.dispose();
    _bio.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    return MyTuumsScaffold(
      child: CenteredFormLayout(
        title: 'Your gaming profile',
        description: 'Choose your identity on MyTuums.',
        children: [
          Field(controller: _username, label: 'Username'),
          Field(controller: _displayName, label: 'Display name'),
          Field(controller: _bio, label: 'Bio', maxLines: 4),
          PrimaryAction(
            label: 'Finish onboarding',
            onPressed: () => state.completeOnboarding(
              username: _username.text.trim(),
              displayName: _displayName.text.trim(),
              bio: _bio.text.trim(),
            ),
          ),
        ],
      ),
    );
  }
}
