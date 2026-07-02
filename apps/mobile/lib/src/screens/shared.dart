import 'package:mytuums_mobile/src/mytuums_mobile_app.dart';
import 'package:shadcn_flutter/shadcn_flutter.dart';

const double _maxContentWidth = 480;
const double _pagePadding = 24;
const double mobileMaxContentWidth = _maxContentWidth;
const double mobilePagePadding = _pagePadding;

/// App-wide scaffold with AppBar, error banner, and centered scrollable body.
class MyTuumsScaffold extends StatelessWidget {
  const MyTuumsScaffold({
    required this.child,
    this.actions = const [],
    this.leading = const [],
    this.showTitle = true,
    super.key,
  });

  final Widget child;
  final List<Widget> actions;
  final List<Widget> leading;
  final bool showTitle;

  @override
  Widget build(BuildContext context) {
    final state = AppScope.of(context);
    return Scaffold(
      headers: [
        AppBar(
          leading: leading,
          title: showTitle ? const Text('MyTuums').h4() : null,
          trailing: actions,
        ),
      ],
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(
            horizontal: _pagePadding,
            vertical: _pagePadding,
          ),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: _maxContentWidth),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (state.errorMessage != null)
                    ErrorBanner(
                      message: state.errorMessage!,
                      onClose: state.clearError,
                    ),
                  child,
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A centered layout for auth/onboarding screens with optional card wrapper.
class CenteredFormLayout extends StatelessWidget {
  const CenteredFormLayout({
    required this.title,
    required this.children,
    this.description,
    super.key,
  });

  final String title;
  final String? description;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Gap(16),
        Center(
          child: Text(
            title,
            style: theme.typography.h3,
            textAlign: TextAlign.center,
          ),
        ),
        if (description != null) ...[
          const Gap(8),
          Center(
            child: Text(
              description!,
              style: theme.typography.textMuted,
              textAlign: TextAlign.center,
            ),
          ),
        ],
        const Gap(24),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: children,
            ),
          ),
        ),
        const Gap(16),
      ],
    );
  }
}

class ErrorBanner extends StatelessWidget {
  const ErrorBanner({required this.message, required this.onClose, super.key});

  final String message;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Alert(
        destructive: true,
        title: Text(message),
        trailing: IconButton.ghost(
          icon: const Icon(Icons.close),
          onPressed: onClose,
        ),
      ),
    );
  }
}

class PageTitle extends StatelessWidget {
  const PageTitle(this.text, {this.centered = false, super.key});

  final String text;
  final bool centered;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).typography.h3,
      textAlign: centered ? TextAlign.center : null,
    );
  }
}

class PageDescription extends StatelessWidget {
  const PageDescription(this.text, {this.centered = false, super.key});

  final String text;
  final bool centered;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: Theme.of(context).typography.textMuted,
      textAlign: centered ? TextAlign.center : null,
    );
  }
}

class SectionHeader extends StatelessWidget {
  const SectionHeader({
    required this.title,
    this.description,
    this.trailing,
    super.key,
  });

  final String title;
  final String? description;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: theme.typography.h3),
                if (description != null) ...[
                  const Gap(4),
                  Text(description!, style: theme.typography.textMuted),
                ],
              ],
            ),
          ),
          if (trailing != null) ...[const Gap(12), trailing!],
        ],
      ),
    );
  }
}

class MutedIconTile extends StatelessWidget {
  const MutedIconTile({required this.icon, this.size = 36, super.key});

  final IconData icon;
  final double size;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: colorScheme.muted,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: colorScheme.border),
      ),
      child: Icon(icon, size: size * 0.48, color: colorScheme.mutedForeground),
    );
  }
}

class MetricPill extends StatelessWidget {
  const MetricPill({
    required this.icon,
    required this.label,
    this.active = false,
    this.onPressed,
    super.key,
  });

  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final textColor = active ? colorScheme.primary : colorScheme.foreground;
    final child = Container(
      constraints: const BoxConstraints(minHeight: 32),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: colorScheme.background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: active
              ? colorScheme.primary.scaleAlpha(0.28)
              : colorScheme.border,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 15, color: textColor),
          const Gap(6),
          Text(
            label,
            style: Theme.of(
              context,
            ).typography.xSmall.copyWith(color: textColor),
          ),
        ],
      ),
    );

    if (onPressed == null) return child;
    return Clickable(onPressed: onPressed, child: child);
  }
}

class EmptyStateCard extends StatelessWidget {
  const EmptyStateCard({
    required this.icon,
    required this.title,
    required this.message,
    this.action,
    super.key,
  });

  final IconData icon;
  final String title;
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            MutedIconTile(icon: icon, size: 44),
            const Gap(14),
            Text(title).medium(),
            const Gap(6),
            PageDescription(message, centered: true),
            if (action != null) ...[const Gap(14), action!],
          ],
        ),
      ),
    );
  }
}

class ErrorStateCard extends StatelessWidget {
  const ErrorStateCard(this.message, {super.key});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Alert(destructive: true, title: Text(message)),
      ),
    );
  }
}

class LoadingCard extends StatelessWidget {
  const LoadingCard({this.rows = 3, super.key});

  final int rows;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            for (var index = 0; index < rows; index++) ...[
              Container(
                height: 12,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: colorScheme.muted,
                  borderRadius: BorderRadius.circular(999),
                ),
              ),
              if (index != rows - 1) const Gap(12),
            ],
          ],
        ),
      ),
    );
  }
}

class PrimaryAction extends StatelessWidget {
  const PrimaryAction({
    required this.label,
    required this.onPressed,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: SizedBox(
        width: double.infinity,
        child: PrimaryButton(onPressed: onPressed, child: Text(label)),
      ),
    );
  }
}

class SecondaryAction extends StatelessWidget {
  const SecondaryAction({
    required this.label,
    required this.onPressed,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: SizedBox(
        width: double.infinity,
        child: OutlineButton(onPressed: onPressed, child: Text(label)),
      ),
    );
  }
}

class GhostLinkAction extends StatelessWidget {
  const GhostLinkAction({
    required this.label,
    required this.onPressed,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Align(
        child: GhostButton(onPressed: onPressed, child: Text(label)),
      ),
    );
  }
}

class Field extends StatelessWidget {
  const Field({
    required this.controller,
    required this.label,
    this.obscureText = false,
    this.maxLines = 1,
    super.key,
  });

  final TextEditingController controller;
  final String label;
  final bool obscureText;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    final typography = Theme.of(context).typography;
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            label,
            style: typography.small.copyWith(fontWeight: FontWeight.w500),
          ),
          const Gap(6),
          if (maxLines > 1)
            TextArea(
              controller: controller,
              placeholder: Text(label),
              maxLines: maxLines,
            )
          else
            TextField(
              controller: controller,
              placeholder: Text(label),
              obscureText: obscureText,
            ),
        ],
      ),
    );
  }
}
