import TeacherProfile from "../models/TeacherProfile";
import type { FilterQuery } from "mongoose";
import type { ITeacherProfile } from "../models/TeacherProfile";

const BASE_URL_RE = /^(https?:\/\/)?(www\.)?/i;
const TRIM_RE = /^\/+|\/+$/g;
const NORMALIZE_RE = /[^a-z0-9-]+/g;
const DASH_RE = /-+/g;

export function slugifyBase(input: string): string {
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

export async function generateUniqueSlug(
  candidate: string,
  selfId?: unknown,
): Promise<string> {
  const base = slugifyBase(candidate) || "teacher";
  const filter: FilterQuery<ITeacherProfile> = {
    slug: new RegExp(`^${escapeRegExp(base)}(-\\d+)?$`, "i"),
  };
  if (selfId) filter._id = { $ne: selfId };

  const taken = await TeacherProfile.find(filter).select("slug").lean();
  if (taken.length === 0) return base;

  const usedNumbers = new Set<number>();
  for (const doc of taken) {
    const match = doc.slug.match(/-(\d+)$/);
    if (match) usedNumbers.add(parseInt(match[1], 10));
    else usedNumbers.add(1);
  }
  let suffix = 2;
  while (usedNumbers.has(suffix)) suffix++;
  return `${base}-${suffix}`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}