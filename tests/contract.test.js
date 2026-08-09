import { describe, it, expect } from "vitest";
import { validateBooking } from "../lib/contract.js";

describe("validateBooking", () => {
  it("accepts a 1-hour booking at 14:00", () => {
    const r = validateBooking({
      startTime: new Date(2026, 7, 11, 14, 0),
      durationHours: 1,
    });
    expect(r.valid).toBe(true);
  });

  it("rejects a start before opening", () => {
    const r = validateBooking({
      startTime: new Date(2026, 7, 11, 7, 0),
      durationHours: 1,
    });
    expect(r.valid).toBe(false);
  });

  it("rejects an end after closing", () => {
    const r = validateBooking({
      startTime: new Date(2026, 7, 11, 17, 0),
      durationHours: 2,
    });
    expect(r.valid).toBe(false);
  });

  it("rejects a start not on the hour", () => {
    const r = validateBooking({
      startTime: new Date(2026, 7, 11, 14, 30),
      durationHours: 1,
    });
    expect(r.valid).toBe(false);
  });

  it("rejects a duration other than 1 or 2 hours", () => {
    const r = validateBooking({
      startTime: new Date(2026, 7, 11, 14, 0),
      durationHours: 3,
    });
    expect(r.valid).toBe(false);
  });
});