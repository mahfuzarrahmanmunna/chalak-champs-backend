import mongoose, { Document, Schema } from "mongoose";

export interface IHero extends Document {
  lang: string;
  title: string;
  subtitle: string;
  ctaButton: string;
  secondaryLink: string;
  cta2: string;
  cta2Btn: string;
  kingImage?: string;
}

const HeroSchema: Schema = new Schema(
  {
    lang: { type: String, required: true, unique: true, enum: ["en", "bn"] },
    title: { type: String, required: true },
    subtitle: { type: String, required: true },
    ctaButton: { type: String, required: true },
    secondaryLink: { type: String, required: true },
    cta2: { type: String, required: true },
    cta2Btn: { type: String, required: true },
    kingImage: { type: String, required: false },
  },
  { timestamps: true }
);

export default mongoose.model<IHero>("Hero", HeroSchema);