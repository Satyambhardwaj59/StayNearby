import { describe, expect, it } from 'vitest';
import { toPropertyCard } from '../../src/modules/properties/services/property.service';

/**
 * The public card serialiser is what search results, nearby results and saved
 * properties all return. These assertions lock in the contract and make sure no
 * private fields (owner id, contact details, street address) leak through.
 */
const doc = {
  _id: '64b7f1c2c2c2c2c2c2c2c2c2',
  slug: 'sample-pg',
  title: 'Sample PG',
  propertyType: 'PG',
  roomType: 'SINGLE',
  bhk: null,
  rent: 12000,
  securityDeposit: 24000,
  furnishing: 'FULLY_FURNISHED',
  availableFrom: new Date('2026-01-01T00:00:00.000Z'),
  amenities: ['WIFI'],
  listingStatus: 'PUBLISHED',
  verificationStatus: 'VERIFIED',
  citySlug: 'bangalore',
  localitySlug: 'koramangala',
  locationPrivacy: 'APPROXIMATE',
  location: { type: 'Point', coordinates: [77.6245, 12.9352] },
  address: {
    street: 'Secret Street 1',
    locality: 'Koramangala',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
  },
  contact: { phone: '+91 99999 99999', email: 'owner@example.com' },
  ownerId: '64b7f1c2c2c2c2c2c2c2c2c3',
  images: [
    { url: 'https://cdn.example.com/a.jpg', alt: 'Secret Street 1', isCover: false },
    { url: 'https://cdn.example.com/cover.jpg', alt: 'Cover', isCover: true },
  ],
};

describe('toPropertyCard', () => {
  const card = toPropertyCard(doc);

  it('maps database field names to the public contract', () => {
    expect(card.id).toBe('64b7f1c2c2c2c2c2c2c2c2c2');
    expect(card.deposit).toBe(24000);
    expect(card.verified).toBe(true);
    expect(card.location).toEqual({
      locality: 'Koramangala',
      city: 'Bangalore',
      point: { latitude: 12.9352, longitude: 77.6245 },
      precision: 'APPROXIMATE',
    });
  });

  it('selects the cover image', () => {
    expect(card.image).toEqual({ url: 'https://cdn.example.com/cover.jpg', alt: 'Cover' });
  });

  it('never leaks private fields', () => {
    const serialised = JSON.stringify(card);
    expect(serialised).not.toContain('owner@example.com');
    expect(serialised).not.toContain('ownerexample');
    expect(serialised).not.toContain('+91');
    expect(serialised).not.toContain('Secret Street');
    expect(card).not.toHaveProperty('contact');
    expect(card).not.toHaveProperty('ownerId');
    expect(card).not.toHaveProperty('address');
  });
});
