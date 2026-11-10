"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugifyBase = slugifyBase;
exports.generateUniqueSlug = generateUniqueSlug;
const TeacherProfile_1 = __importDefault(require("../models/TeacherProfile"));
const BASE_URL_RE = /^(https?:\/\/)?(www\.)?/i;
const TRIM_RE = /^\/+|\/+$/g;
const NORMALIZE_RE = /[^a-z0-9-]+/g;
const DASH_RE = /-+/g;
function slugifyBase(input) {
    return (input || "")
        .toString()
        .toLowerCase()
        .trim()
        .replace(BASE_URL_RE, "")
        .replace(TRIM_RE, "")
        .replace(/\s+/g, "-")
        .replace(/&/g, "and")
        .replace(NORMALIZE_RE, "")
        .replace(DASH_RE, "-")
        .slice(0, 80)
        .replace(/^-+|-+$/g, "");
}
async function generateUniqueSlug(candidate, selfId) {
    const base = slugifyBase(candidate) || "teacher";
    const filter = {
        slug: new RegExp(`^${escapeRegExp(base)}(-\\d+)?$`, "i"),
    };
    if (selfId)
        filter._id = { $ne: selfId };
    const taken = await TeacherProfile_1.default.find(filter).select("slug").lean();
    if (taken.length === 0)
        return base;
    const usedNumbers = new Set();
    for (const doc of taken) {
        const match = doc.slug.match(/-(\d+)$/);
        if (match)
            usedNumbers.add(parseInt(match[1], 10));
        else
            usedNumbers.add(1);
    }
    let suffix = 2;
    while (usedNumbers.has(suffix))
        suffix++;
    return `${base}-${suffix}`;
}
function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
