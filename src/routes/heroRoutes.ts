import { Router } from "express";
import * as heroController from "../controllers/heroController";

const router = Router();

router.get("/:lang", heroController.getHero);

router.post("/", heroController.upsertHero);


export default router;
