import { describe, expect, it } from 'vitest';
import {
  absoluteUrl,
  canonicalQuery,
  landingPath,
  parseLandingSlug,
} from '@/lib/seo/canonical';

describe('absoluteUrl', () => {
  it('builds site-absolute URLs with a clean root', () => {
    expect(absoluteUrl('/')).toBe('http://localhost:3000');
    expect(absoluteUrl('/search')).toBe('http://localhost:3000/search');
    expect(absoluteUrl('search')).toBe('http://localhost:3000/search');
  });
});

describe('canonicalQuery', () => {
  it('sorts keys and drops pagination/no-op values', () => {
    expect(canonicalQuery({ maxRent: '10000', city: 'patna', page: '2', empty: '' })).toBe(
      '?city=patna&maxRent=10000',
    );
  });

  it('sorts and joins array values', () => {
    expect(canonicalQuery({ type: ['pg', 'flat'] })).toBe('?type=flat%2Cpg');
  });
});

describe('landing pages', () => {
  it('parses kind-in-city', () => {
    expect(parseLandingSlug('pg-in-patna')).toEqual({
      kind: 'pg',
      audience: null,
      bhk: null,
      citySlug: 'patna',
    });
  });

  it('parses audience landings', () => {
    expect(parseLandingSlug('pg-for-students-in-patna')).toEqual({
      kind: 'pg',
      audience: 'students',
      bhk: null,
      citySlug: 'patna',
    });
  });

  it('parses bhk-for-rent landings as flats', () => {
    expect(parseLandingSlug('1bhk-for-rent-in-patna')).toEqual({
      kind: 'flats',
      audience: null,
      bhk: '1bhk',
      citySlug: 'patna',
    });
  });

  it('rejects unknown kinds', () => {
    expect(parseLandingSlug('spaceships-in-patna')).toBeNull();
  });

  it('round-trips landingPath', () => {
    expect(landingPath({ kind: 'flats', bhk: '2bhk', citySlug: 'patna' })).toBe(
      '/2bhk-for-rent-in-patna',
    );
    expect(landingPath({ kind: 'pg', audience: 'bachelors', citySlug: 'delhi' })).toBe(
      '/pg-for-bachelors-in-delhi',
    );
    expect(landingPath({ kind: 'rooms', citySlug: 'patna' })).toBe('/rooms-in-patna');
  });
});
