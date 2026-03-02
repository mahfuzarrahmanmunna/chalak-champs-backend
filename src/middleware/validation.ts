// src/middleware/validation.ts
import { Request, Response, NextFunction } from "express";
import Joi from "joi";

export const validateCourse = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const schema = Joi.object({
    title: Joi.string().min(3).required(),
    titleBn: Joi.string().optional(),
    description: Joi.string().min(10).required(),
    descriptionBn: Joi.string().optional(),
    category: Joi.string()
      .valid(
        "competition-prep",
        "language",
        "school-subjects",
        "skill-development",
        "other",
      )
      .required(),
    level: Joi.string()
      .valid("beginner", "intermediate", "advanced")
      .required(),
    language: Joi.string().valid("en", "bn").default("en"),
    price: Joi.number().min(0).required(),
    duration: Joi.number().min(0).optional(),
    tags: Joi.array().items(Joi.string()).default([]),
    objectives: Joi.array().items(Joi.string()).default([]),
    requirements: Joi.array().items(Joi.string()).default([]),
    isPublished: Joi.boolean().default(false),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      details: error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      })),
    });
  }

  next();
};

export const validateUser = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    firstName: Joi.string().min(1).required(),
    lastName: Joi.string().min(1).required(),
    phoneNumber: Joi.string().optional(),
    role: Joi.string().valid("admin", "student").default("student"),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: "Validation error",
      details: error.details.map((detail) => ({
        field: detail.path[0],
        message: detail.message,
      })),
    });
  }

  next();
};
