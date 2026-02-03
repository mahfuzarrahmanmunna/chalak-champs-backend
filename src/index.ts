// src/index.ts

import express from "express";
import { Request, Response } from "express";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Routes
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Server is alive!" });
});

const startServer = async (): Promise<void> => {
  try {
    console.log("Starting server...");

    const server = app.listen(PORT, () => {
      console.log(`✅ Server is running on port ${PORT}`);
    });

    server.on("error", (error: Error) => {
      console.error("Server error:", error);
      throw error;
    });

    // Handle graceful shutdown
    process.on("SIGTERM", () => {
      console.log("SIGTERM received, shutting down gracefully");
      server.close(() => {
        console.log("Process terminated");
      });
    });
  } catch (error: any) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
