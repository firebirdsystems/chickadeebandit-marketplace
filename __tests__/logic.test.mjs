import { describe, it, expect } from "vitest";
import {
  categoryLabel, categoryGlyph, formatPrice, statusLabel,
  isOwnListing, canEditListing, canMessageSeller, canModerate, moderatorGroup,
  filterListings, sortListings, inquiriesForMember, sortInquiries,
  openFlags, sortFlags, searchableFields,
  canEditPhoto, shownPhotoId, tilePhotoId, cutoutRefusal,
} from "../src/logic.js";
import { testPrivilegedGateContract } from "./helpers/privileged-gate.mjs";

// ── canModerate ───────────────────────────────────────────────────────────────
// Fronts the moderations insert_privileged_only policy and the listings/flags
// moderator bypass (moderator_group_id), so it must satisfy the shared
// privileged-gate contract (mirrors the hub: no adult fallback when no moderator
// group is configured).

testPrivilegedGateContract("canModerate", canModerate, {
  member:   { id: "a1", role: "adult" },
  outsider: { id: "a3", role: "adult" },
  groups:   [{ id: "g1", memberIds: ["a1", "a2"] }],
  groupId:  "g1",
});

const adult  = { id: "u-adult",  name: "Alex",  role: "adult" };
const admin  = { id: "u-admin",  name: "Bea",   role: "admin" };
const child  = { id: "u-child",  name: "Cam",   role: "child" };
const seller = { id: "u-seller", name: "Dee",   role: "adult" };

function listing(overrides = {}) {
  return {
    id: "l-1",
    title: "Bike",
    description: "A red bike",
    price_cents: 2000,
    category: "outdoor",
    status: "active",
    seller_id: seller.id,
    seller_name: seller.name,
    created_at: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("categoryLabel / categoryGlyph", () => {
  it("returns the label for a known category", () => {
    expect(categoryLabel("furniture")).toBe("Furniture");
  });
  it("falls back to Other for unknown categories", () => {
    expect(categoryLabel("bogus")).toBe("Other");
    expect(categoryGlyph("bogus")).toBe("box");
  });
  it("names a glyph for a known category", () => {
    expect(categoryGlyph("furniture")).toBe("sofa");
  });
});

describe("formatPrice", () => {
  it("formats cents as USD", () => expect(formatPrice(2000)).toBe("$20"));
  it("treats null as Free", () => expect(formatPrice(null)).toBe("Free"));
  it("treats zero as Free", () => expect(formatPrice(0)).toBe("Free"));
});

describe("statusLabel", () => {
  it("maps known statuses", () => {
    expect(statusLabel("sold")).toBe("Sold");
    expect(statusLabel("removed")).toBe("Removed");
    expect(statusLabel("flagged")).toBe("Under review");
  });
  it("defaults to Active", () => expect(statusLabel("active")).toBe("Active"));
});

describe("isOwnListing / canEditListing", () => {
  // moderator group containing `adult`; `seller` is the listing owner, not a moderator.
  const modGroups = [{ id: "g-mod", memberIds: [adult.id] }];

  it("recognizes the seller as the owner", () => {
    expect(isOwnListing(listing(), seller)).toBe(true);
    expect(isOwnListing(listing(), adult)).toBe(false);
  });
  it("lets the owner edit their own listing (regardless of moderator group)", () => {
    expect(canEditListing(listing(), seller, modGroups, "g-mod")).toBe(true);
    expect(canEditListing(listing(), seller, [], "")).toBe(true);
  });
  it("does NOT let a non-owner adult edit when no moderator group is configured", () => {
    // write_owner_only: a non-owner adult is scoped to their own rows server-side.
    expect(canEditListing(listing(), adult, [], "")).toBe(false);
  });
  it("lets a non-owner member of the moderator group edit", () => {
    expect(canEditListing(listing(), adult, modGroups, "g-mod")).toBe(true);
  });
  it("does not let a non-owner adult outside the moderator group edit", () => {
    expect(canEditListing(listing(), admin, modGroups, "g-mod")).toBe(false);
  });
  it("does not let children edit listings they don't own", () => {
    expect(canEditListing(listing(), child, modGroups, "g-mod")).toBe(false);
  });
  it("returns false with no logged-in member", () => {
    expect(canEditListing(listing(), null, modGroups, "g-mod")).toBe(false);
  });
});

describe("canMessageSeller", () => {
  it("allows messaging an active listing you don't own", () => {
    expect(canMessageSeller(listing(), adult)).toBe(true);
  });
  it("blocks messaging your own listing", () => {
    expect(canMessageSeller(listing(), seller)).toBe(false);
  });
  it("blocks messaging a sold listing", () => {
    expect(canMessageSeller(listing({ status: "sold" }), adult)).toBe(false);
  });
  it("returns false with no logged-in member", () => {
    expect(canMessageSeller(listing(), null)).toBe(false);
  });
});

describe("canModerate / moderatorGroup", () => {
  const mods = [{ id: "g-mods", name: "Moderators", memberIds: [adult.id] }];

  it("resolves the configured moderator group", () => {
    expect(moderatorGroup(mods, "g-mods")?.name).toBe("Moderators");
    expect(moderatorGroup(mods, null)).toBe(null);
    expect(moderatorGroup(mods, "g-missing")).toBe(null);
  });
  it("allows only members of the configured moderator group", () => {
    expect(canModerate(adult, mods, "g-mods")).toBe(true);
    // an adult NOT in the group is not a moderator — mirrors the server policy
    expect(canModerate(admin, mods, "g-mods")).toBe(false);
    expect(canModerate(child, mods, "g-mods")).toBe(false);
  });
  it("treats nobody as a moderator when no group is configured", () => {
    expect(canModerate(adult, mods, null)).toBe(false);
    expect(canModerate(admin, mods, null)).toBe(false);
  });
  it("returns false with no logged-in member", () => {
    expect(canModerate(null, mods, "g-mods")).toBe(false);
  });
});

describe("filterListings", () => {
  const listings = [
    listing({ id: "l-1", title: "Red Bike", category: "outdoor", status: "active" }),
    listing({ id: "l-2", title: "Couch", description: "comfy sectional", category: "furniture", status: "active" }),
    listing({ id: "l-3", title: "Old Bike", category: "outdoor", status: "sold" }),
    listing({ id: "l-4", title: "Lamp", description: "brass floor lamp", category: "household", status: "active", seller_id: adult.id }),
  ];

  it("excludes non-active listings by default", () => {
    const result = filterListings(listings);
    expect(result.map(l => l.id)).toEqual(["l-1", "l-2", "l-4"]);
  });

  it("includes all statuses when includeAll is set", () => {
    const result = filterListings(listings, { includeAll: true, sellerId: seller.id });
    expect(result.map(l => l.id)).toEqual(["l-1", "l-2", "l-3"]);
  });

  it("filters by category", () => {
    const result = filterListings(listings, { category: "outdoor" });
    expect(result.map(l => l.id)).toEqual(["l-1"]);
  });

  it("makes a listing findable by its description, not just its title", () => {
    // searchableFields is what the shared matcher is pointed at; the filter
    // itself no longer knows anything about text.
    expect(searchableFields({ title: "Sofa", description: "grey sectional" })).toContain("grey sectional");
  });

  it("filters by seller", () => {
    expect(filterListings(listings, { sellerId: adult.id }).map(l => l.id)).toEqual(["l-4"]);
  });
});

describe("sortListings", () => {
  it("sorts newest first without mutating the input", () => {
    const listings = [
      listing({ id: "old", created_at: "2026-01-01T00:00:00.000Z" }),
      listing({ id: "new", created_at: "2026-06-01T00:00:00.000Z" }),
    ];
    const result = sortListings(listings);
    expect(result.map(l => l.id)).toEqual(["new", "old"]);
    expect(listings[0].id).toBe("old"); // original order preserved
  });
});

describe("inquiriesForMember / sortInquiries", () => {
  const inquiries = [
    { id: "i-1", buyer_id: adult.id,  seller_id: seller.id, created_at: "2026-06-01T00:00:00.000Z" },
    { id: "i-2", buyer_id: child.id,  seller_id: adult.id,  created_at: "2026-06-03T00:00:00.000Z" },
    { id: "i-3", buyer_id: child.id,  seller_id: seller.id, created_at: "2026-06-02T00:00:00.000Z" },
  ];

  it("returns threads where the member is buyer or seller", () => {
    expect(inquiriesForMember(inquiries, adult).map(i => i.id)).toEqual(["i-1", "i-2"]);
  });
  it("returns an empty list with no member", () => {
    expect(inquiriesForMember(inquiries, null)).toEqual([]);
  });
  it("sorts newest first", () => {
    expect(sortInquiries(inquiries).map(i => i.id)).toEqual(["i-2", "i-3", "i-1"]);
  });
});

describe("openFlags / sortFlags", () => {
  const flags = [
    { id: "f-1", status: "open",      created_at: "2026-06-02T00:00:00.000Z" },
    { id: "f-2", status: "dismissed", created_at: "2026-06-01T00:00:00.000Z" },
    { id: "f-3", status: "open",      created_at: "2026-06-01T00:00:00.000Z" },
  ];

  it("returns only open flags", () => {
    expect(openFlags(flags).map(f => f.id)).toEqual(["f-1", "f-3"]);
  });
  it("sorts oldest first (review queue order)", () => {
    expect(sortFlags(flags).map(f => f.id)).toEqual(["f-2", "f-3", "f-1"]);
  });
});

describe("canEditPhoto", () => {
  const groups = [{ id: "g1", memberIds: ["mod"] }];
  const photo = { id: "ph1", file_id: "p1", uploaded_by: "seller" };

  it("allows the member who attached the photo", () => {
    expect(canEditPhoto(photo, { id: "seller" }, groups, "g1")).toBe(true);
  });
  it("allows a moderator, but only once a moderator group is configured", () => {
    expect(canEditPhoto(photo, { id: "mod" }, groups, "g1")).toBe(true);
    expect(canEditPhoto(photo, { id: "mod" }, groups, null)).toBe(false);
  });
  it("refuses any other member, adult or not", () => {
    expect(canEditPhoto(photo, { id: "neighbour", role: "adult" }, groups, "g1")).toBe(false);
  });
  it("refuses a photo with no recorded uploader to everyone but a moderator", () => {
    expect(canEditPhoto({ ...photo, uploaded_by: "" }, { id: "seller" }, groups, "g1")).toBe(false);
    expect(canEditPhoto({ ...photo, uploaded_by: "" }, { id: "mod" }, groups, "g1")).toBe(true);
  });
  it("refuses when nobody is signed in", () => {
    expect(canEditPhoto(photo, null, groups, "g1")).toBe(false);
  });
});

describe("shownPhotoId", () => {
  it("draws the cutout when the photo has one, else the photo as taken", () => {
    expect(shownPhotoId({ file_id: "p1", cutout_file_id: "c1" })).toBe("c1");
    expect(shownPhotoId({ file_id: "p1", cutout_file_id: null })).toBe("p1");
    expect(shownPhotoId({ file_id: "p1" })).toBe("p1");
    expect(shownPhotoId({ file_id: "" })).toBe("");
  });
});

describe("cutoutRefusal", () => {
  it("tells the monthly allowance apart from the per-minute limit", () => {
    expect(cutoutRefusal(429, { limit: 100 })).toBe("This month's 100 photo cutouts are used up. The photo is kept as taken.");
    expect(cutoutRefusal(429, { error: "Too many requests" })).toBe("Too many requests just now. Try again in a minute.");
    expect(cutoutRefusal(429)).toBe("Too many requests just now. Try again in a minute.");
  });
  it("says why for each refusal the hub can give", () => {
    expect(cutoutRefusal(409)).toMatch(/already being removed/);
    expect(cutoutRefusal(402)).toMatch(/active plan/);
    expect(cutoutRefusal(503)).toMatch(/unavailable right now/);
    expect(cutoutRefusal(413)).toMatch(/too large/);
    expect(cutoutRefusal(415)).toMatch(/JPEG, PNG or WebP/);
    expect(cutoutRefusal(507)).toMatch(/no storage left/);
  });
  it("falls back to a plain sentence for anything else", () => {
    expect(cutoutRefusal(500)).toBe("The background could not be removed.");
    expect(cutoutRefusal(undefined)).toBe("The background could not be removed.");
  });
});

describe("tilePhotoId", () => {
  it("draws the small copy of the picture shown, else that picture", () => {
    expect(tilePhotoId({ file_id: "p1", thumb_file_id: "t1", cutout_file_id: "c1", cutout_thumb_file_id: "ct1" })).toBe("ct1");
    expect(tilePhotoId({ file_id: "p1", thumb_file_id: "t1", cutout_file_id: null })).toBe("t1");
    expect(tilePhotoId({ file_id: "p1", thumb_file_id: null })).toBe("p1");
    expect(tilePhotoId({ file_id: "p1" })).toBe("p1");
    expect(tilePhotoId(null)).toBe("");
  });
  it("never shows the photo's small copy for a cutout", () => {
    // A cutout with no small copy of its own is drawn whole.
    expect(tilePhotoId({ file_id: "p1", thumb_file_id: "t1", cutout_file_id: "c1", cutout_thumb_file_id: null })).toBe("c1");
    expect(tilePhotoId({ file_id: "p1", thumb_file_id: "t1", cutout_file_id: "c1" })).toBe("c1");
  });
});
