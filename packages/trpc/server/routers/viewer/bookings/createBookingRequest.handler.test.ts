import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBookingRequestHandler } from "./createBookingRequest.handler";

vi.mock("@calcom/prisma", () => ({
  prisma: {
    eventType: { findFirst: vi.fn() },
    bookingRequest: { findFirst: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@calcom/features/hashedLink/lib/service/HashedLinkService", () => ({
  HashedLinkService: vi.fn().mockImplementation(() => ({
    createLinkForEventType: vi.fn().mockResolvedValue({ link: "mock-hashed-link" }),
  })),
}));

vi.mock("@calcom/emails/email-manager", () => ({
  sendBookingRequestInviteEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@calcom/lib/logger", () => ({
  default: { getSubLogger: () => ({ debug: vi.fn(), error: vi.fn() }) },
}));

vi.mock("@calcom/lib/constants", () => ({ WEBAPP_URL: "http://localhost:3000" }));
vi.mock("@calcom/lib/safeStringify", () => ({ safeStringify: vi.fn((x) => JSON.stringify(x)) }));

import { prisma } from "@calcom/prisma";

const mockUser = { id: 1, name: "Host User", email: "host@example.com", locale: "en" };

const mockInput = {
  eventTypeId: 10,
  email: "guest@example.com",
  name: "Guest User",
  notes: "Looking forward to it",
  startTime: new Date("2026-05-01T10:00:00Z"),
  endTime: new Date("2026-05-01T11:00:00Z"),
};

describe("createBookingRequestHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("event type ownership check", () => {
    it("throws NOT_FOUND if the host does not own the event type", async () => {
      vi.mocked(prisma.eventType.findFirst).mockResolvedValue(null);

      await expect(
        createBookingRequestHandler({ ctx: { user: mockUser }, input: mockInput })
      ).rejects.toMatchObject({ code: "NOT_FOUND", message: "Event type not found" });
    });

    it("proceeds when host owns the event type", async () => {
      vi.mocked(prisma.eventType.findFirst).mockResolvedValue({ id: 10, title: "30 Min Call" });
      vi.mocked(prisma.bookingRequest.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.bookingRequest.create).mockResolvedValue({ id: 1 });

      await expect(
        createBookingRequestHandler({ ctx: { user: mockUser }, input: mockInput })
      ).resolves.toBeDefined();
    });
  });

  describe("duplicate request check", () => {
    it("throws BAD_REQUEST if a pending request already exists for same guest + event type", async () => {
      vi.mocked(prisma.eventType.findFirst).mockResolvedValue({ id: 10, title: "30 Min Call" });
      vi.mocked(prisma.bookingRequest.findFirst).mockResolvedValue({ id: 99, status: "PENDING" });

      await expect(
        createBookingRequestHandler({ ctx: { user: mockUser }, input: mockInput })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  describe("successful creation", () => {
    it("creates a booking request and returns it", async () => {
      vi.mocked(prisma.eventType.findFirst).mockResolvedValue({ id: 10, title: "30 Min Call" });
      vi.mocked(prisma.bookingRequest.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.bookingRequest.create).mockResolvedValue({ id: 1, status: "PENDING" });

      const result = await createBookingRequestHandler({ ctx: { user: mockUser }, input: mockInput });

      expect(result.bookingRequest).toBeDefined();
      expect(prisma.bookingRequest.create).toHaveBeenCalledOnce();
    });
  });
});
