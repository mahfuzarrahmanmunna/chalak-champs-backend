"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const trackingSettingsController_1 = require("../controllers/trackingSettingsController");
const router = (0, express_1.Router)();
router.get("/public", trackingSettingsController_1.getPublicTrackingSettings);
exports.default = router;
