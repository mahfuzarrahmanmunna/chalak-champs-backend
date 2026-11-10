// src/app.ts
// Entry point used by Vercel (it auto-detects src/app.ts and serves its default export).
// The real app lives in expressApp.ts; MongoDB is connected lazily per /api request there.
// NOTE: Vercel only accepts an entrypoint that imports "express" directly — keep this import.
import express from "express";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { createExpressApp } from "./expressApp";

const app: express.Express = createExpressApp();

export default app;
