import mongoose, { Document, Schema } from "mongoose";

export interface IGalleryImage {
  url: string;
  alt: string;
}

export interface IGallery extends Document {
  rowOneImages: IGalleryImage[];
  rowTwoImages: IGalleryImage[];
}

const GallerySchema: Schema = new Schema(
  {
    rowOneImages: [{ url: String, alt: String }],
    rowTwoImages: [{ url: String, alt: String }],
  },
  { timestamps: true }
);

export default mongoose.model<IGallery>("Gallery", GallerySchema);