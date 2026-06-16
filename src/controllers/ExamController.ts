import mongoose from "mongoose";
import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../middleware/auth";
import { AppError, catchAsync } from "../middleware/errorHandler";
import {
  uploadToImgBB,
  deleteLocalFile,
  deleteFromImgBB,
} from "../utils/imgbb";
import Exam, { IExam } from "../models/Exam";
import Question from "../models/Question";
import Submission, { ISubmission } from "../models/Submission";

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

// 1. CREATE EXAM
export const createExam = catchAsync(
  async (req: RequestWithFiles, res: Response, next: NextFunction) => {
    const { user } = req;
    const files = req.files as MulterFiles;

    try {
      // Handle Question Image (if uploading directly)
      let questionImageUrl: string | undefined;
      if (files && files.image && files.image[0]) {
        const file = files.image[0];
        const payload = file.buffer ? file.buffer : file.path;
        const data = await uploadToImgBB(payload as any);
        questionImageUrl = data.url;
        if (file.path) deleteLocalFile(file.path);
      }

      const parsedQuestionBank = parseJSON(req.body.questionBank) || [];
      const questionIds: mongoose.Types.ObjectId[] = [];
      let computedTotalMarks = 0;

      if (Array.isArray(parsedQuestionBank) && parsedQuestionBank.length > 0) {
        const firstItem = parsedQuestionBank[0];

        if (typeof firstItem === "object" && firstItem !== null) {
          for (const questionData of parsedQuestionBank) {
            const textValue =
              typeof questionData.text === "object"
                ? questionData.text.en || questionData.text.bn || JSON.stringify(questionData.text)
                : questionData.text || "";

            const marksValue = Number(questionData.marks) || 0;
            computedTotalMarks += marksValue;

            const question = await Question.create({
              type: questionData.type,
              text: textValue,
              options: Array.isArray(questionData.options) ? questionData.options : [],
              correctAnswer: questionData.correctAnswer,
              marks: marksValue,
              difficulty: questionData.difficulty || "medium",
              image: questionData.image,
              explanation: questionData.explanation,
              subject: questionData.subject,
            });

            questionIds.push(question._id);
          }
        } else {
          // Assume an array of existing question IDs
          for (const questionId of parsedQuestionBank) {
            if (mongoose.Types.ObjectId.isValid(questionId)) {
              questionIds.push(new mongoose.Types.ObjectId(questionId));
            }
          }

          if (questionIds.length > 0 && !req.body.totalMarks) {
            const questions = await Question.find({ _id: { $in: questionIds } });
            computedTotalMarks = questions.reduce(
              (sum, item) => sum + (item.marks || 0),
              0,
            );
          }
        }
      }

      const parsedDuration = Number(req.body.duration) || 0;
      const parsedPassingMarks = Number(req.body.passingMarks) || 0;
      const parsedNegativeMarking = Number(req.body.negativeMarking) || 0;
      const parsedIsProctored = req.body.isProctored === "true" || req.body.isProctored === true;

      const examData: any = {
        ...req.body,
        createdBy: user?._id,
        duration: parsedDuration,
        totalMarks:
          !Number.isNaN(Number(req.body.totalMarks)) && req.body.totalMarks !== undefined
            ? Number(req.body.totalMarks)
            : computedTotalMarks,
        passingMarks: parsedPassingMarks,
        negativeMarking: parsedNegativeMarking,
        isProctored: parsedIsProctored,
        questionBank: questionIds,
      };

      if (questionImageUrl) {
        examData.image = questionImageUrl;
      }

      const exam = await Exam.create(examData);

      res.status(201).json({ success: true, data: exam });
    } catch (error: any) {
      return next(new AppError(error.message, 500));
    }
  },
);

// 2. START EXAM (Get Questions & Create Submission)
export const getExams = catchAsync(
  async (_req: AuthRequest, res: Response, _next: NextFunction) => {
    const exams = await Exam.find().populate("questionBank");
    res.status(200).json({ success: true, data: exams });
  },
);

export const startExam = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { examId } = req.params;
    const userId = req.user?._id;

    const exam = await Exam.findById(examId).populate("questionBank");
    if (!exam) return next(new AppError("Exam not found", 404));

    // Check if user already has an active submission
    const existingSubmission = await Submission.findOne({
      exam: examId,
      student: userId,
      status: "in-progress",
    });

    if (existingSubmission) {
      return res.status(200).json({
        success: true,
        exam,
        questions: exam.questionBank, // In real app, shuffle this
        submissionId: existingSubmission._id,
        message: "Resuming exam",
      });
    }

    // Select Questions (Randomize logic)
    let questions = exam.questionBank as any[];
    if (
      exam.randomSelectionCount &&
      exam.randomSelectionCount < questions.length
    ) {
      questions = questions
        .sort(() => 0.5 - Math.random())
        .slice(0, exam.randomSelectionCount);
    }

    // Create Submission Entry
    const submission = await Submission.create({
      exam: examId,
      student: userId,
      startTime: new Date(),
    });

    res.status(200).json({
      success: true,
      exam,
      questions,
      submissionId: submission._id,
    });
  },
);

// 3. LOG PROCTORING EVENT (Real-time)
export const logProctorEvent = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { submissionId, type, riskLevel, message } = req.body;

    const updateData: any = {
      $push: {
        proctorFlags: {
          type,
          riskLevel,
          message,
          timestamp: new Date(),
        },
      },
    };

    // Increment risk score based on severity
    if (riskLevel === "high") {
      updateData.$inc = { riskScore: 25 };
    } else if (riskLevel === "medium") {
      updateData.$inc = { riskScore: 10 };
    }

    await Submission.findByIdAndUpdate(submissionId, updateData);
    res.status(200).json({ success: true });
  },
);

// 4. SUBMIT EXAM (Auto-Grading)
export const submitExam = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    const { submissionId, answers } = req.body; // answers: [{ questionId, answer }]

    const submission = await Submission.findById(submissionId).populate("exam");
    if (!submission) return next(new AppError("Submission not found", 404));

    let totalScore = 0;
    const processedAnswers = [];
    const exam = submission.exam as unknown as IExam;

    for (const item of answers) {
      const question = await Question.findById(item.questionId);
      if (!question) continue;

      let isCorrect = false;

      // Logic for MCQ
      if (question.type === "mcq") {
        // Assuming correctAnswer stores the option string or index
        if (item.answer === question.correctAnswer) {
          isCorrect = true;
        }
      }
      // Logic for Fill Blank
      else if (question.type === "fill-blank") {
        if (
          item.answer.trim().toLowerCase() ===
          question.correctAnswer.toString().toLowerCase()
        ) {
          isCorrect = true;
        }
      }

      if (isCorrect) {
        totalScore += question.marks;
      } else if (exam?.negativeMarking > 0) {
        totalScore -= exam.negativeMarking;
      }

      processedAnswers.push({
        questionId: item.questionId,
        answer: item.answer,
      });
    }

    submission.answers = processedAnswers;
    submission.score = totalScore;
    submission.endTime = new Date();

    // Final Status Logic
    const riskScore = submission.riskScore || 0;
    submission.status = riskScore > 75 ? "flagged" : "submitted";

    await submission.save();

    res.status(200).json({
      success: true,
      score: totalScore,
      status: submission.status,
      riskScore: submission.riskScore,
    });
  },
);

export const gradeSubmission = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { submissionId } = req.params;
  const { manualScore, feedback } = req.body; // Frontend sends updated score and feedback
  const reviewerId = req.user?._id;

  const submission = await Submission.findById(submissionId).populate("exam student");
  if (!submission) return next(new AppError("Submission not found", 404));

  // Auth: Only admin or exam creator can grade
  // (Optional: Check if user created the exam referenced in submission.exam)

  try {
    // Update with Teacher's Override
    submission.score = parseInt(manualScore);
    submission.status = "graded";
    submission.gradingStatus = "graded";
    submission.reviewerId = reviewerId;
    submission.reviewedAt = new Date();

    // Handle Feedback
    if (feedback) {
      submission.reviewerFeedback = typeof feedback === "string" ? JSON.parse(feedback) : feedback;
    }

    await submission.save();

    // Update Student Analytics (Optional: You could emit an event or update User model here)

    res.status(200).json({
      success: true,
      message: "Grading completed successfully.",
      data: submission,
    });
  } catch (error: any) {
    return next(new AppError(error.message, 500));
  }
});

// Add a route for Teachers to see submissions needing review
export const getAllSubmissions = catchAsync(
  async (req: AuthRequest, res: Response, next: NextFunction) => {
  // Filter submissions that are "submitted" but not yet "graded"
  const submissions = await Submission.find({ status: "submitted" })
    .populate("exam student")
    .sort("-createdAt");

  res.status(200).json({ success: true, count: submissions.length, data: submissions });
});
