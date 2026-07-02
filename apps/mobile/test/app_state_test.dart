import 'package:flutter_test/flutter_test.dart';

void main() {
  test('mobile test harness is wired', () {
    expect('mytuums://auth/verify-email'.startsWith('mytuums://'), isTrue);
  });
}
