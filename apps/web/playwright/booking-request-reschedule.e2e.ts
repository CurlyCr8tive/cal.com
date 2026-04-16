import { expect } from "@playwright/test";

import { prisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { test } from "./lib/fixtures";

test.describe.configure({ mode: "serial" });

test.afterEach(async ({ users }) => {
  await users.deleteAll();
});

/**
 * Happy-path E2E for the Host-Initiated Booking Request + Mutual Rescheduling feature.
 *
 * Flow tested:
 *   1. Host sends a booking request to a guest via RequestBookingModal
 *   2. Guest visits their one-time link and sees the booking confirmation page
 *   3. Guest opens RescheduleRequestModal and submits a reschedule request
 *   4. Host logs in, sees the RescheduleRequestCard, and accepts it
 */

test.describe("Booking Request & Mutual Rescheduling", () => {
  test("host can send a booking request and guest can request a reschedule", async ({ page, users }) => {
    // ── 1. Setup: host with one event type ──────────────────────────────────
    const host = await users.create({
      name: "Host User",
      overrideDefaultEventTypes: true,
      eventTypes: [
        {
          title: "30 Min Call",
          slug: "30-min",
          length: 30,
        },
      ],
    });

    await host.apiLogin();

    // ── 2. Host opens the booking request modal on the event types page ─────
    await page.goto("/event-types", { waitUntil: "domcontentloaded" });

    // The RequestBookingModal is opened from somewhere on the event-types page or bookings page.
    // We trigger it via the data-testid we set on the button.
    await page.locator('[data-testid="request-booking-btn"]').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // ── 3. Fill and submit the booking request form ──────────────────────────
    const guestEmail = "guest@example.com";
    const guestName = "Guest Person";

    await page.locator('input[name="recipientEmail"]').fill(guestEmail);
    await page.locator('input[name="recipientName"]').fill(guestName);

    // Pick a time 24 hours from now
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
    const toDatetimeLocal = (d: Date) => d.toISOString().slice(0, 16);

    await page.locator('input[name="startTime"]').fill(toDatetimeLocal(startTime));
    await page.locator('input[name="endTime"]').fill(toDatetimeLocal(endTime));

    await page.locator('button[type="submit"]').click();

    // Modal should close on success and show a toast
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });

    // ── 4. Verify BookingRequest record was created in the database ──────────
    const eventType = host.eventTypes[0];
    const bookingRequest = await prisma.bookingRequest.findFirst({
      where: {
        eventTypeId: eventType.id,
        email: guestEmail,
      },
    });

    expect(bookingRequest).not.toBeNull();
    expect(bookingRequest?.name).toBe(guestName);
    expect(bookingRequest?.status).toBe("PENDING");

    // ── 5. Simulate a booking existing for the guest (as if they accepted) ───
    // In the full flow the guest would have accepted the invite, creating a booking.
    // For this test we create the booking directly so we can test the reschedule flow.
    const booking = await prisma.booking.create({
      data: {
        uid: `e2e-booking-${Date.now()}`,
        title: "30 Min Call",
        startTime,
        endTime,
        status: BookingStatus.ACCEPTED,
        // oneTimePassword is base64(email:token) — matches requestRescheduleAsAttendee handler
        oneTimePassword: Buffer.from(`${guestEmail}:e2e-secret`).toString("base64"),
        user: { connect: { id: host.id } },
        eventType: { connect: { id: eventType.id } },
        attendees: {
          create: {
            email: guestEmail,
            name: guestName,
            timeZone: "America/New_York",
          },
        },
      },
    });

    // ── 6. Guest visits booking confirmation page with token ─────────────────
    const guestToken = Buffer.from(`${guestEmail}:e2e-secret`).toString("base64");
    await page.goto(`/booking/${booking.uid}?token=${guestToken}`, {
      waitUntil: "domcontentloaded",
    });

    // "Request reschedule" button should be visible (token is present, booking not cancelled)
    const rescheduleBtn = page.locator('[data-testid="request-reschedule"]');
    await expect(rescheduleBtn).toBeVisible();

    // ── 7. Guest submits a reschedule request ────────────────────────────────
    await rescheduleBtn.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    await page.locator("textarea").fill("I have a conflict at this time, can we move it?");
    await page.locator('[role="dialog"] button[type="button"]:not([color="secondary"])').last().click();

    // Modal closes after submit
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 });

    // ── 8. Verify RescheduleRequest record created ───────────────────────────
    const rescheduleRequest = await prisma.rescheduleRequest.findFirst({
      where: { bookingId: booking.id },
    });

    expect(rescheduleRequest).not.toBeNull();
    expect(rescheduleRequest?.status).toBe("PENDING");
    expect(rescheduleRequest?.initiator).toBe("ATTENDEE");
    expect(rescheduleRequest?.reason).toBe("I have a conflict at this time, can we move it?");

    // ── 9. Host logs in and accepts the reschedule request ───────────────────
    // (Host is already logged in from step 2 — navigate to bookings page)
    await page.goto("/bookings/upcoming", { waitUntil: "domcontentloaded" });

    // RescheduleRequestCard should surface on the bookings page for this booking.
    // We assert on the data-testid we'll add to the card's accept button.
    const acceptBtn = page.locator(`[data-testid="reschedule-request-accept-${rescheduleRequest?.id}"]`);
    await expect(acceptBtn).toBeVisible();
    await acceptBtn.click();

    // ── 10. Verify RescheduleRequest updated to ACCEPTED ─────────────────────
    const updatedRequest = await prisma.rescheduleRequest.findUnique({
      where: { id: rescheduleRequest!.id },
    });

    expect(updatedRequest?.status).toBe("ACCEPTED");
    expect(updatedRequest?.respondedAt).not.toBeNull();

    // Cleanup booking created directly in this test
    await prisma.booking.delete({ where: { id: booking.id } });
  });

  test("request reschedule button is hidden when no token in URL", async ({ page, users }) => {
    const host = await users.create({
      name: "Host User",
      overrideDefaultEventTypes: true,
      eventTypes: [{ title: "30 Min Call", slug: "30-min", length: 30 }],
    });

    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    const booking = await prisma.booking.create({
      data: {
        uid: `e2e-notoken-${Date.now()}`,
        title: "30 Min Call",
        startTime,
        endTime,
        status: BookingStatus.ACCEPTED,
        user: { connect: { id: host.id } },
        eventType: { connect: { id: host.eventTypes[0].id } },
        attendees: {
          create: { email: "guest@example.com", name: "Guest", timeZone: "UTC" },
        },
      },
    });

    // Visit without a token — button must not appear
    await page.goto(`/booking/${booking.uid}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('[data-testid="request-reschedule"]')).not.toBeVisible();

    await prisma.booking.delete({ where: { id: booking.id } });
  });
});
