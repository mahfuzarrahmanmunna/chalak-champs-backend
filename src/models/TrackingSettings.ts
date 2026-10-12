import mongoose, { Document, Schema } from "mongoose";

export interface TrackingSettingsValues {
  gtm: {
    enabled: boolean;
    containerId: string;
  };
  ga4: {
    enabled: boolean;
    measurementId: string;
  };
  metaPixel: {
    enabled: boolean;
    pixelId: string;
  };
  googleAds: {
    enabled: boolean;
    conversionId: string;
    purchaseLabel: string;
  };
  serverSide: {
    enabled: boolean;
    stapeContainerUrl: string;
  };
}

export interface ITrackingSettings extends Document {
  key: "tracking";
  settings: TrackingSettingsValues;
  updatedAt: Date;
}

export const DEFAULT_TRACKING_SETTINGS: TrackingSettingsValues = {
  gtm: { enabled: false, containerId: "" },
  ga4: { enabled: false, measurementId: "" },
  metaPixel: { enabled: false, pixelId: "" },
  googleAds: { enabled: false, conversionId: "", purchaseLabel: "" },
  serverSide: { enabled: false, stapeContainerUrl: "" },
};

const TrackingSettingsSchema = new Schema<ITrackingSettings>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "tracking",
      immutable: true,
    },
    settings: {
      gtm: {
        enabled: { type: Boolean, default: false },
        containerId: { type: String, default: "" },
      },
      ga4: {
        enabled: { type: Boolean, default: false },
        measurementId: { type: String, default: "" },
      },
      metaPixel: {
        enabled: { type: Boolean, default: false },
        pixelId: { type: String, default: "" },
      },
      googleAds: {
        enabled: { type: Boolean, default: false },
        conversionId: { type: String, default: "" },
        purchaseLabel: { type: String, default: "" },
      },
      serverSide: {
        enabled: { type: Boolean, default: false },
        stapeContainerUrl: { type: String, default: "" },
      },
    },
  },
  { timestamps: true, minimize: false },
);

export default (mongoose.models.TrackingSettings as
  | mongoose.Model<ITrackingSettings>
  | undefined) ||
  mongoose.model<ITrackingSettings>("TrackingSettings", TrackingSettingsSchema);
