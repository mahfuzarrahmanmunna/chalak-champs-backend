// src/controllers/lessonController.ts

import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../middleware/auth";
import { AppError, catchAsync } from "../middleware/errorHandler";
import Lesson from "../models/Lesson";
import Exam from "../models/Exam";
import Question from "../models/Question";

// --- TYPES ---
type MulterFiles = {
  [fieldname: string]: {
    buffer?: Buffer;
    path?: string;
    originalname?: string;
  }[];
};

type RequestWithFiles = Omit<AuthRequest, "files"> & { files?: MulterFiles };

const parseJSON = (value: any) => {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch (e) {
    return value;
  }
};

// =============================================
// 1. CREATE LESSON (with Exam Support)
// =============================================
export const createLesson = catchAsync(
  async (req: RequestWithFiles, res: Response, next: NextFunction) => {
    const moduleId = Array.isArray(req.params.moduleId)
      ? req.params.moduleId[0]
      : req.params.moduleId;

    // Verify module exists
    const Module = (await import("../models/Module")).default;
    const module = await Module.findById(moduleId);
    if (!module) return next(new AppError("Module not found", 404));

    // Determine order
    const lastLesson = await Lesson.findOne({ module: moduleId }).sort(
      "-order",
    );
    const nextOrder = lastLesson ? lastLesson.order + 1 : 1;

    const lessonType = req.body.type || "video";

    // ✅ Handle Exam-Type Lessons
    if (lessonType === "exam") {
      const examMode = req.body.examMode; // "existing" or "new"

      if (examMode === "existing" && req.body.examId) {
        // Link to existing exam
        if (!mongoose.Types.ObjectId.isValid(req.body.examId)) {
          return next(new AppError("Invalid exam ID", 400));
        }

        const existingExam = await Exam.findById(req.body.examId);
        if (!existingExam) {
          return next(new AppError("Selected exam not found", 404));
        }

        const lesson = await Lesson.create({
          module: moduleId,
          title: parseJSON(req.body.title) || { en: "Exam", bn: "পরীক্ষা" },
          type: "exam",
          order: nextOrder,
          duration: existingExam.duration,
          examId: existingExam._id,
          examConfig: {
            duration: existingExam.duration,
            passingMarks: existingExam.passingMarks,
            negativeMarking: existingExam.negativeMarking,
            isProctored: existingExam.isProctored,
            totalQuestions: existingExam.questionBank?.length || 0,
            totalMarks: existingExam.totalMarks,
          },
          isFreePreview: req.body.isFreePreview === "true",
        });

        return res.status(201).json({
          success: true,
          data: lesson,
          message: "Exam lesson created successfully",
        });
      } else if (examMode === "new") {
        // Create new exam and link it
        try {
          const questionsData = parseJSON(req.body.questions) || [];
          const questionIds: mongoose.Types.ObjectId[] = [];
          let computedTotalMarks = 0;

          // Create questions
          if (Array.isArray(questionsData) && questionsData.length > 0) {
            for (const qData of questionsData) {
              const textValue =
                typeof qData.text === "object"
                  ? qData.text.en || qData.text.bn || JSON.stringify(qData.text)
                  : qData.text || "";

              const marksValue = Number(qData.marks) || 1;
              computedTotalMarks += marksValue;

              const question = await Question.create({
                type: qData.type || "mcq",
                text: textValue,
                options: Array.isArray(qData.options) ? qData.options : [],
                correctAnswer: qData.correctAnswer,
                marks: marksValue,
                difficulty: qData.difficulty || "medium",
                explanation: qData.explanation,
              });

              questionIds.push(question._id);
            }
          }

          // Create exam
          const parsedDuration = Number(req.body.examDuration) || 60;
          const parsedPassingMarks = Number(req.body.examPassingMarks) || 50;
          const parsedNegativeMarking =
            Number(req.body.examNegativeMarking) || 0;
          const parsedIsProctored =
            req.body.examIsProctored === "true" ||
            req.body.examIsProctored === true;

          const examData: any = {
            title: parseJSON(req.body.examTitle) || {
              en: "Untitled Exam",
              bn: "শিরোনামহীন পরীক্ষা",
            },
            description: parseJSON(req.body.examDescription),
            duration: parsedDuration,
            totalMarks: computedTotalMarks,
            passingMarks: parsedPassingMarks,
            negativeMarking: parsedNegativeMarking,
            isProctored: parsedIsProctored,
            questionBank: questionIds,
            createdBy: req.user?._id,
          };

          // Handle exam thumbnail if provided
          if (req.files?.thumbnail?.[0]) {
            const { uploadToImgBB, deleteLocalFile } =
              await import("../utils/imgbb");
            const file = req.files.thumbnail[0];
            const payload = file.buffer ? file.buffer : file.path;
            const result = await uploadToImgBB(payload as any);
            examData.image = result.url;
            if (file.path) deleteLocalFile(file.path);
          }

          const newExam = await Exam.create(examData);

          // Create lesson linked to new exam
          const lesson = await Lesson.create({
            module: moduleId,
            title: parseJSON(req.body.title) || { en: "Exam", bn: "পরীক্ষা" },
            type: "exam",
            order: nextOrder,
            duration: parsedDuration,
            examId: newExam._id,
            examConfig: {
              duration: parsedDuration,
              passingMarks: parsedPassingMarks,
              negativeMarking: parsedNegativeMarking,
              isProctored: parsedIsProctored,
              totalQuestions: questionIds.length,
              totalMarks: computedTotalMarks,
            },
            isFreePreview: req.body.isFreePreview === "true",
          });

          return res.status(201).json({
            success: true,
            data: lesson,
            exam: newExam,
            message: "Exam lesson created successfully with new exam",
          });
        } catch (error: any) {
          return next(
            new AppError(error.message || "Failed to create exam lesson", 500),
          );
        }
      } else {
        return next(
          new AppError(
            "Please select an existing exam or create a new one",
            400,
          ),
        );
      }
    }

    // ✅ Handle Non-Exam Lessons (video, pdf, etc.)
    const lessonData: any = {
      module: moduleId,
      title: parseJSON(req.body.title) || { en: "", bn: "" },
      type: lessonType,
      videoUrl: req.body.videoUrl,
      content: req.body.content,
      order: nextOrder,
      duration: parseInt(req.body.duration) || 0,
      resources: parseJSON(req.body.resources) || [],
      quiz: parseJSON(req.body.quiz) || [],
      isFreePreview: req.body.isFreePreview === "true",
    };

    // Handle video upload if provided
    if (req.files?.video?.[0]) {
      const { uploadToImgBB, deleteLocalFile } = await import("../utils/imgbb");
      const file = req.files.video[0];
      const payload = file.buffer ? file.buffer : file.path;
      const result = await uploadToImgBB(payload as any);
      lessonData.videoUrl = result.url;
      if (file.path) deleteLocalFile(file.path);
    }

    const lesson = await Lesson.create(lessonData);

    res.status(201).json({
      success: true,
      data: lesson,
      message: "Lesson created successfully",
    });
  },
);

// =============================================
// 2. UPDATE LESSON (with Exam Support)
// =============================================
export const updateLesson = catchAsync(
  async (req: RequestWithFiles, res: Response, next: NextFunction) => {
    const { lessonId } = req.params;

    let lesson = await Lesson.findById(lessonId);
    if (!lesson) return next(new AppError("Lesson not found", 404));

    try {
      // Update basic fields
      if (req.body.title)
        lesson.title = parseJSON(req.body.title) || lesson.title;
      if (req.body.duration) lesson.duration = parseInt(req.body.duration);
      if (req.body.content) lesson.content = req.body.content;
      if (req.body.videoUrl) lesson.videoUrl = req.body.videoUrl;
      if (typeof req.body.isFreePreview !== "undefined") {
        lesson.isFreePreview = req.body.isFreePreview === "true";
      }

      // ✅ Handle Exam-Related Updates
      if (lesson.type === "exam") {
        if (req.body.examMode === "existing" && req.body.examId) {
          // Link to different existing exam
          const existingExam = await Exam.findById(req.body.examId);
          if (!existingExam) {
            return next(new AppError("Selected exam not found", 404));
          }
          lesson.examId = existingExam._id;
          lesson.examConfig = {
            duration: existingExam.duration,
            passingMarks: existingExam.passingMarks,
            negativeMarking: existingExam.negativeMarking,
            isProctored: existingExam.isProctored,
            totalQuestions: existingExam.questionBank?.length || 0,
            totalMarks: existingExam.totalMarks,
          };
          lesson.duration = existingExam.duration;
        }
      }

      // Handle video upload if provided
      if (req.files?.video?.[0]) {
        const { uploadToImgBB, deleteLocalFile } =
          await import("../utils/imgbb");
        const file = req.files.video[0];
        const payload = file.buffer ? file.buffer : file.path;
        const result = await uploadToImgBB(payload as any);
        lesson.videoUrl = result.url;
        if (file.path) deleteLocalFile(file.path);
      }

      await lesson.save();

      res.status(200).json({
        success: true,
        data: lesson,
        message: "Lesson updated successfully",
      });
    } catch (error: any) {
      return next(
        new AppError(error.message || "Failed to update lesson", 500),
      );
    }
  },
);

// =============================================
// 3. DELETE LESSON
// =============================================
export const deleteLesson = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { lessonId } = req.params;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) return next(new AppError("Lesson not found", 404));

    // Optional: Also delete the linked exam if needed
    // Uncomment if you want cascade delete
    // if (lesson.type === "exam" && lesson.examId) {
    //   await Exam.findByIdAndDelete(lesson.examId);
    // }

    await lesson.deleteOne();

    res.status(200).json({
      success: true,
      message: "Lesson deleted successfully",
    });
  },
);

// =============================================
// 4. GET AVAILABLE EXAMS (for dropdown)
// =============================================
export const getAvailableExams = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const exams = await Exam.find({
      createdBy: req.user?._id,
      isActive: true,
    })
      .select("_id title duration totalMarks passingMarks questionBank")
      .populate("questionBank", "_id")
      .sort("-createdAt");

    const formattedExams = exams.map((exam: any) => ({
      _id: exam._id,
      title: exam.title,
      duration: exam.duration,
      totalMarks: exam.totalMarks,
      passingMarks: exam.passingMarks,
      questionCount: exam.questionBank?.length || 0,
    }));

    res.status(200).json({
      success: true,
      data: formattedExams,
    });
  },
);
