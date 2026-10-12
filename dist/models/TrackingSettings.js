"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TRACKING_SETTINGS = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.DEFAULT_TRACKING_SETTINGS = {
    gtm: { enabled: false, containerId: "" },
    ga4: { enabled: false, measurementId: "" },
    metaPixel: { enabled: false, pixelId: "" },
    googleAds: { enabled: false, conversionId: "", purchaseLabel: "" },
    serverSide: { enabled: false, stapeContainerUrl: "" },
};
const TrackingSettingsSchema = new mongoose_1.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        default: "tracking",
        immutable: true,
    },
    settings: {
        gtm: {
            enabled: { type: Boolean, default: false },
            containerId: { type: String, default: "" },
        },
        ga4: {
            enabled: { type: Boolean, default: false },
            measurementId: { type: String, default: "" },
        },
        metaPixel: {
            enabled: { type: Boolean, default: false },
            pixelId: { type: String, default: "" },
        },
        googleAds: {
            enabled: { type: Boolean, default: false },
            conversionId: { type: String, default: "" },
            purchaseLabel: { type: String, default: "" },
        },
        serverSide: {
            enabled: { type: Boolean, default: false },
            stapeContainerUrl: { type: String, default: "" },
        },
    },
}, { timestamps: true, minimize: false });
exports.default = mongoose_1.default.models.TrackingSettings ||
    mongoose_1.default.model("TrackingSettings", TrackingSettingsSchema);
