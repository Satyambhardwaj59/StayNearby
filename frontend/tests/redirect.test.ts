import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from '@/lib/auth/redirect';

describe('safeRedirectPath', () => {
  it('accepts same-site relative paths, including query strings', () => {
    expect(safeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(safeRedirectPath('/search?type=PG&city=patna')).toBe('/search?type=PG&city=patna');
  });

  it('rejects protocol-relative URLs', () => {
    expect(safeRedirectPath('//evil.com')).toBe('/dashboard');
    expect(safeRedirectPath('  //evil.com')).toBe('/dashboard');
  });

  it('rejects absolute URLs and bare hosts', () => {
    expect(safeRedirectPath('https://evil.com')).toBe('/dashboard');
    expect(safeRedirectPath('evil.com')).toBe('/dashboard');
  });

  it('rejects backslashes', () => {
    expect(safeRedirectPath('/\\evil.com')).toBe('/dashboard');
    expect(safeRedirectPath('\\evil.com')).toBe('/dashboard');
  });

  it('rejects javascript: URLs', () => {
    expect(safeRedirectPath('javascript:alert(1)')).toBe('/dashboard');
  });

  it('falls back for empty or missing values and honours a custom fallback', () => {
    expect(safeRedirectPath(null)).toBe('/dashboard');
    expect(safeRedirectPath(undefined)).toBe('/dashboard');
    expect(safeRedirectPath('')).toBe('/dashboard');
    expect(safeRedirectPath(null, '/')).toBe('/');
  });
});
