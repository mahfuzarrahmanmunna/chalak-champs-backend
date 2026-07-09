import "express";

declare module "express" {
  interface Request {
    imageUrl?: string;
    imageKey?: string;
  }
}
