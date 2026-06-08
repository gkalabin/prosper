import {DEFAULT_AUTHENTICATED_PAGE, SIGN_IN_URL} from '@/lib/auth/const';
import {
  returnPathOrDefault,
  signInUrlWithReturnPath,
} from '@/lib/auth/redirect';
import {describe, expect, test} from '@jest/globals';

describe('signInUrlWithReturnPath', () => {
  test('embeds a safe return path as an encoded query parameter', () => {
    expect(signInUrlWithReturnPath('/config/banks?tab=open')).toBe(
      `${SIGN_IN_URL}?next=%2Fconfig%2Fbanks%3Ftab%3Dopen`
    );
  });

  test('drops a missing or off-site return path', () => {
    expect(signInUrlWithReturnPath(null)).toBe(SIGN_IN_URL);
    expect(signInUrlWithReturnPath('//evil.com')).toBe(SIGN_IN_URL);
    expect(signInUrlWithReturnPath('https://evil.com')).toBe(SIGN_IN_URL);
  });
});

describe('returnPathOrDefault', () => {
  test('returns a safe return path unchanged', () => {
    expect(returnPathOrDefault('/trips')).toBe('/trips');
  });

  test('falls back to the default page for missing or off-site paths', () => {
    expect(returnPathOrDefault(null)).toBe(DEFAULT_AUTHENTICATED_PAGE);
    expect(returnPathOrDefault('//evil.com')).toBe(DEFAULT_AUTHENTICATED_PAGE);
    expect(returnPathOrDefault('/\\evil.com')).toBe(DEFAULT_AUTHENTICATED_PAGE);
  });
});
