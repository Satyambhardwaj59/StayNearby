import { Schema, model, type HydratedDocument, type InferSchemaType, type Model } from 'mongoose';

export const REPORT_REASONS = [
  'SPAM',
  'FRAUD_SCAM',
  'INCORRECT_DETAILS',
  'DUPLICATE_LISTING',
  'ABUSIVE_BEHAVIOR',
  'OTHER',
] as const;

export const REPORT_STATUSES = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

const reportSchema = new Schema(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    propertyId: { type: Schema.Types.ObjectId, ref: 'Property', default: null, index: true },
    reportedUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, required: true, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: REPORT_STATUSES,
      default: 'OPEN',
      index: true,
    },
    moderatorNotes: { type: String, default: null },
  },
  { timestamps: true },
);

export type Report = InferSchemaType<typeof reportSchema>;
export type ReportDocument = HydratedDocument<Report>;
export const ReportModel: Model<Report> = model<Report>('Report', reportSchema);
