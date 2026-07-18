import mongoose, { Document, Schema } from "mongoose";

export interface IVideoItem {
  youtubeId: string;
  thumbnail: string; // Custom thumbnail URL or base64
  order: number;
  isActive: boolean;
}

export interface IVideoGallery extends Document {
  title: string;
  subtitle: string;
  videos: IVideoItem[];
}

const VideoItemSchema = new Schema<IVideoItem>({
  youtubeId: { type: String, required: true },
  thumbnail: { type: String, required: true },
  order: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
});

const VideoGallerySchema: Schema = new Schema(
  {
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    videos: [VideoItemSchema],
  },
  { timestamps: true }
);

// We only want one document for this section, so we can fake a singleton
export default mongoose.models.VideoGallery || mongoose.model<IVideoGallery>("VideoGallery", VideoGallerySchema);