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
exports.validateSettings = validateSettings;
exports.toPublicSettings = toPublicSettings;
exports.getPublicTrackingSettings = getPublicTrackingSettings;
exports.getAdminTrackingSettings = getAdminTrackingSettings;
exports.updateTrackingSettings = updateTrackingSettings;
const TrackingSettings_1 = __importStar(require("../models/TrackingSettings"));
const settingsKeys = {
    gtm: ["enabled", "containerId"],
    ga4: ["enabled", "measurementId"],
    metaPixel: ["enabled", "pixelId"],
    googleAds: ["enabled", "conversionId", "purchaseLabel"],
    serverSide: ["enabled", "stapeContainerUrl"],
};
function isSafeStapeUrl(value) {
    try {
        const url = new URL(value);
        const hostname = url.hostname.toLowerCase();
        return (url.protocol === "https:" &&
            /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(hostname) &&
            !/^\d+(?:\.\d+){3}$/.test(hostname) &&
            !hostname.endsWith(".localhost") &&
            !hostname.endsWith(".local") &&
            !url.username &&
            !url.password &&
            !url.port &&
            !url.search &&
            !url.hash &&
            (url.pathname === "/" || url.pathname === ""));
    }
    catch {
        return false;
    }
}
function validateSettings(input) {
    const errors = {};
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return { errors: { settings: "Settings must be an object." } };
    }
    const source = input;
    for (const key of Object.keys(source)) {
        if (!Object.prototype.hasOwnProperty.call(settingsKeys, key)) {
            errors[key] = "Unknown setting.";
        }
    }
    const settings = structuredClone(TrackingSettings_1.DEFAULT_TRACKING_SETTINGS);
    for (const [section, fields] of Object.entries(settingsKeys)) {
        const rawSection = source[section];
        if (!rawSection || typeof rawSection !== "object" || Array.isArray(rawSection)) {
            errors[section] = "This section is required.";
            continue;
        }
        const values = rawSection;
        for (const key of Object.keys(values)) {
            if (!fields.includes(key))
                errors[`${section}.${key}`] = "Unknown setting.";
        }
        if (typeof values.enabled !== "boolean") {
            errors[`${section}.enabled`] = "Choose whether this integration is enabled.";
        }
        for (const field of fields.filter((name) => name !== "enabled")) {
            if (typeof values[field] !== "string") {
                errors[`${section}.${field}`] = "Enter a text value.";
            }
            else if (values[field].length > 300) {
                errors[`${section}.${field}`] = "Value must be 300 characters or fewer.";
            }
            else {
                settings[section][field] =
                    values[field].trim();
            }
        }
        if (typeof values.enabled === "boolean") {
            settings[section].enabled = values.enabled;
        }
    }
    const requireValue = (enabled, value, field) => {
        if (enabled && !value)
            errors[field] = "A value is required when enabled.";
    };
    const validateId = (enabled, value, pattern, field) => {
        requireValue(enabled, value, field);
        if (value && !pattern.test(value))
            errors[field] = "Enter a valid identifier.";
    };
    validateId(settings.gtm.enabled, settings.gtm.containerId, /^GTM-[A-Z0-9]+$/, "gtm.containerId");
    validateId(settings.ga4.enabled, settings.ga4.measurementId, /^G-[A-Z0-9]+$/, "ga4.measurementId");
    validateId(settings.metaPixel.enabled, settings.metaPixel.pixelId, /^\d{5,20}$/, "metaPixel.pixelId");
    validateId(settings.googleAds.enabled, settings.googleAds.conversionId, /^AW-\d{6,20}$/, "googleAds.conversionId");
    if (settings.googleAds.enabled && !settings.googleAds.purchaseLabel) {
        errors["googleAds.purchaseLabel"] = "A purchase conversion label is required when enabled.";
    }
    if (settings.googleAds.purchaseLabel &&
        !/^[A-Za-z0-9_-]{1,150}$/.test(settings.googleAds.purchaseLabel)) {
        errors["googleAds.purchaseLabel"] = "Use only letters, numbers, hyphens, and underscores.";
    }
    requireValue(settings.serverSide.enabled, settings.serverSide.stapeContainerUrl, "serverSide.stapeContainerUrl");
    if (settings.serverSide.stapeContainerUrl) {
        if (!isSafeStapeUrl(settings.serverSide.stapeContainerUrl)) {
            errors["serverSide.stapeContainerUrl"] =
                "Enter a secure HTTPS hostname without credentials, a port, path, or query string.";
        }
    }
    return Object.keys(errors).length ? { errors } : { settings };
}
function toPublicSettings(value) {
    return {
        gtm: {
            enabled: value?.gtm?.enabled === true,
            containerId: typeof value?.gtm?.containerId === "string" ? value.gtm.containerId : "",
        },
        ga4: {
            enabled: value?.ga4?.enabled === true,
            measurementId: typeof value?.ga4?.measurementId === "string" ? value.ga4.measurementId : "",
        },
        metaPixel: {
            enabled: value?.metaPixel?.enabled === true,
            pixelId: typeof value?.metaPixel?.pixelId === "string" ? value.metaPixel.pixelId : "",
        },
        googleAds: {
            enabled: value?.googleAds?.enabled === true,
            conversionId: typeof value?.googleAds?.conversionId === "string" ? value.googleAds.conversionId : "",
            purchaseLabel: typeof value?.googleAds?.purchaseLabel === "string" ? value.googleAds.purchaseLabel : "",
        },
        serverSide: {
            enabled: value?.serverSide?.enabled === true,
            stapeContainerUrl: typeof value?.serverSide?.stapeContainerUrl === "string"
                ? value.serverSide.stapeContainerUrl
                : "",
        },
    };
}
async function getPublicTrackingSettings(_req, res) {
    const document = await TrackingSettings_1.default.findOne({ key: "tracking" }).lean();
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({
        success: true,
        settings: toPublicSettings(document?.settings),
    });
}
async function getAdminTrackingSettings(_req, res) {
    const document = await TrackingSettings_1.default.findOne({ key: "tracking" }).lean();
    res.set("Cache-Control", "no-store");
    res.json({
        success: true,
        settings: toPublicSettings(document?.settings),
    });
}
async function updateTrackingSettings(req, res) {
    const result = validateSettings(req.body?.settings);
    if ("errors" in result) {
        res.status(400).json({
            success: false,
            message: "Tracking settings are invalid.",
            errors: result.errors,
        });
        return;
    }
    const document = await TrackingSettings_1.default.findOneAndUpdate({ key: "tracking" }, { $set: { settings: result.settings } }, { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }).lean();
    if (!document)
        throw new Error("Tracking settings could not be persisted.");
    res.set("Cache-Control", "no-store");
    res.json({ success: true, settings: toPublicSettings(document?.settings) });
}
