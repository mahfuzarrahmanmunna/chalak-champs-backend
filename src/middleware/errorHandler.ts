// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { logger } from "../utils/logger";

// Custom error class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: any;

  constructor(message: string, statusCode: number, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Handle MongoDB CastError
const handleCastErrorDB = (err: mongoose.CastError): AppError => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

// Handle MongoDB duplicate fields error
const handleDuplicateFieldsDB = (err: any): AppError => {
  const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)?.[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

// Handle MongoDB validation error
const handleValidationErrorDB = (
  err: mongoose.Error.ValidationError,
): AppError => {
  const errors = Object.values(err.errors).map((el) => ({
    field: el.path,
    message: el.message,
  }));

  const message = "Invalid input data";
  return new AppError(message, 400, errors);
};

// Handle JWT errors
const handleJWTError = (): AppError =>
  new AppError("Invalid token. Please log in again!", 401);

const handleJWTExpiredError = (): AppError =>
  new AppError("Your token has expired! Please log in again.", 401);

// Handle Multer errors
const handleMulterError = (err: any): AppError => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return new AppError("File too large. Maximum size is 100MB", 400);
  }
  if (err.message.includes("Only image files are allowed")) {
    return new AppError("Only image files are allowed for thumbnail", 400);
  }
  if (err.message.includes("Only video files are allowed")) {
    return new AppError("Only video files are allowed", 400);
  }
  return new AppError(err.message, 400);
};

// Send error in development
const sendErrorDev = (err: AppError, res: Response): void => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
    errors: err.errors,
  });
};

// Send error in production
const sendErrorProd = (err: AppError, res: Response): void => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error("ERROR 💥", err);

    res.status(500).json({
      success: false,
      message: "Something went wrong!",
      ...(process.env.NODE_ENV === "development" && {
        error: err.message,
        stack: err.stack,
      }),
    });
  }
};

// Main error handler middleware
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error(err);

  // Set default values
  error.statusCode = error.statusCode || 500;
  error.isOperational = error.isOperational || false;

  // Handle specific error types
  if (err.name === "CastError") error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (err.name === "ValidationError") error = handleValidationErrorDB(err);
  if (err.name === "JsonWebTokenError") error = handleJWTError();
  if (err.name === "TokenExpiredError") error = handleJWTExpiredError();
  if (err.name === "MulterError") error = handleMulterError(err);

  // Handle Joi validation errors
  if (err.isJoi) {
    error = new AppError(
      "Validation Error",
      400,
      err.details.map((detail: any) => ({
        field: detail.path[0],
        message: detail.message,
      })),
    );
  }

  // Handle file upload errors
  if (err.message.includes("File too large")) {
    error = new AppError("File too large. Maximum size is 100MB", 400);
  }

  // Handle unauthorized access
  if (
    err.message.includes("Unauthorized") ||
    err.message.includes("Forbidden")
  ) {
    error = new AppError(err.message, 403);
  }

  // Handle not found errors
  if (err.message.includes("not found")) {
    error = new AppError(err.message, 404);
  }

  // Send error response
  if (process.env.NODE_ENV === "development") {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// Async error wrapper for catch-all error handling
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

// 404 handler for undefined routes
export const notFound = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const err = new AppError(
    `Can't find ${req.originalUrl} on this server!`,
    404,
  );
  next(err);
};
