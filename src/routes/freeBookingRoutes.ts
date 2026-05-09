// src/routes/freeBookingRoutes.ts
import { Router } from "express";
import * as freeBookingController from "../controllers/freeBookingController";

const router = Router();

router.post("/", freeBookingController.createBooking);
router.get("/", freeBookingController.getAllBookings); 
router.delete("/:id", freeBookingController.deleteBooking);


export default router;
