// src/types/course.ts

export interface BilingualText {
  en: string;
  bn: string;
}

export interface BilingualArray {
  en: string[];
  bn: string[];
}

export interface HeroSection {
  title: BilingualText;
  subtitle: BilingualText;
}

export interface QuickInfoSection {
  title: BilingualText;
  items: BilingualArray;
  offerPrice: BilingualText;
  offerText: BilingualText;
  cta1: BilingualText;
  cta2: BilingualText;
  ctaBelow: BilingualText;
}

export interface LevelDetail {
  title: BilingualText;
  for: BilingualText;
  intro: BilingualText;
  items: BilingualArray;
}

export interface LevelsSection {
  title: BilingualText;
  intro: BilingualText;
  level1: LevelDetail;
  level2: LevelDetail;
}

export interface WhoIsThisForSection {
  title: BilingualText;
  intro: BilingualText;
  items: BilingualArray;
  boldStatement: BilingualText;
}

export interface FeatureCard {
  title: BilingualText;
  body: BilingualText;
}

export interface FeaturesSection {
  title: BilingualText;
  cards: FeatureCard[];
}

export interface SyllabusSection {
  title: BilingualText;
  content: BilingualText;
}

export interface FinalCtaSection {
  title: BilingualText;
  body: BilingualText;
  cta1: BilingualText;
  cta2: BilingualText;
  cta3: BilingualText;
  ctaBelow: BilingualText;
}

export interface PaymentSection {
  title: BilingualText;
  description: BilingualText;
}

export interface InstructorSection {
  title: BilingualText;
  name: string;
  designation: BilingualText;
  bio: BilingualText;
  experience: BilingualText;
  studentsCount: number;
  rating: number;
  specializations: BilingualArray;
  achievements: BilingualArray;
  education: BilingualText;
  image: string;
  social: {
    facebook?: string;
    linkedin?: string;
    youtube?: string;
  };
}

export interface FaqItem {
  q: BilingualText;
  a: BilingualText;
}

export interface FaqSection {
  title: BilingualText;
  items: FaqItem[];
}

export interface MediaAsset {
  type: "image" | "video";
  src: string;
  poster?: string;
}

export interface ReviewSection {
  title: BilingualText;
}

// Complete Course Data Structure
export interface CourseContentData {
  breadcrumb: BilingualText;
  hero: HeroSection;
  quickInfo: QuickInfoSection;
  overview: {
    title: BilingualText;
    content: BilingualText;
  };
  levels: LevelsSection;
  whoIsThisFor: WhoIsThisForSection;
  features: FeaturesSection;
  syllabus: SyllabusSection;
  finalCta: FinalCtaSection;
  payment: PaymentSection;
  instructor: InstructorSection;
  review: ReviewSection;
  faq: FaqSection;
  mediaAssets: MediaAsset[];
}

export interface CourseFormData {
  slug: string;
  title: BilingualText;
  category: string;
  price: number;
  originalPrice?: number;
  duration: BilingualText;
  isPublished: boolean;

  thumbnail?: File;
  mediaAssets: MediaAssetInput[];

  content: CourseContentData;
}

export interface MediaAssetInput {
  type: "image" | "video";
  src: string;
  poster?: string;
  file?: File;
}