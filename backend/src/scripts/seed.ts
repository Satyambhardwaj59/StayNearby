import mongoose from 'mongoose';
import { env } from '../config/env';
import { UserModel, type UserDocument } from '../modules/users/models/user.model';
import { PropertyModel, type Property } from '../modules/properties/models/property.model';
import { ReviewModel } from '../modules/reviews/models/review.model';
import { hashPassword } from '../shared/utils/password';

// Helper to generate unique slug
function slugify(text: string, index: number): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') + `-${index}`;
}

async function seed() {
  console.log('Connecting to MongoDB at:', env.MONGODB_URI);
  await mongoose.connect(env.MONGODB_URI);
  console.log('MongoDB connected successfully.');

  const passwordHash = await hashPassword('DevPassw0rd!');

  // ============================================================
  // 1. CORE TEST ACCOUNTS (existing)
  // ============================================================
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

  // ============================================================
  // 2. ADDITIONAL USERS (20 tenants + 20 owners = 40 users)
  // ============================================================

  // ---- 20 Additional TENANTS ----
  const tenantNames = [
    'Priya Nair', 'Arjun Mehta', 'Sneha Reddy', 'Vikram Singh', 'Kavya Iyer',
    'Rohit Gupta', 'Divya Menon', 'Aditya Kulkarni', 'Neha Joshi', 'Karan Malhotra',
    'Pooja Desai', 'Siddharth Rao', 'Riya Choudhury', 'Amit Patel', 'Tanvi Bhatt',
    'Harsh Vardhan', 'Meera Krishnan', 'Nikhil Bansal', 'Shreya Ghosh', 'Varun Shetty',
  ];

  const tenantPhones = ['+919888800001', '+919888800002', '+919888800003', '+919888800004', '+919888800005',
    '+919888800006', '+919888800007', '+919888800008', '+919888800009', '+919888800010',
    '+919888800011', '+919888800012', '+919888800013', '+919888800014', '+919888800015',
    '+919888800016', '+919888800017', '+919888800018', '+919888800019', '+919888800020'];

  for (let i = 0; i < tenantNames.length; i++) {
    const email = `tenant${i + 1}@example.com`;
    const existing = await UserModel.findOne({ email });
    if (!existing) {
      await UserModel.create({
        name: tenantNames[i],
        email,
        role: 'TENANT' as const,
        phone: tenantPhones[i],
        passwordHash,
        emailVerifiedAt: new Date(),
      });
      console.log(`Created tenant: ${email} (${tenantNames[i]})`);
    } else {
      console.log(`Tenant already exists: ${email}`);
    }
  }

  // ---- 20 Additional OWNERS ----
  const ownerNames = [
    'Suresh Kumar', 'Lakshmi Narayan', 'Ramesh Babu', 'Geetha Devi', 'Venkatesh Rao',
    'Sunita Sharma', 'Mahesh Patel', 'Anita Desai', 'Prakash Jha', 'Rekha Nair',
    'Dinesh Verma', 'Shalini Gupta', 'Arun Prakash', 'Vandana Singh', 'Krishna Murthy',
    'Bhavana Reddy', 'Gopal Krishna', 'Saritha Menon', 'Naveen Chandra', 'Deepa Iyer',
  ];

  const ownerPhones = ['+919777700001', '+919777700002', '+919777700003', '+919777700004', '+919777700005',
    '+919777700006', '+919777700007', '+919777700008', '+919777700009', '+919777700010',
    '+919777700011', '+919777700012', '+919777700013', '+919777700014', '+919777700015',
    '+919777700016', '+919777700017', '+919777700018', '+919777700019', '+919777700020'];

  const ownerDocs: UserDocument[] = [];

  for (let i = 0; i < ownerNames.length; i++) {
    const email = `owner${i + 1}@example.com`;
    let existing = await UserModel.findOne({ email });
    if (!existing) {
      existing = await UserModel.create({
        name: ownerNames[i],
        email,
        role: 'OWNER' as const,
        phone: ownerPhones[i],
        passwordHash,
        emailVerifiedAt: new Date(),
      });
      console.log(`Created owner: ${email} (${ownerNames[i]})`);
    } else {
      console.log(`Owner already exists: ${email}`);
    }
    ownerDocs.push(existing);
  }

  // Add the original owner to the pool
  ownerDocs.unshift(userMap.OWNER);

  // ============================================================
  // 3. SEED 100+ PROPERTIES ACROSS INDIA
  // ============================================================

  // Distinct Unsplash photos so each listing gets its own image set.
  const imageUrls = [
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585152220-90363fe7e115?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585153490-76fb20a32601?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600047509358-9dc75507daeb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753151-384129cf4e3e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600210491892-03d54c0aaf87?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600607688066-890987f18a86?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1560184897-ae75f418493e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1200&q=80',
  ];

  // Localities spread all over India.
  const indiaLocations: Array<{
    city: string;
    state: string;
    locality: string;
    postalCode: string;
    coords: [number, number]; // [longitude, latitude]
  }> = [
    { city: 'New Delhi', state: 'Delhi', locality: 'Hauz Khas', postalCode: '110016', coords: [77.2065, 28.5494] },
    { city: 'New Delhi', state: 'Delhi', locality: 'Dwarka', postalCode: '110078', coords: [77.0468, 28.5921] },
    { city: 'New Delhi', state: 'Delhi', locality: 'Saket', postalCode: '110017', coords: [77.2001, 28.5245] },
    { city: 'New Delhi', state: 'Delhi', locality: 'Rohini', postalCode: '110085', coords: [77.0670, 28.7490] },
    { city: 'Gurugram', state: 'Haryana', locality: 'Sector 49', postalCode: '122018', coords: [77.0400, 28.4200] },
    { city: 'Gurugram', state: 'Haryana', locality: 'DLF Phase 3', postalCode: '122010', coords: [77.0900, 28.4900] },
    { city: 'Noida', state: 'Uttar Pradesh', locality: 'Sector 62', postalCode: '201309', coords: [77.3600, 28.6300] },
    { city: 'Ghaziabad', state: 'Uttar Pradesh', locality: 'Indirapuram', postalCode: '201014', coords: [77.3700, 28.6400] },
    { city: 'Mumbai', state: 'Maharashtra', locality: 'Andheri West', postalCode: '400058', coords: [72.8264, 19.1364] },
    { city: 'Mumbai', state: 'Maharashtra', locality: 'Bandra', postalCode: '400050', coords: [72.8296, 19.0596] },
    { city: 'Mumbai', state: 'Maharashtra', locality: 'Powai', postalCode: '400076', coords: [72.9051, 19.1176] },
    { city: 'Thane', state: 'Maharashtra', locality: 'Ghodbunder Road', postalCode: '400607', coords: [72.9781, 19.2183] },
    { city: 'Navi Mumbai', state: 'Maharashtra', locality: 'Vashi', postalCode: '400703', coords: [72.9988, 19.0770] },
    { city: 'Pune', state: 'Maharashtra', locality: 'Baner', postalCode: '411045', coords: [73.7797, 18.5590] },
    { city: 'Pune', state: 'Maharashtra', locality: 'Hinjewadi', postalCode: '411057', coords: [73.7389, 18.5913] },
    { city: 'Pune', state: 'Maharashtra', locality: 'Kharadi', postalCode: '411014', coords: [73.9440, 18.5515] },
    { city: 'Nagpur', state: 'Maharashtra', locality: 'Dharampeth', postalCode: '440010', coords: [79.0600, 21.1400] },
    { city: 'Nashik', state: 'Maharashtra', locality: 'Gangapur Road', postalCode: '422013', coords: [73.7500, 20.0100] },
    { city: 'Bengaluru', state: 'Karnataka', locality: 'Koramangala', postalCode: '560034', coords: [77.6245, 12.9352] },
    { city: 'Bengaluru', state: 'Karnataka', locality: 'Indiranagar', postalCode: '560038', coords: [77.6413, 12.9784] },
    { city: 'Bengaluru', state: 'Karnataka', locality: 'HSR Layout', postalCode: '560102', coords: [77.6387, 12.9121] },
    { city: 'Bengaluru', state: 'Karnataka', locality: 'Whitefield', postalCode: '560066', coords: [77.7500, 12.9698] },
    { city: 'Bengaluru', state: 'Karnataka', locality: 'Electronic City', postalCode: '560100', coords: [77.6600, 12.8452] },
    { city: 'Mysuru', state: 'Karnataka', locality: 'Vijayanagar', postalCode: '570017', coords: [76.6087, 12.3120] },
    { city: 'Mangaluru', state: 'Karnataka', locality: 'Kadri', postalCode: '575002', coords: [74.8560, 12.8940] },
    { city: 'Hyderabad', state: 'Telangana', locality: 'Gachibowli', postalCode: '500032', coords: [78.3489, 17.4401] },
    { city: 'Hyderabad', state: 'Telangana', locality: 'Madhapur', postalCode: '500081', coords: [78.3915, 17.4486] },
    { city: 'Hyderabad', state: 'Telangana', locality: 'Kukatpally', postalCode: '500072', coords: [78.4080, 17.4849] },
    { city: 'Warangal', state: 'Telangana', locality: 'Hanamkonda', postalCode: '506001', coords: [79.5790, 18.0100] },
    { city: 'Chennai', state: 'Tamil Nadu', locality: 'Velachery', postalCode: '600042', coords: [80.2209, 12.9791] },
    { city: 'Chennai', state: 'Tamil Nadu', locality: 'OMR', postalCode: '600119', coords: [80.2446, 12.9081] },
    { city: 'Chennai', state: 'Tamil Nadu', locality: 'T. Nagar', postalCode: '600017', coords: [80.2340, 13.0400] },
    { city: 'Coimbatore', state: 'Tamil Nadu', locality: 'Peelamedu', postalCode: '641004', coords: [77.0030, 11.0280] },
    { city: 'Madurai', state: 'Tamil Nadu', locality: 'Anna Nagar', postalCode: '625020', coords: [78.1300, 9.9250] },
    { city: 'Kochi', state: 'Kerala', locality: 'Kakkanad', postalCode: '682030', coords: [76.3420, 10.0160] },
    { city: 'Thiruvananthapuram', state: 'Kerala', locality: 'Technopark', postalCode: '695581', coords: [76.8600, 8.5570] },
    { city: 'Kozhikode', state: 'Kerala', locality: 'Mavoor Road', postalCode: '673004', coords: [75.7900, 11.2600] },
    { city: 'Kolkata', state: 'West Bengal', locality: 'Salt Lake', postalCode: '700064', coords: [88.4000, 22.5900] },
    { city: 'Kolkata', state: 'West Bengal', locality: 'New Town', postalCode: '700156', coords: [88.4600, 22.5800] },
    { city: 'Siliguri', state: 'West Bengal', locality: 'Sevoke Road', postalCode: '734001', coords: [88.4300, 26.7300] },
    { city: 'Ahmedabad', state: 'Gujarat', locality: 'Satellite', postalCode: '380015', coords: [72.5100, 23.0300] },
    { city: 'Surat', state: 'Gujarat', locality: 'Adajan', postalCode: '395009', coords: [72.7900, 21.1900] },
    { city: 'Vadodara', state: 'Gujarat', locality: 'Alkapuri', postalCode: '390007', coords: [73.1700, 22.3100] },
    { city: 'Rajkot', state: 'Gujarat', locality: 'Kalawad Road', postalCode: '360005', coords: [70.7900, 22.2800] },
    { city: 'Jaipur', state: 'Rajasthan', locality: 'Malviya Nagar', postalCode: '302017', coords: [75.8100, 26.8500] },
    { city: 'Jaipur', state: 'Rajasthan', locality: 'Vaishali Nagar', postalCode: '302021', coords: [75.7400, 26.9100] },
    { city: 'Jodhpur', state: 'Rajasthan', locality: 'Ratanada', postalCode: '342011', coords: [73.0300, 26.2700] },
    { city: 'Udaipur', state: 'Rajasthan', locality: 'Hiran Magri', postalCode: '313002', coords: [73.7100, 24.5800] },
    { city: 'Lucknow', state: 'Uttar Pradesh', locality: 'Gomti Nagar', postalCode: '226010', coords: [81.0000, 26.8500] },
    { city: 'Varanasi', state: 'Uttar Pradesh', locality: 'Sigra', postalCode: '221010', coords: [82.9800, 25.3200] },
    { city: 'Kanpur', state: 'Uttar Pradesh', locality: 'Swaroop Nagar', postalCode: '208002', coords: [80.3000, 26.4900] },
    { city: 'Agra', state: 'Uttar Pradesh', locality: 'Tajganj', postalCode: '282001', coords: [78.0400, 27.1700] },
    { city: 'Chandigarh', state: 'Chandigarh', locality: 'Sector 17', postalCode: '160017', coords: [76.7800, 30.7400] },
    { city: 'Ludhiana', state: 'Punjab', locality: 'Model Town', postalCode: '141002', coords: [75.8400, 30.9000] },
    { city: 'Amritsar', state: 'Punjab', locality: 'Ranjit Avenue', postalCode: '143001', coords: [74.8700, 31.6400] },
    { city: 'Dehradun', state: 'Uttarakhand', locality: 'Rajpur Road', postalCode: '248001', coords: [78.0500, 30.3500] },
    { city: 'Indore', state: 'Madhya Pradesh', locality: 'Vijay Nagar', postalCode: '452010', coords: [75.8900, 22.7500] },
    { city: 'Bhopal', state: 'Madhya Pradesh', locality: 'Arera Colony', postalCode: '462016', coords: [77.4300, 23.2300] },
    { city: 'Gwalior', state: 'Madhya Pradesh', locality: 'City Centre', postalCode: '474011', coords: [78.1800, 26.2200] },
    { city: 'Patna', state: 'Bihar', locality: 'Boring Road', postalCode: '800001', coords: [85.1300, 25.6100] },
    { city: 'Ranchi', state: 'Jharkhand', locality: 'Harmu', postalCode: '834002', coords: [85.3000, 23.3500] },
    { city: 'Bhubaneswar', state: 'Odisha', locality: 'Patia', postalCode: '751024', coords: [85.8200, 20.3500] },
    { city: 'Cuttack', state: 'Odisha', locality: 'Buxi Bazaar', postalCode: '753001', coords: [85.8800, 20.4700] },
    { city: 'Guwahati', state: 'Assam', locality: 'Dispur', postalCode: '781006', coords: [91.7900, 26.1400] },
    { city: 'Shillong', state: 'Meghalaya', locality: 'Laitumkhrah', postalCode: '793003', coords: [91.8900, 25.5700] },
    { city: 'Raipur', state: 'Chhattisgarh', locality: 'Shankar Nagar', postalCode: '492007', coords: [81.6300, 21.2400] },
    { city: 'Visakhapatnam', state: 'Andhra Pradesh', locality: 'MVP Colony', postalCode: '530017', coords: [83.3300, 17.7300] },
    { city: 'Vijayawada', state: 'Andhra Pradesh', locality: 'Benz Circle', postalCode: '520010', coords: [80.6500, 16.5000] },
    { city: 'Panaji', state: 'Goa', locality: 'Miramar', postalCode: '403001', coords: [73.8000, 15.4800] },
    { city: 'Calangute', state: 'Goa', locality: 'Calangute Beach Road', postalCode: '403516', coords: [73.7600, 15.5400] },
    { city: 'Srinagar', state: 'Jammu and Kashmir', locality: 'Rajbagh', postalCode: '190008', coords: [74.8200, 34.0600] },
    { city: 'Jammu', state: 'Jammu and Kashmir', locality: 'Gandhi Nagar', postalCode: '180004', coords: [74.8600, 32.7000] },
  ];

  const propertyTypes = ['PG', 'ROOM', 'FLAT', 'APARTMENT', 'HOUSE', 'HOSTEL', 'CO_LIVING', 'INDEPENDENT_HOUSE'] as const;
  const bhkOptions = ['RK', '1_BHK', '2_BHK', '3_BHK', '4_BHK', '5_PLUS_BHK'] as const;
  const furnishingOptions = ['FULLY_FURNISHED', 'SEMI_FURNISHED', 'UNFURNISHED'] as const;
  const roomTypes = ['SINGLE', 'DOUBLE', 'TRIPLE', 'FOUR_PLUS'] as const;
  const tenantPreferences = ['ANYONE', 'WORKING_PROFESSIONAL', 'STUDENT', 'FAMILY', 'BACHELOR', 'COUPLE'] as const;

  // Only values present in shared/constants/property.ts AMENITIES are valid.
  const amenityPool = [
    'WIFI', 'WATER_SUPPLY_24X7', 'POWER_BACKUP', 'LIFT', 'TWO_WHEELER_PARKING',
    'FOUR_WHEELER_PARKING', 'MEALS_INCLUDED', 'HOUSEKEEPING', 'STUDY_TABLE',
    'ATTACHED_BATHROOM', 'CCTV', 'SECURITY_GUARD', 'GYM', 'REFRIGERATOR',
    'BALCONY', 'PARK', 'PET_FRIENDLY', 'LAUNDRY',
  ];

  const cityTierMultiplier: Record<string, number> = {
    'New Delhi': 1.6, Gurugram: 1.6, Noida: 1.4, Mumbai: 1.9, Thane: 1.5,
    'Navi Mumbai': 1.5, Bengaluru: 1.5, Hyderabad: 1.2, Pune: 1.3, Chennai: 1.2,
    Kolkata: 1.1, Ahmedabad: 1.1, Chandigarh: 1.1, Kochi: 1.1, Panaji: 1.2, Calangute: 1.2,
  };

  const titlePrefixes = [
    'Spacious', 'Modern', 'Cozy', 'Elegant', 'Premium', 'Budget-Friendly',
    'Luxurious', 'Well-Maintained', 'Newly Renovated', 'Bright & Airy',
    'Fully Furnished', 'Peaceful', 'Centrally Located', 'Family-Friendly',
    'Bachelor-Friendly', 'Studio-Style', 'Independent', 'Semi-Private',
  ];

  const titleSuffixes = [
    'with WiFi & Food', 'near IT Park', 'with Parking', 'with Balcony',
    'with Power Backup', 'close to Metro', 'in Gated Community',
    'with Garden View', 'with Modern Amenities', 'for Working Professionals',
    'for Students', 'with 24/7 Security', 'near Shopping Mall',
    'with Gym Access', 'with Housekeeping', 'near Tech Hub',
  ];

  const reviewComments = [
    'Great property! Very well maintained and the owner is responsive.',
    'Good location and amenities. Would recommend to anyone looking in this area.',
    'Clean and comfortable. Exactly as described in the listing.',
    'Nice place, close to everything. Slight noise issue but manageable.',
    'Excellent value for money. The locality is safe and convenient.',
    'Loved the natural lighting and the spacious rooms. Owner is very helpful.',
    'Decent property. Maintenance could be better but overall a good experience.',
    'Perfect for working professionals. Fast internet and good security.',
    'The property is well connected to public transport. Very convenient.',
    'Beautiful interiors and great ventilation. Would definitely recommend.',
  ];

  // Deterministic per-property PRNG, seeded by the property index. Seeding per
  // index keeps a property's slug identical on every run, no matter what was
  // created or skipped before it, so re-running never duplicates the seed.
  function makeRng(initialSeed: number): () => number {
    let s = initialSeed % 2147483647;
    if (s <= 0) s += 2147483646;
    return () => {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  let random: () => number = makeRng(1);

  function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(random() * arr.length)];
  }

  function pickN<T>(arr: readonly T[], n: number): T[] {
    const shuffled = [...arr].sort(() => random() - 0.5);
    return shuffled.slice(0, n);
  }

  function toSlug(text: string): string {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  function bhkToBedrooms(bhk: string): number {
    switch (bhk) {
      case 'RK': return 1;
      case '1_BHK': return 1;
      case '2_BHK': return 2;
      case '3_BHK': return 3;
      case '4_BHK': return 4;
      default: return 5;
    }
  }

  const NEW_PROPERTY_COUNT = 120;

  // Never re-create anything that already exists (existing seed or an earlier run).
  const existingSlugs = new Set(
    (await PropertyModel.find({}, { slug: 1 }).lean()).map((p) => p.slug),
  );

  const reviewers = await UserModel.find({ role: 'TENANT' }).limit(25);

  console.log(`\nSeeding up to ${NEW_PROPERTY_COUNT} properties across India...`);

  let createdCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < NEW_PROPERTY_COUNT; i++) {
    random = makeRng(i + 1);
    const loc = indiaLocations[i % indiaLocations.length];
    const owner = ownerDocs[i % ownerDocs.length];
    const pType = propertyTypes[i % propertyTypes.length];
    const furnishing = pick(furnishingOptions);
    const mult = cityTierMultiplier[loc.city] ?? 0.85;
    const isShared = pType === 'PG' || pType === 'ROOM' || pType === 'HOSTEL' || pType === 'CO_LIVING';

    let rent: number;
    let securityDeposit: number;
    let maintenance: number;
    let area: number;
    let bedrooms: number;
    let bathrooms: number;

    if (isShared) {
      rent = Math.round((6000 + random() * 12000) * mult);
      securityDeposit = rent;
      maintenance = 0;
      area = Math.round(120 + random() * 250);
      bedrooms = 1;
      bathrooms = 1;
    } else if (pType === 'FLAT' || pType === 'APARTMENT') {
      const bhk = pick(bhkOptions);
      bedrooms = bhkToBedrooms(bhk);
      rent = Math.round((12000 + bedrooms * 7000 + random() * 15000) * mult);
      securityDeposit = rent * 2;
      maintenance = Math.round(800 + random() * 4000);
      area = Math.round(500 + bedrooms * 260 + random() * 400);
      bathrooms = Math.max(1, bedrooms - 1);
    } else {
      // HOUSE / INDEPENDENT_HOUSE
      bedrooms = Math.round(2 + random() * 3);
      rent = Math.round((22000 + random() * 40000) * mult);
      securityDeposit = rent * 2;
      maintenance = Math.round(1500 + random() * 5000);
      area = Math.round(1100 + random() * 1600);
      bathrooms = Math.round(1 + random() * 2);
    }

    const typeLabel = pType === 'PG' ? 'PG'
      : pType === 'ROOM' ? 'Room'
      : pType === 'HOSTEL' ? 'Hostel'
      : pType === 'CO_LIVING' ? 'Co-living Space'
      : pType === 'FLAT' ? `${bedrooms} BHK Flat`
      : pType === 'APARTMENT' ? `${bedrooms} BHK Apartment`
      : pType === 'INDEPENDENT_HOUSE' ? `${bedrooms} BHK Independent House`
      : `${bedrooms} BHK House`;

    const title = `${pick(titlePrefixes)} ${typeLabel} ${pick(titleSuffixes)} in ${loc.locality}, ${loc.city}`;

    // Slugs include the property index, so a generated slug is stable across runs.
    // If it already exists, this property was seeded on an earlier run: skip it.
    const slug = slugify(title, i + 1);
    if (existingSlugs.has(slug)) {
      skippedCount++;
      continue;
    }

    const coords: [number, number] = [
      loc.coords[0] + (random() - 0.5) * 0.03,
      loc.coords[1] + (random() - 0.5) * 0.03,
    ];

    const numAmenities = Math.round(5 + random() * 6);
    const amenities = pickN(amenityPool, Math.min(numAmenities, amenityPool.length));

    const numImages = 2 + Math.floor(random() * 3); // 2-4 distinct images per listing
    const startImg = (i * 7) % imageUrls.length;
    const images = Array.from({ length: numImages }, (_, k) => ({
      url: imageUrls[(startImg + k) % imageUrls.length],
      alt: `${loc.locality}, ${loc.city} listing image ${k + 1}`,
      isCover: k === 0,
      order: k,
    }));

    const isPublished = random() > 0.15;
    const publishedAt = isPublished ? new Date(Date.now() - Math.floor(random() * 60) * 86400000) : null;

    const propertyData: Record<string, unknown> = {
      ownerId: owner._id,
      title,
      slug,
      description: `${title}. Located in ${loc.locality}, ${loc.city}, ${loc.state}. This ${pType.toLowerCase().replace(/_/g, ' ')} offers ${area} sqft with ${bedrooms} bedroom(s) and ${bathrooms} bathroom(s). ${furnishing === 'FULLY_FURNISHED' ? 'Fully furnished with modern amenities.' : furnishing === 'SEMI_FURNISHED' ? 'Semi-furnished with essential fittings.' : 'Unfurnished, ready for your personal touch.'} Close to schools, hospitals, shopping centres and public transport.`,
      propertyType: pType,
      rent,
      securityDeposit,
      maintenance,
      maintenanceIncluded: maintenance === 0,
      brokerage: 0,
      brokerageApplicable: false,
      furnishing,
      bedrooms,
      bathrooms,
      area,
      areaUnit: 'SQFT' as const,
      amenities,
      images,
      availabilityStatus: random() > 0.2 ? 'AVAILABLE' : 'OCCUPIED',
      tenantPreferences: [pick(tenantPreferences)],
      location: {
        type: 'Point' as const,
        coordinates: coords,
      },
      address: {
        street: `${Math.floor(1 + random() * 90)} ${pick(['Main Road', 'Cross Street', 'Market Road', 'Park Avenue', 'Ring Road'])}`,
        locality: loc.locality,
        city: loc.city,
        state: loc.state,
        postalCode: loc.postalCode,
        country: 'India',
      },
      citySlug: toSlug(loc.city),
      localitySlug: toSlug(loc.locality),
      listingStatus: isPublished ? 'PUBLISHED' : 'DRAFT',
      verificationStatus: random() > 0.25 ? 'VERIFIED' : random() > 0.5 ? 'PENDING' : 'UNVERIFIED',
      publishedAt,
      expiresAt: publishedAt ? new Date(publishedAt.getTime() + 90 * 86400000) : null,
      viewsCount: Math.floor(random() * 800),
      favoritesCount: Math.floor(random() * 90),
    };

    if (isShared) {
      propertyData.roomType = pick(roomTypes);
    } else {
      propertyData.bhk = bedrooms >= 5 ? '5_PLUS_BHK' : `${bedrooms}_BHK`;
      const floor = Math.floor(random() * 12) + 1;
      propertyData.floor = floor;
      propertyData.totalFloors = floor + Math.floor(random() * 6);
    }

    const createdProp = await PropertyModel.create(propertyData as unknown as Partial<Property>);
    existingSlugs.add(slug);
    createdCount++;
    console.log(`  [${createdCount}/${NEW_PROPERTY_COUNT}] ${createdProp.title} — ${loc.locality}, ${loc.city}`);

    if (reviewers.length > 0 && random() > 0.35) {
      const reviewer = pick(reviewers);
      const rating = Math.round(3 + random() * 2); // 3-5
      await ReviewModel.create({
        propertyId: createdProp._id,
        userId: reviewer._id,
        rating,
        comment: pick(reviewComments),
        status: random() > 0.3 ? 'APPROVED' : 'PENDING',
      });
    }
  }

  console.log(`\nCreated ${createdCount} new properties (skipped ${skippedCount} already present).`);

  // ============================================================
  // SUMMARY
  // ============================================================
  const finalUserCount = await UserModel.countDocuments();
  const finalPropertyCount = await PropertyModel.countDocuments();
  const finalReviewCount = await ReviewModel.countDocuments();

  console.log('\n===========================================');
  console.log('Seed Complete!');
  console.log(`Total users:      ${finalUserCount}`);
  console.log(`Total properties: ${finalPropertyCount}`);
  console.log(`Total reviews:    ${finalReviewCount}`);
  console.log('-------------------------------------------');
  console.log('Default credentials for login:');
  console.log('  Password: DevPassw0rd!');
  console.log('  Admin:     admin@example.com');
  console.log('  Moderator: moderator@example.com');
  console.log('  Owner:     owner@example.com');
  console.log('  Tenant:    tenant@example.com');
  console.log('  Extra Owners:  owner1@example.com ... owner20@example.com');
  console.log('  Extra Tenants: tenant1@example.com ... tenant20@example.com');
  console.log('===========================================\n');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
