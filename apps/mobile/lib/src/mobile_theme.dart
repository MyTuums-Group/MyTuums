import 'package:shadcn_flutter/shadcn_flutter.dart';

/// Mobile themes derived from the web CSS tokens in
/// `packages/ui/src/styles/globals.css` (Radix Nova / rose preset).
///
/// Every value was converted from OKLCH → sRGB with CSS gamut mapping via
/// colorjs.io so the mobile palette matches the browser-rendered web palette
/// pixel-for-pixel.
class MobileTheme {
  MobileTheme._();

  static const ColorScheme lightColorScheme = ColorScheme(
    brightness: Brightness.light,
    background: Color(0xFFFFFFFF),
    foreground: Color(0xFF0A0A0A),
    card: Color(0xFFFFFFFF),
    cardForeground: Color(0xFF0A0A0A),
    popover: Color(0xFFFFFFFF),
    popoverForeground: Color(0xFF0A0A0A),
    primary: Color(0xFFC6005C),
    primaryForeground: Color(0xFFFDF2F8),
    secondary: Color(0xFFF4F4F5),
    secondaryForeground: Color(0xFF18181B),
    muted: Color(0xFFF5F5F5),
    mutedForeground: Color(0xFF737373),
    accent: Color(0xFFF5F5F5),
    accentForeground: Color(0xFF0A0A0A),
    destructive: Color(0xFFE7000B),
    destructiveForeground: Color(0xFFFAFAFA),
    border: Color(0xFFE5E5E5),
    input: Color(0xFFE5E5E5),
    ring: Color(0xFFA1A1A1),
    chart1: Color(0xFFFDA5D5),
    chart2: Color(0xFFF6339A),
    chart3: Color(0xFFE60076),
    chart4: Color(0xFFC6005C),
    chart5: Color(0xFFA3004C),
  );

  static const ColorScheme darkColorScheme = ColorScheme(
    brightness: Brightness.dark,
    background: Color(0xFF0A0A0A),
    foreground: Color(0xFFFAFAFA),
    card: Color(0xFF171717),
    cardForeground: Color(0xFFFAFAFA),
    popover: Color(0xFF171717),
    popoverForeground: Color(0xFFFAFAFA),
    primary: Color(0xFFA3004C),
    primaryForeground: Color(0xFFFDF2F8),
    secondary: Color(0xFF27272A),
    secondaryForeground: Color(0xFFFAFAFA),
    muted: Color(0xFF262626),
    mutedForeground: Color(0xFFA1A1A1),
    accent: Color(0xFF262626),
    accentForeground: Color(0xFFFAFAFA),
    destructive: Color(0xFFFF6467),
    destructiveForeground: Color(0xFFFAFAFA),
    border: Color(0x1AFFFFFF),
    input: Color(0x26FFFFFF),
    ring: Color(0xFF737373),
    chart1: Color(0xFFFDA5D5),
    chart2: Color(0xFFF6339A),
    chart3: Color(0xFFE60076),
    chart4: Color(0xFFC6005C),
    chart5: Color(0xFFA3004C),
  );

  static const ThemeData lightTheme = ThemeData(
    colorScheme: lightColorScheme,
    radius: 0.625,
  );

  static const ThemeData darkTheme = ThemeData.dark(
    colorScheme: darkColorScheme,
    radius: 0.625,
  );
}
