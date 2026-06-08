import { describe, it, expect } from "vitest";
import {
  categoryLabel, categoryIcon, formatPrice, statusLabel,
  isOwnListing, canEditListing, canMessageSeller, canModerate,
  filterListings, sortListings, inquiriesForMember, sortInquiries,
  openFlags, sortFlags,
} from "../src/logic.js";

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

describe("categoryLabel / categoryIcon", () => {
  it("returns the label for a known category", () => {
    expect(categoryLabel("furniture")).toBe("Furniture");
  });
  it("falls back to Other for unknown categories", () => {
    expect(categoryLabel("bogus")).toBe("Other");
    expect(categoryIcon("bogus")).toBe("📦");
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
  it("recognizes the seller as the owner", () => {
    expect(isOwnListing(listing(), seller)).toBe(true);
    expect(isOwnListing(listing(), adult)).toBe(false);
  });
  it("lets the owner edit their own listing", () => {
    expect(canEditListing(listing(), seller)).toBe(true);
  });
  it("lets adults moderate listings they don't own", () => {
    expect(canEditListing(listing(), adult)).toBe(true);
  });
  it("does not let children edit listings they don't own", () => {
    expect(canEditListing(listing(), child)).toBe(false);
  });
  it("returns false with no logged-in member", () => {
    expect(canEditListing(listing(), null)).toBe(false);
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

describe("canModerate", () => {
  it("allows adults and admins", () => {
    expect(canModerate(adult)).toBe(true);
    expect(canModerate(admin)).toBe(true);
  });
  it("blocks children", () => expect(canModerate(child)).toBe(false));
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

  it("filters by search query across title and description", () => {
    expect(filterListings(listings, { query: "sectional" }).map(l => l.id)).toEqual(["l-2"]);
    expect(filterListings(listings, { query: "bike" }).map(l => l.id)).toEqual(["l-1"]);
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
