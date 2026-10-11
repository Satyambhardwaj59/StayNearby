import { Schema, model, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';
import {
  PROPERTY_TYPES,
  ROOM_TYPES,
  BHK_TYPES,
  FURNISHING_TYPES,
  TENANT_PREFERENCES,
  AVAILABILITY_STATUSES,
  LISTING_STATUSES,
  VERIFICATION_STATUSES,
  LOCATION_PRIVACY,
  AREA_UNITS,
  AMENITIES,
} from '../../../shared/constants/property';

const geoPointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true }, // [longitude, latitude]
  },
  { _id: false },
);

const addressSchema = new Schema(
  {
    street: { type: String, default: null, maxlength: 200 },
    locality: { type: String, required: true, maxlength: 100 },
    city: { type: String, required: true, maxlength: 80 },
    state: { type: String, required: true, maxlength: 80 },
    postalCode: { type: String, default: null, maxlength: 20 },
    country: { type: String, default: 'India', maxlength: 60 },
    landmark: { type: String, default: null, maxlength: 200 },
  },
  { _id: false },
);

const propertyImageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, default: null },
    alt: { type: String, default: '' },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    isCover: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { _id: false },
);

const contactSchema = new Schema(
  {
    phone: { type: String, default: null },
    email: { type: String, default: null },
    revealRequirement: {
      type: String,
      enum: ['NONE', 'LOGIN_REQUIRED', 'CONTACT_REQUIRED', 'VISIT_REQUEST_REQUIRED'],
      default: 'LOGIN_REQUIRED',
    },
  },
  { _id: false },
);

const nearbyPlaceSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, required: true }, // COLLEGE | OFFICE | HOSPITAL | METRO | BUS | MARKET
    distanceMeters: { type: Number, required: true },
    distanceLabel: { type: String, required: true },
  },
  { _id: false },
);

const propertySchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, minlength: 10, maxlength: 150 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, required: true, trim: true, minlength: 20, maxlength: 5000 },
    propertyType: { type: String, enum: PROPERTY_TYPES, required: true, index: true },
    roomType: { type: String, enum: ROOM_TYPES, default: null },
    bhk: { type: String, enum: BHK_TYPES, default: null },
    rent: { type: Number, required: true, min: 0, index: true },
    securityDeposit: { type: Number, required: true, min: 0 },
    maintenance: { type: Number, default: null },
    maintenanceIncluded: { type: Boolean, default: false },
    brokerage: { type: Number, default: null },
    brokerageApplicable: { type: Boolean, default: false },
    availabilityStatus: {
      type: String,
      enum: AVAILABILITY_STATUSES,
      default: 'AVAILABLE',
      index: true,
    },
    availableFrom: { type: Date, default: null },
    moveInDateNotBefore: { type: Date, default: null },
    tenantPreferences: { type: [String], enum: TENANT_PREFERENCES, default: ['ANYONE'] },
    furnishing: { type: String, enum: FURNISHING_TYPES, required: true, index: true },
    bedrooms: { type: Number, default: null, min: 0, max: 20 },
    bathrooms: { type: Number, default: null, min: 0, max: 20 },
    area: { type: Number, default: null, min: 0 },
    areaUnit: { type: String, enum: AREA_UNITS, default: 'SQFT' },
    floor: { type: Number, default: null },
    totalFloors: { type: Number, default: null },
    amenities: { type: [String], enum: AMENITIES, default: [] },
    images: { type: [propertyImageSchema], default: [] },

    // Location
    location: { type: geoPointSchema, required: true },
    address: { type: addressSchema, required: true },
    locationPrivacy: { type: String, enum: LOCATION_PRIVACY, default: 'LOGGED_IN_USERS' },
    citySlug: { type: String, required: true, lowercase: true, trim: true, index: true },
    localitySlug: { type: String, required: true, lowercase: true, trim: true, index: true },
    nearbyPlaces: { type: [nearbyPlaceSchema], default: [] },

    // Contact
    contact: { type: contactSchema, default: () => ({}) },

    // Lifecycle
    listingStatus: {
      type: String,
      enum: LISTING_STATUSES,
      default: 'DRAFT',
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: VERIFICATION_STATUSES,
      default: 'UNVERIFIED',
      index: true,
    },
    publishedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    lastBumpedAt: { type: Date, default: null },

    // Metrics
    viewsCount: { type: Number, default: 0 },
    favoritesCount: { type: Number, default: 0 },

    // Admin
    moderationNote: { type: String, default: null },
    rejectionReason: { type: String, default: null },
  },
  { timestamps: true },
);

// --- Indexes ---
// Geospatial: required for $near / $geoWithin queries
propertySchema.index({ location: '2dsphere' });

// Core search compound: status + city + rent + type
propertySchema.index({
  listingStatus: 1,
  citySlug: 1,
  rent: 1,
  propertyType: 1,
});

// Locality landing pages
propertySchema.index({ listingStatus: 1, localitySlug: 1, rent: 1 });

// Owner dashboard
propertySchema.index({ ownerId: 1, listingStatus: 1, createdAt: -1 });

// Expiration job
propertySchema.index({ listingStatus: 1, expiresAt: 1 }, { sparse: true });

// Full-text (title + description for keyword search fallback)
propertySchema.index({ title: 'text', description: 'text' });

export type Property = InferSchemaType<typeof propertySchema>;
export type PropertyDocument = HydratedDocument<Property>;
export const PropertyModel: Model<Property> = model<Property>('Property', propertySchema);
