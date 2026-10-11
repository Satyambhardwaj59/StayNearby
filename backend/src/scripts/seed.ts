import mongoose from 'mongoose';
import { env } from '../config/env';
import { UserModel, type UserDocument } from '../modules/users/models/user.model';
import { PropertyModel, type Property } from '../modules/properties/models/property.model';
import { ReviewModel } from '../modules/reviews/models/review.model';
import { hashPassword } from '../shared/utils/password';

async function seed() {
  console.log('Connecting to MongoDB at:', env.MONGODB_URI);
  await mongoose.connect(env.MONGODB_URI);
  console.log('MongoDB connected successfully.');

  const passwordHash = await hashPassword('DevPassw0rd!');

  // 1. Create or upsert core test accounts
  const usersData = [
    {
      name: 'System Administrator',
      email: 'admin@example.com',
      role: 'ADMIN' as const,
      phone: '+919999900001',
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    {
      name: 'Platform Moderator',
      email: 'moderator@example.com',
      role: 'MODERATOR' as const,
      phone: '+919999900002',
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    {
      name: 'Rajesh Sharma (Owner)',
      email: 'owner@example.com',
      role: 'OWNER' as const,
      phone: '+919999900003',
      passwordHash,
      emailVerifiedAt: new Date(),
    },
    {
      name: 'Ananya Verma (Tenant)',
      email: 'tenant@example.com',
      role: 'TENANT' as const,
      phone: '+919999900004',
      passwordHash,
      emailVerifiedAt: new Date(),
    },
  ];

  const userMap: Record<string, UserDocument> = {};

  for (const u of usersData) {
    let existing = await UserModel.findOne({ email: u.email });
    if (!existing) {
      existing = await UserModel.create(u);
      console.log(`Created user: ${u.email} (${u.role})`);
    } else {
      console.log(`User already exists: ${u.email} (${u.role})`);
    }
    userMap[u.role] = existing;
  }

  const owner = userMap.OWNER;
  const tenant = userMap.TENANT;

  // 2. Create sample properties if none exist
  const existingPropertiesCount = await PropertyModel.countDocuments();
  if (existingPropertiesCount === 0) {
    console.log('Seeding demo properties...');

    const sampleProperties = [
      {
        ownerId: owner._id,
        title: 'Luxury Co-living Single Room with High-Speed WiFi & Food in Koramangala',
        slug: 'luxury-co-living-single-room-koramangala',
        description:
          'Spacious fully-furnished air-conditioned single room in Koramangala 4th Block. Includes 3 times homestyle food, daily housekeeping, 500 Mbps fiber internet, power backup, and attached washroom.',
        propertyType: 'PG',
        roomType: 'SINGLE',
        rent: 14500,
        securityDeposit: 15000,
        maintenance: 0,
        maintenanceIncluded: true,
        brokerage: 0,
        brokerageApplicable: false,
        furnishing: 'FULLY_FURNISHED',
        bedrooms: 1,
        bathrooms: 1,
        area: 220,
        areaUnit: 'SQFT',
        amenities: [
          'WIFI',
          'MEALS_INCLUDED',
          'POWER_BACKUP',
          'HOUSEKEEPING',
          'WATER_SUPPLY_24X7',
          'LAUNDRY',
          'CCTV',
          'SECURITY_GUARD',
        ],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
            alt: 'Co-living room view',
            isCover: true,
          },
          {
            url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
            alt: 'Common lounge area',
            isCover: false,
          },
        ],
        location: {
          type: 'Point',
          coordinates: [77.6245, 12.9352],
        },
        address: {
          street: '80 Feet Road, 4th Block',
          locality: 'Koramangala',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560034',
          country: 'India',
        },
        citySlug: 'bangalore',
        localitySlug: 'koramangala',
        listingStatus: 'PUBLISHED',
        verificationStatus: 'VERIFIED',
        viewsCount: 142,
        favoritesCount: 18,
      },
      {
        ownerId: owner._id,
        title: 'Modern 2 BHK Apartment near Metro Station in Indiranagar',
        slug: 'modern-2bhk-apartment-indiranagar',
        description:
          'Sunlit modern 2 BHK apartment with modular kitchen, dedicated covered car parking, lift, 24/7 security, and balcony facing lush greenery. 5 minutes walk from 100 Feet Road and CMH Road Metro.',
        propertyType: 'FLAT',
        bhk: '2_BHK',
        rent: 32000,
        securityDeposit: 64000,
        maintenance: 2500,
        maintenanceIncluded: false,
        brokerage: 0,
        brokerageApplicable: false,
        furnishing: 'SEMI_FURNISHED',
        bedrooms: 2,
        bathrooms: 2,
        area: 1100,
        areaUnit: 'SQFT',
        floor: 3,
        totalFloors: 5,
        amenities: [
          'WIFI',
          'POWER_BACKUP',
          'LIFT',
          'FOUR_WHEELER_PARKING',
          'TWO_WHEELER_PARKING',
          'CCTV',
          'BALCONY',
          'WATER_SUPPLY_24X7',
        ],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
            alt: 'Living hall view',
            isCover: true,
          },
        ],
        location: {
          type: 'Point',
          coordinates: [77.6413, 12.9784],
        },
        address: {
          street: '12th Main Road',
          locality: 'Indiranagar',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560038',
          country: 'India',
        },
        citySlug: 'bangalore',
        localitySlug: 'indiranagar',
        listingStatus: 'PUBLISHED',
        verificationStatus: 'VERIFIED',
        viewsCount: 295,
        favoritesCount: 34,
      },
      {
        ownerId: owner._id,
        title: 'Furnished Studio Room for Working Professionals in HSR Layout',
        slug: 'furnished-studio-room-hsr-layout',
        description:
          'Private studio room with workstation, high-speed WiFi, attached kitchenette and bathroom. Ideal for remote workers and IT professionals in Sector 2, HSR Layout.',
        propertyType: 'ROOM',
        rent: 18000,
        securityDeposit: 25000,
        maintenance: 0,
        maintenanceIncluded: true,
        brokerage: 0,
        brokerageApplicable: false,
        furnishing: 'FULLY_FURNISHED',
        bedrooms: 1,
        bathrooms: 1,
        area: 320,
        areaUnit: 'SQFT',
        amenities: [
          'WIFI',
          'POWER_BACKUP',
          'STUDY_TABLE',
          'ATTACHED_BATHROOM',
          'REFRIGERATOR',
          'WATER_SUPPLY_24X7',
        ],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
            alt: 'Studio room interior',
            isCover: true,
          },
        ],
        location: {
          type: 'Point',
          coordinates: [77.6387, 12.9121],
        },
        address: {
          street: '27th Main, Sector 2',
          locality: 'HSR Layout',
          city: 'Bangalore',
          state: 'Karnataka',
          postalCode: '560102',
          country: 'India',
        },
        citySlug: 'bangalore',
        localitySlug: 'hsr-layout',
        listingStatus: 'PUBLISHED',
        verificationStatus: 'VERIFIED',
        viewsCount: 180,
        favoritesCount: 22,
      },
    ];

    for (const prop of sampleProperties) {
      // Seed data is intentionally plain objects; cast past the subdocument
      // types that only apply once Mongoose has hydrated a real document.
      const createdProp = await PropertyModel.create(prop as unknown as Partial<Property>);
      console.log(`Created property: "${createdProp.title}"`);

      // Add sample review
      await ReviewModel.create({
        propertyId: createdProp._id,
        userId: tenant._id,
        rating: 5,
        comment: 'Visited this property last week. Super clean, quiet neighborhood, fast internet, and the owner was very cooperative!',
        status: 'APPROVED',
      });
    }
    console.log('Seeded properties and reviews successfully.');
  } else {
    console.log(`Database already has ${existingPropertiesCount} properties.`);
  }

  console.log('\n===========================================');
  console.log('Seed Complete!');
  console.log('Default credentials for login:');
  console.log('  Password: DevPassw0rd!');
  console.log('  Admin:     admin@example.com');
  console.log('  Moderator: moderator@example.com');
  console.log('  Owner:     owner@example.com');
  console.log('  Tenant:    tenant@example.com');
  console.log('===========================================\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
