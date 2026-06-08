// Shared utilities — sourced from shared.js (mirrors hub-sdk.js) for testability.
import { AVATAR_COLORS, memberColor, initial, esc, isAdult, formatRelativeDate, fmtMoney } from "./shared.js";
export { AVATAR_COLORS, memberColor, initial, esc, isAdult, formatRelativeDate, fmtMoney };

// ── Categories ─────────────────────────────────────────────────────────────────
export const CATEGORIES = [
  { id: "furniture",   label: "Furniture",   icon: "🛋️" },
  { id: "electronics", label: "Electronics", icon: "🔌" },
  { id: "kids",        label: "Kids & Baby", icon: "🧸" },
  { id: "household",   label: "Household",   icon: "🏠" },
  { id: "clothing",    label: "Clothing",    icon: "👕" },
  { id: "outdoor",     label: "Outdoor",     icon: "🌿" },
  { id: "free",        label: "Free",        icon: "🎁" },
  { id: "other",       label: "Other",       icon: "📦" },
];

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));
const CATEGORY_ICONS  = Object.fromEntries(CATEGORIES.map(c => [c.id, c.icon]));

export function categoryLabel(category) {
  return CATEGORY_LABELS[category] ?? "Other";
}

export function categoryIcon(category) {
  return CATEGORY_ICONS[category] ?? "📦";
}

// ── Price formatting ───────────────────────────────────────────────────────────
// A null/zero price reads as "Free" rather than "$0" — matches the give-away use case.
export function formatPrice(priceCents) {
  if (priceCents == null || priceCents === 0) return "Free";
  return fmtMoney(priceCents);
}

// ── Status ─────────────────────────────────────────────────────────────────────
export function statusLabel(status) {
  switch (status) {
    case "sold":    return "Sold";
    case "removed": return "Removed";
    case "flagged": return "Under review";
    default:        return "Active";
  }
}

// ── Permissions ────────────────────────────────────────────────────────────────
export function isOwnListing(listing, me) {
  return !!me && listing.seller_id === me.id;
}

export function canEditListing(listing, me) {
  if (!me) return false;
  return isOwnListing(listing, me) || isAdult(me);
}

export function canMessageSeller(listing, me) {
  if (!me) return false;
  if (isOwnListing(listing, me)) return false;
  return listing.status === "active";
}

export function canModerate(me) {
  return isAdult(me);
}

// ── Filtering & sorting ────────────────────────────────────────────────────────
// Browse view shows only active listings by default; "My Listings" passes includeAll.
export function filterListings(listings, { category = "all", query = "", sellerId = null, includeAll = false } = {}) {
  const q = query.trim().toLowerCase();
  return listings.filter(l => {
    if (!includeAll && l.status !== "active") return false;
    if (sellerId && l.seller_id !== sellerId) return false;
    if (category !== "all" && l.category !== category) return false;
    if (q && !l.title.toLowerCase().includes(q) && !l.description.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function sortListings(listings) {
  return [...listings].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ── Inquiries ──────────────────────────────────────────────────────────────────
// Returns the inquiry threads where `me` is either the buyer or the seller.
export function inquiriesForMember(inquiries, me) {
  if (!me) return [];
  return inquiries.filter(i => i.buyer_id === me.id || i.seller_id === me.id);
}

export function sortInquiries(inquiries) {
  return [...inquiries].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

// ── Flags / moderation ─────────────────────────────────────────────────────────
export function openFlags(flags) {
  return flags.filter(f => f.status === "open");
}

export function sortFlags(flags) {
  return [...flags].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}
