import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestRescheduleAsAttendeeHandler } from "./requestRescheduleAsAttendee.handler";

vi.mock("@calcom/lib/logger", () => ({
  default: {
    getSubLogger: () => ({
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock("@calcom/lib/safeStringify", () => ({
  safeStringify: (v: unknown) => JSON.stringify(v),
}));

vi.mock("@calcom/emails/email-manager", () => ({
  sendRescheduleRequestReceivedEmail: vi.fn(),
}));

const mockBookingFindUnique = vi.fn();
const mockRescheduleRequestFindFirst = vi.fn();
const mockRescheduleRequestCreate = vi.fn();

vi.mock("@calcom/prisma", () => ({
  prisma: {
    booking: {
      findUnique: (...args: unknown[]) => mockBookingFindUnique(...args),
    },
    rescheduleRequest: {
      findFirst: (...args: unknown[]) => mockRescheduleRequestFindFirst(...args),
      create: (...args: unknown[]) => mockRescheduleRequestCreate(...args),
    },
  },
}));

import { sendRescheduleRequestReceivedEmail } from "@calcom/emails/email-manager";

// Helper: encode attendee email as base64 token
function encodeToken(email: string) {
  return Buffer.from(`${email}:secret`).toString("base64");
}

describe("requestRescheduleAsAttendeeHandler", () => {
  const mockHost = {
    id: 10,
    email: "host@example.com",
    name: "Host User",
    locale: "en",
  };

  const mockAttendee = {
    id: 1,
    email: "attendee@example.com",
    name: "Attendee User",
  };

  const mockBooking = {
    id: 42,
    uid: "booking-uid-123",
    title: "Test Meeting",
    startTime: new Date("2025-12-01T10:00:00Z"),
    attendees: [mockAttendee],
    user: mockHost,
    eventType: { id: 5, title: "30 Min Call" },
  };

  const validToken = encodeToken(mockAttendee.email);

  const baseInput = {
    bookingId: 42,
    oneTimePassword: validToken,
    reason: "I need to move this meeting",
    proposedStartTime: undefined,
    proposedEndTime: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRescheduleRequestCreate.mockResolvedValue({
      id: 99,
      bookingId: 42,
      initiator: "ATTENDEE",
      status: "PENDING",
      reason: baseInput.reason,
      proposedStartTime: null,
      proposedEndTime: null,
    });
    vi.mocked(sendRescheduleRequestReceivedEmail).mockResolvedValue(undefined);
  });

  describe("booking lookup", () => {
    it("should throw NOT_FOUND when booking does not exist", async () => {
      mockBookingFindUnique.mockResolvedValue(null);

      await expect(
        requestRescheduleAsAttendeeHandler({ input: baseInput })
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: "Booking not found",
      });

      expect(mockRescheduleRequestCreate).not.toHaveBeenCalled();
    });
  });

  describe("attendee token verification", () => {
    it("should throw UNAUTHORIZED when email in token does not match any attendee", async () => {
      mockBookingFindUnique.mockResolvedValue(mockBooking);

      const badToken = Buffer.from("unknown@example.com:secret").toString("base64");

      await expect(
        requestRescheduleAsAttendeeHandler({
          input: { ...baseInput, oneTimePassword: badToken },
        })
      ).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });

      expect(mockRescheduleRequestCreate).not.toHaveBeenCalled();
    });

    it("should accept token with case-insensitive email match", async () => {
      mockBookingFindUnique.mockResolvedValue(mockBooking);
      mockRescheduleRequestFindFirst.mockResolvedValue(null);

      const upperToken = Buffer.from(`ATTENDEE@EXAMPLE.COM:secret`).toString("base64");

      const result = await requestRescheduleAsAttendeeHandler({
        input: { ...baseInput, oneTimePassword: upperToken },
      });

      expect(result.rescheduleRequest).toBeDefined();
    });
  });

  describe("duplicate request prevention", () => {
    it("should throw BAD_REQUEST when a pending reschedule request already exists", async () => {
      mockBookingFindUnique.mockResolvedValue(mockBooking);
      mockRescheduleRequestFindFirst.mockResolvedValue({ id: 77, status: "PENDING" });

      await expect(
        requestRescheduleAsAttendeeHandler({ input: baseInput })
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
        message: "A reschedule request is already pending for this booking",
      });

      expect(mockRescheduleRequestCreate).not.toHaveBeenCalled();
    });
  });

  describe("successful request creation", () => {
    beforeEach(() => {
      mockBookingFindUnique.mockResolvedValue(mockBooking);
      mockRescheduleRequestFindFirst.mockResolvedValue(null);
    });

    it("should create a reschedule request record with correct data", async () => {
      const result = await requestRescheduleAsAttendeeHandler({ input: baseInput });

      expect(mockRescheduleRequestCreate).toHaveBeenCalledWith({
        data: {
          bookingId: 42,
          initiator: "ATTENDEE",
          proposedStartTime: null,
          proposedEndTime: null,
          reason: baseInput.reason,
          status: "PENDING",
        },
      });

      expect(result.rescheduleRequest).toBeDefined();
    });

    it("should include proposedStartTime and proposedEndTime when provided", async () => {
      const proposedStart = new Date("2025-12-02T10:00:00Z");
      const proposedEnd = new Date("2025-12-02T10:30:00Z");

      await requestRescheduleAsAttendeeHandler({
        input: {
          ...baseInput,
          proposedStartTime: proposedStart,
          proposedEndTime: proposedEnd,
        },
      });

      expect(mockRescheduleRequestCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          proposedStartTime: proposedStart,
          proposedEndTime: proposedEnd,
        }),
      });
    });

    it("should send reschedule request email to host", async () => {
      await requestRescheduleAsAttendeeHandler({ input: baseInput });

      expect(sendRescheduleRequestReceivedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockHost.email,
          hostName: mockHost.name,
          guestName: mockAttendee.name,
          eventTypeName: mockBooking.eventType.title,
          reason: baseInput.reason,
          language: mockHost.locale,
        })
      );
    });

    it("should not send email when booking has no host user", async () => {
      mockBookingFindUnique.mockResolvedValue({
        ...mockBooking,
        user: null,
      });

      await requestRescheduleAsAttendeeHandler({ input: baseInput });

      expect(sendRescheduleRequestReceivedEmail).not.toHaveBeenCalled();
    });

    it("should fall back to booking title when eventType is null", async () => {
      mockBookingFindUnique.mockResolvedValue({
        ...mockBooking,
        eventType: null,
      });

      await requestRescheduleAsAttendeeHandler({ input: baseInput });

      expect(sendRescheduleRequestReceivedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          eventTypeName: mockBooking.title,
        })
      );
    });

    it("should fall back to host email as hostName when name is null", async () => {
      mockBookingFindUnique.mockResolvedValue({
        ...mockBooking,
        user: { ...mockHost, name: null },
      });

      await requestRescheduleAsAttendeeHandler({ input: baseInput });

      expect(sendRescheduleRequestReceivedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          hostName: mockHost.email,
        })
      );
    });

    it("should fall back to 'en' locale when host locale is null", async () => {
      mockBookingFindUnique.mockResolvedValue({
        ...mockBooking,
        user: { ...mockHost, locale: null },
      });

      await requestRescheduleAsAttendeeHandler({ input: baseInput });

      expect(sendRescheduleRequestReceivedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          language: "en",
        })
      );
    });
  });
});
