// Shared utilities — sourced from shared.js (mirrors hub-sdk.js) for testability.
import { AVATAR_COLORS, memberColor, initial, esc, isAdult, formatRelativeDate, fmtMoney } from "./shared.js";
export { AVATAR_COLORS, memberColor, initial, esc, isAdult, formatRelativeDate, fmtMoney };

// ── Categories ─────────────────────────────────────────────────────────────────
export const CATEGORIES = [
  { id: "furniture",   label: "Furniture",   glyph: "sofa" },
  { id: "electronics", label: "Electronics", glyph: "plug" },
  { id: "kids",        label: "Kids & Baby", glyph: "stroller" },
  { id: "household",   label: "Household",   glyph: "house" },
  { id: "clothing",    label: "Clothing",    glyph: "shirt" },
  { id: "outdoor",     label: "Outdoor",     glyph: "sprout" },
  { id: "free",        label: "Free",        glyph: "gift" },
  { id: "other",       label: "Other",       glyph: "box" },
];

const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]));
const CATEGORY_GLYPHS = Object.fromEntries(CATEGORIES.map(c => [c.id, c.glyph]));

export function categoryLabel(category) {
  return CATEGORY_LABELS[category] ?? "Other";
}

/** The name of the hub glyph that marks a category — drawn with the SDK's glyph(). */
export function categoryGlyph(category) {
  return CATEGORY_GLYPHS[category] ?? "box";
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

// Who may modify a listing row. Mirrors the server `listings` policy
// (owner_or_visibility + write_owner_only + moderator bypass): the owner, OR a
// member of the configured moderator group. NOT any adult — write_owner_only
// means non-owner adults are scoped to their own rows server-side, so showing
// them edit/remove controls would silently no-op. Pass the moderator group so the
// gate matches the server exactly (see canModerate).
export function canEditListing(listing, me, groups, moderatorGroupId) {
  if (!me) return false;
  return isOwnListing(listing, me) || canModerate(me, groups, moderatorGroupId);
}

export function canMessageSeller(listing, me) {
  if (!me) return false;
  if (isOwnListing(listing, me)) return false;
  return listing.status === "active";
}

// The hub member group acting as moderators, or null if none is configured.
export function moderatorGroup(groups, moderatorGroupId) {
  if (!moderatorGroupId) return null;
  return (groups ?? []).find(g => g.id === moderatorGroupId) ?? null;
}

// Mirrors the server policy exactly: moderation (seeing the flag queue, removing a
// listing, resolving reports) is gated on membership of the configured moderator
// group — NOT on the adult role. With no group configured, nobody is a moderator
// (the server's bypass_group_setting matches no one), so the moderation UI must stay
// hidden until an admin sets the group. Returning isAdult here would show controls
// that silently 403 server-side.
export function canModerate(me, groups, moderatorGroupId) {
  if (!me) return false;
  const g = moderatorGroup(groups, moderatorGroupId);
  if (!g) return false;
  return (g.memberIds ?? []).includes(me.id);
}

// Who may change a photo row. Mirrors the server `listing_photos` policy
// (inherit_visibility with writer_column uploaded_by): the member who attached
// the photo, OR a member of the configured moderator group. NOT the listing's
// seller as such — a photo row with no recorded uploader is writable only by a
// moderator, so offering its seller a button would silently change nothing.
export function canEditPhoto(photo, me, groups, moderatorGroupId) {
  if (!me || !photo) return false;
  return photo.uploaded_by === me.id || canModerate(me, groups, moderatorGroupId);
}

// ── Filtering & sorting ────────────────────────────────────────────────────────
// Browse view shows only active listings by default; "My Listings" passes includeAll.
/**
 * Fields the in-app search matches against (see hub-sdk `searchMatch`). The
 * description counts as well as the title — that is where the make, model and
 * condition of a thing actually get written down.
 */
export function searchableFields(listing) {
  return [listing.title, listing.description];
}

/** Status / seller / category scoping. Text search is applied by the caller. */
export function filterListings(listings, { category = "all", sellerId = null, includeAll = false } = {}) {
  return listings.filter(l => {
    if (!includeAll && l.status !== "active") return false;
    if (sellerId && l.seller_id !== sellerId) return false;
    if (category !== "all" && l.category !== category) return false;
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

// ── Photo cutouts ──────────────────────────────────────────────────────────────
/** The picture to draw for a listing photo: its cutout when it has one, else the photo as taken. */
export function shownPhotoId(photo) {
  return photo?.cutout_file_id || photo?.file_id || "";
}

/**
 * What to tell someone whose request to remove a photo's background was
 * refused. `status` is the hub's HTTP status and `detail` its reply.
 *
 * A 429 is two different refusals: with a `limit` in the reply it is the
 * household's monthly allowance, without one it is the hub's per-minute limit.
 */
export function cutoutRefusal(status, detail = null) {
  if (status === 429 && typeof detail?.limit === "number") {
    return `This month's ${detail.limit} photo cutouts are used up. The photo is kept as taken.`;
  }
  if (status === 429) return "Too many requests just now. Try again in a minute.";
  if (status === 409) return "The background is already being removed. Try again in a few seconds.";
  if (status === 402) return "Removing photo backgrounds needs an active plan.";
  if (status === 503) return "Removing photo backgrounds is unavailable right now. Try again later.";
  if (status === 413) return "That photo is too large to remove the background from.";
  if (status === 415) return "The background can only be removed from a JPEG, PNG or WebP photo.";
  if (status === 507) return "There is no storage left for a photo with its background removed.";
  return "The background could not be removed.";
}

/**
 * The picture to draw where it is shown small: the small copy of whichever
 * picture is shown, else that picture itself. A cutout's small copy and the
 * photo's are different pictures, so neither stands in for the other.
 */
export function tilePhotoId(photo) {
  if (photo?.cutout_file_id) return photo.cutout_thumb_file_id || photo.cutout_file_id;
  return photo?.thumb_file_id || photo?.file_id || "";
}
