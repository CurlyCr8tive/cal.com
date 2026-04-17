# ROB — COMPLETE CURSOR BUILD GUIDE (FINAL)
## Every file, every step, zero gaps.

---

## BEFORE YOU WRITE A SINGLE LINE — Read Rich's Schema First

After pulling the shared branch, do this:

```bash
git pull
cd packages/prisma
npx prisma generate
cd ../..
```

Then open `packages/prisma/schema.prisma` and find the `BookingRequest` and `RescheduleRequest` models Rich created. Write down the EXACT field names. They may differ from what this guide assumes.

**Find them with:**
```bash
grep -A 30 "model BookingRequest" packages/prisma/schema.prisma
grep -A 20 "model RescheduleRequest" packages/prisma/schema.prisma
grep -A 10 "enum BookingRequestStatus" packages/prisma/schema.prisma
grep -A 10 "enum RescheduleRequestStatus" packages/prisma/schema.prisma
grep -A 5 "enum RescheduleInitiator" packages/prisma/schema.prisma
```

Write the results here before continuing:

```
BookingRequest fields:
  id:              string
  hostId:          ____________  (might be userId, ownerId, etc)
  guestEmail:      ____________  (might be attendeeEmail, email, etc)
  guestName:       ____________  (might be attendeeName, name, etc)
  eventTypeId:     ____________
  status:          ____________  (enum name: _______________)
  hashedLinkToken: ____________  (might be token, linkToken, etc)
  notes:           ____________
  startTime:       ____________
  endTime:         ____________
  expiresAt:       ____________
  createdAt:       ____________

RescheduleRequest fields:
  id:                      string
  bookingId:               ____________
  initiator:               ____________  (enum name: _______________)
  proposedStartTime:       ____________
  proposedEndTime:         ____________
  reason:                  ____________
  status:                  ____________  (enum name: _______________)
  counterProposalStartTime:____________
  counterProposalEndTime:  ____________
  respondedAt:             ____________

Enum values:
  BookingRequestStatus:    PENDING | ______ | ______ | ______ | ______
  RescheduleRequestStatus: PENDING | ______ | ______
  RescheduleInitiator:     ATTENDEE | ______
```

**Use YOUR filled-in values everywhere in the code below.** Anywhere this guide writes e.g. `guestEmail` — substitute your actual field name.

---

## STEP 1 — HashedLinkService.ts (MODIFY)

**File:** `packages/features/hashedLink/lib/service/HashedLinkService.ts`

### Cursor Prompt:
```
Open packages/features/hashedLink/lib/service/HashedLinkService.ts

Read the full file carefully. Then add one new public async method to the existing class:

  async validateAndConsumeBookingRequestLink(token: string): Promise<{ bookingRequestId: string }>

Logic:
1. const hashedLink = await prisma.hashedLink.findFirst({ where: { link: token, type: "BOOKING_REQUEST" } })
2. If not found → throw new TRPCError({ code: "NOT_FOUND", message: "Invalid or expired booking request link" })
3. If hashedLink.expiresAt && hashedLink.expiresAt < new Date() → throw new TRPCError({ code: "BAD_REQUEST", message: "Booking request link has expired" })
4. If hashedLink.maxUsageCount && hashedLink.usageCount >= hashedLink.maxUsageCount → throw new TRPCError({ code: "BAD_REQUEST", message: "Booking request link has already been used" })
5. await prisma.hashedLink.update({ where: { id: hashedLink.id }, data: { usageCount: { increment: 1 } } })
6. Return { bookingRequestId: String(hashedLink.eventTypeId ?? "") }

Use the exact same import style, error style, and prisma usage already in this file. Do not change anything else.
```

---

## STEP 2 — createBookingRequest.handler.ts (CREATE)

**File:** `packages/trpc/server/routers/viewer/bookings/createBookingRequest.handler.ts`

### Cursor Prompt:
```
Create: packages/trpc/server/routers/viewer/bookings/createBookingRequest.handler.ts

First open requestReschedule.handler.ts in the same folder to match the exact import style and function signature pattern.

Write this handler:

export const createBookingRequestHandler = async ({ ctx, input }: CreateBookingRequestOptions)

Where:
- ctx.user is non-nullable (the logged-in host)
- input comes from TCreateBookingRequestInputSchema (import from "./createBookingRequest.schema")

Steps in order:

1. OWNERSHIP CHECK
   const eventType = await prisma.eventType.findFirst({
     where: { id: input.eventTypeId, userId: ctx.user.id },
     select: { id: true, title: true }
   })
   if (!eventType) throw new TRPCError({ code: "NOT_FOUND", message: "Event type not found" })

2. DUPLICATE CHECK
   const existing = await prisma.bookingRequest.findFirst({
     where: { eventTypeId: input.eventTypeId, guestEmail: input.email, status: "PENDING" }
   })
   if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "A pending booking request already exists for this guest" })

3. GENERATE HASHED LINK
   const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
   const hashedLink = await hashedLinkService.create({
     type: "BOOKING_REQUEST",
     expiresAt,
     maxUsageCount: 1,
   })

4. CREATE RECORD
   const bookingRequest = await prisma.bookingRequest.create({
     data: {
       eventTypeId: input.eventTypeId,
       hostId: ctx.user.id,
       guestEmail: input.email,
       guestName: input.name,
       notes: input.notes ?? null,
       startTime: input.startTime,
       endTime: input.endTime,
       status: "PENDING",
       hashedLinkToken: hashedLink.link,
       expiresAt,
     }
   })

5. SEND EMAIL
   await sendBookingRequestInviteEmail({
     to: input.email,
     guestName: input.name,
     hostName: ctx.user.name ?? ctx.user.email,
     eventTypeName: eventType.title,
     bookingLink: `${WEBAPP_URL}/booking-request/${hashedLink.link}`,
     expiresAt,
     language: ctx.user.locale ?? "en",
   })

6. return { bookingRequest }

Imports needed:
- prisma from "@calcom/prisma"
- TRPCError from "@trpc/server"
- HashedLinkService from "@calcom/features/hashedLink/lib/service/HashedLinkService"
- sendBookingRequestInviteEmail from "@calcom/emails"
- WEBAPP_URL from "@calcom/lib/constants"
- TCreateBookingRequestInputSchema from "./createBookingRequest.schema"

Add at the top of the file (outside the function):
  const hashedLinkService = new HashedLinkService()
```

---

## STEP 3 — listBookingRequests.handler.ts (CREATE)

### Cursor Prompt:
```
Create: packages/trpc/server/routers/viewer/bookings/listBookingRequests.handler.ts

Match requestReschedule.handler.ts style exactly.

export const listBookingRequestsHandler = async ({ ctx, input }: ListBookingRequestsOptions)

Input: TListBookingRequestsInputSchema — has optional field: status?: BookingRequestStatus

Logic:
const bookingRequests = await prisma.bookingRequest.findMany({
  where: {
    hostId: ctx.user.id,
    ...(input.status ? { status: input.status } : {}),
  },
  include: {
    eventType: { select: { id: true, title: true, slug: true } },
  },
  orderBy: { createdAt: "desc" },
})
return { bookingRequests }

Imports: prisma from "@calcom/prisma", TRPCError from "@trpc/server", TRPCContext type, TListBookingRequestsInputSchema from "./listBookingRequests.schema"
```

---

## STEP 4 — cancelBookingRequest.handler.ts (CREATE)

### Cursor Prompt:
```
Create: packages/trpc/server/routers/viewer/bookings/cancelBookingRequest.handler.ts

Match requestReschedule.handler.ts style exactly.

export const cancelBookingRequestHandler = async ({ ctx, input }: CancelBookingRequestOptions)

Input: TCancelBookingRequestInputSchema — has: bookingRequestId: string

Logic:
1. const bookingRequest = await prisma.bookingRequest.findFirst({
     where: { id: input.bookingRequestId, hostId: ctx.user.id },
     include: { eventType: { select: { title: true } } }
   })
   if (!bookingRequest) throw new TRPCError({ code: "NOT_FOUND", message: "Booking request not found" })

2. if (bookingRequest.status !== "PENDING") throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot cancel a booking request with status: ${bookingRequest.status}` })

3. await prisma.bookingRequest.update({
     where: { id: input.bookingRequestId },
     data: { status: "CANCELLED" }
   })

4. return { success: true }

Imports: prisma from "@calcom/prisma", TRPCError from "@trpc/server", TRPCContext, TCancelBookingRequestInputSchema
```

---

## STEP 5 — requestRescheduleAsAttendee.handler.ts (CREATE)

### Cursor Prompt:
```
Create: packages/trpc/server/routers/viewer/bookings/requestRescheduleAsAttendee.handler.ts

This handler has NO ctx.user — the guest authenticates via a token.
Match requestReschedule.handler.ts import style.

export const requestRescheduleAsAttendeeHandler = async ({ input }: RequestRescheduleAsAttendeeOptions)

Input: TRequestRescheduleAsAttendeeInputSchema — has: bookingId: string, oneTimePassword: string, proposedStartTime?: Date, proposedEndTime?: Date, reason?: string

Logic:
1. const booking = await prisma.booking.findUnique({
     where: { id: input.bookingId },
     include: {
       attendees: true,
       user: { select: { id: true, email: true, name: true, locale: true } },
       eventType: { select: { id: true, title: true } },
     }
   })
   if (!booking) throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" })

2. const decoded = Buffer.from(input.oneTimePassword, "base64").toString("utf-8")
   const [attendeeEmail] = decoded.split(":")
   const attendee = booking.attendees.find(a => a.email.toLowerCase() === attendeeEmail.toLowerCase())
   if (!attendee) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired token" })

3. const existingRequest = await prisma.rescheduleRequest.findFirst({
     where: { bookingId: input.bookingId, status: "PENDING" }
   })
   if (existingRequest) throw new TRPCError({ code: "BAD_REQUEST", message: "A reschedule request is already pending for this booking" })

4. const rescheduleRequest = await prisma.rescheduleRequest.create({
     data: {
       bookingId: input.bookingId,
       initiator: "ATTENDEE",
       proposedStartTime: input.proposedStartTime ?? null,
       proposedEndTime: input.proposedEndTime ?? null,
       reason: input.reason ?? null,
       status: "PENDING",
     }
   })

5. if (booking.user) {
     await sendRescheduleRequestReceivedEmail({
       to: booking.user.email,
       hostName: booking.user.name ?? booking.user.email,
       guestName: attendee.name,
       eventTypeName: booking.eventType?.title ?? booking.title,
       currentStartTime: booking.startTime,
       proposedStartTime: input.proposedStartTime,
       reason: input.reason,
       language: booking.user.locale ?? "en",
     })
   }

6. return { rescheduleRequest }

Imports: prisma from "@calcom/prisma", TRPCError from "@trpc/server", sendRescheduleRequestReceivedEmail from "@calcom/emails", TRequestRescheduleAsAttendeeInputSchema
```

---

## STEP 6 — respondToRescheduleRequest.handler.ts (CREATE)

### Cursor Prompt:
```
Create: packages/trpc/server/routers/viewer/bookings/respondToRescheduleRequest.handler.ts

Match requestReschedule.handler.ts style exactly.

export const respondToRescheduleRequestHandler = async ({ ctx, input }: RespondToRescheduleRequestOptions)

Input: TRespondToRescheduleRequestInputSchema — has: rescheduleRequestId: string, response: "ACCEPTED" | "DECLINED", counterProposalStartTime?: Date, counterProposalEndTime?: Date

Logic:
1. const rescheduleRequest = await prisma.rescheduleRequest.findUnique({
     where: { id: input.rescheduleRequestId },
     include: {
       booking: {
         include: {
           attendees: true,
           user: { select: { id: true, email: true, name: true, locale: true } },
           eventType: { select: { title: true } },
         }
       }
     }
   })
   if (!rescheduleRequest) throw new TRPCError({ code: "NOT_FOUND", message: "Reschedule request not found" })

2. if (rescheduleRequest.booking.userId !== ctx.user.id) throw new TRPCError({ code: "UNAUTHORIZED", message: "You don't have permission to respond to this request" })

3. if (rescheduleRequest.status !== "PENDING") throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot respond to a request with status: ${rescheduleRequest.status}` })

4. const updated = await prisma.rescheduleRequest.update({
     where: { id: input.rescheduleRequestId },
     data: {
       status: input.response,
       counterProposalStartTime: input.counterProposalStartTime ?? null,
       counterProposalEndTime: input.counterProposalEndTime ?? null,
       respondedAt: new Date(),
     }
   })

5. if (input.response === "ACCEPTED" && input.counterProposalStartTime && input.counterProposalEndTime) {
     await prisma.booking.update({
       where: { id: rescheduleRequest.bookingId },
       data: {
         startTime: input.counterProposalStartTime,
         endTime: input.counterProposalEndTime,
       }
     })
   }

6. const attendee = rescheduleRequest.booking.attendees[0]
   const booking = rescheduleRequest.booking
   if (attendee) {
     if (input.response === "ACCEPTED") {
       await sendRescheduleRequestAcceptedEmail({
         to: attendee.email,
         guestName: attendee.name,
         hostName: ctx.user.name ?? ctx.user.email,
         eventTypeName: booking.eventType?.title ?? booking.title,
         originalStartTime: booking.startTime,
         newStartTime: input.counterProposalStartTime ?? rescheduleRequest.proposedStartTime,
         language: booking.user?.locale ?? "en",
       })
     } else {
       await sendRescheduleRequestDeclinedEmail({
         to: attendee.email,
         guestName: attendee.name,
         hostName: ctx.user.name ?? ctx.user.email,
         eventTypeName: booking.eventType?.title ?? booking.title,
         language: booking.user?.locale ?? "en",
       })
     }
   }

7. return { rescheduleRequest: updated }

Imports: prisma from "@calcom/prisma", TRPCError from "@trpc/server", sendRescheduleRequestAcceptedEmail and sendRescheduleRequestDeclinedEmail from "@calcom/emails", TRPCContext, TRespondToRescheduleRequestInputSchema
```

---

## STEP 7 — Email CLASS files (CREATE 6 files)

Open `packages/emails/templates/attendee-was-requested-to-reschedule-email.ts` first so Cursor can read the real pattern.

### Cursor Prompt:
```
Open and fully read: packages/emails/templates/attendee-was-requested-to-reschedule-email.ts

Now create these 6 new files using EXACTLY that class pattern (same extends BaseEmail, same constructor, same getNodeMailerPayload, same getSubject calling this.getTranslation, same getHtmlBody calling renderEmail):

FILE 1: packages/emails/templates/booking-request-invite-email.ts
- Class: BookingRequestInviteEmail
- this.name = "SEND_BOOKING_REQUEST_INVITE"
- Props type name: BookingRequestInviteEmailProps
- Props: { to: string, guestName: string, hostName: string, eventTypeName: string, bookingLink: string, expiresAt: Date, language: string }
- Subject i18n key: "booking_request_invite_subject"
- renderEmail name: "BookingRequestInviteEmail"

FILE 2: packages/emails/templates/booking-request-expired-email.ts
- Class: BookingRequestExpiredEmail
- this.name = "SEND_BOOKING_REQUEST_EXPIRED"
- Props type name: BookingRequestExpiredEmailProps
- Props: { to: string, guestName: string, hostName: string, eventTypeName: string, language: string }
- Subject i18n key: "booking_request_expired_subject"
- renderEmail name: "BookingRequestExpiredEmail"

FILE 3: packages/emails/templates/reschedule-request-received-email.ts
- Class: RescheduleRequestReceivedEmail
- this.name = "SEND_RESCHEDULE_REQUEST_RECEIVED"
- Props type name: RescheduleRequestReceivedEmailProps
- Props: { to: string, hostName: string, guestName: string, eventTypeName: string, currentStartTime: Date, proposedStartTime?: Date, reason?: string, language: string }
- Subject i18n key: "reschedule_request_received_subject"
- renderEmail name: "RescheduleRequestReceivedEmail"

FILE 4: packages/emails/templates/reschedule-request-accepted-email.ts
- Class: RescheduleRequestAcceptedEmail
- this.name = "SEND_RESCHEDULE_REQUEST_ACCEPTED"
- Props type name: RescheduleRequestAcceptedEmailProps
- Props: { to: string, guestName: string, hostName: string, eventTypeName: string, originalStartTime: Date, newStartTime?: Date, language: string }
- Subject i18n key: "reschedule_request_accepted_subject"
- renderEmail name: "RescheduleRequestAcceptedEmail"

FILE 5: packages/emails/templates/reschedule-request-declined-email.ts
- Class: RescheduleRequestDeclinedEmail
- this.name = "SEND_RESCHEDULE_REQUEST_DECLINED"
- Props type name: RescheduleRequestDeclinedEmailProps
- Props: { to: string, guestName: string, hostName: string, eventTypeName: string, language: string }
- Subject i18n key: "reschedule_request_declined_subject"
- renderEmail name: "RescheduleRequestDeclinedEmail"

FILE 6: packages/emails/templates/reschedule-counter-proposal-email.ts
- Class: RescheduleCounterProposalEmail
- this.name = "SEND_RESCHEDULE_COUNTER_PROPOSAL"
- Props type name: RescheduleCounterProposalEmailProps
- Props: { to: string, guestName: string, hostName: string, eventTypeName: string, originalStartTime: Date, counterProposalStartTime?: Date, language: string }
- Subject i18n key: "reschedule_counter_proposal_subject"
- renderEmail name: "RescheduleCounterProposalEmail"

Export both the class as default AND the Props type as a named export from each file.
```

---

## STEP 8 — Email REACT TEMPLATE files (CREATE 6 files) ← WAS MISSING BEFORE

These are the actual HTML email bodies. Without these, `renderEmail()` in the class files will fail.

First run this to find where existing ones live:
```bash
find packages/emails/src -name "*.tsx" | head -10
```
Then open one (e.g. `AttendeeWasRequestedToRescheduleEmail.tsx`) to see the pattern.

### Cursor Prompt:
```
First open an existing email React template in packages/emails/src/templates/ (find one like AttendeeWasRequestedToRescheduleEmail.tsx) and read it to understand the exact JSX pattern, how props are typed, and how the t() function is used.

Then create 6 new React template files in the same folder:

FILE 1: BookingRequestInviteEmail.tsx
Props: { guestName: string, hostName: string, eventTypeName: string, bookingLink: string, expiresAt: Date, t: TFunction }
Content: greeting using guestName, body saying hostName invited them to book eventTypeName, a prominent button/link showing bookingLink labeled "Book your time", expiry note showing expiresAt formatted as a readable date.

FILE 2: BookingRequestExpiredEmail.tsx
Props: { guestName: string, hostName: string, eventTypeName: string, t: TFunction }
Content: greeting, message that the booking request for eventTypeName with hostName has expired, suggest contacting the host directly.

FILE 3: RescheduleRequestReceivedEmail.tsx
Props: { hostName: string, guestName: string, eventTypeName: string, currentStartTime: Date, proposedStartTime?: Date, reason?: string, t: TFunction }
Content: greeting using hostName, message that guestName has requested to reschedule eventTypeName, show currentStartTime, show proposedStartTime if provided, show reason if provided.

FILE 4: RescheduleRequestAcceptedEmail.tsx
Props: { guestName: string, hostName: string, eventTypeName: string, originalStartTime: Date, newStartTime?: Date, t: TFunction }
Content: greeting using guestName, message that the reschedule request for eventTypeName was accepted, show original time and new time if provided.

FILE 5: RescheduleRequestDeclinedEmail.tsx
Props: { guestName: string, hostName: string, eventTypeName: string, t: TFunction }
Content: greeting using guestName, message that the reschedule request for eventTypeName with hostName was declined, original time remains.

FILE 6: RescheduleCounterProposalEmail.tsx
Props: { guestName: string, hostName: string, eventTypeName: string, originalStartTime: Date, counterProposalStartTime?: Date, t: TFunction }
Content: greeting using guestName, message that hostName proposed a new time for eventTypeName, show original and proposed new time.

Match the EXACT JSX structure, styling, and component imports of the existing templates in this folder. Do not invent new patterns.
```

---

## STEP 9 — Modify email-manager.ts (MODIFY existing file)

Open `packages/emails/email-manager.ts`. Find `sendRequestRescheduleEmailAndSMS` around line 196 to see the pattern.

### Cursor Prompt:
```
Modify packages/emails/email-manager.ts

Step 1 — Add these 6 imports at the top alongside the other email class imports:

import BookingRequestInviteEmail, { type BookingRequestInviteEmailProps } from "./templates/booking-request-invite-email";
import BookingRequestExpiredEmail, { type BookingRequestExpiredEmailProps } from "./templates/booking-request-expired-email";
import RescheduleRequestReceivedEmail, { type RescheduleRequestReceivedEmailProps } from "./templates/reschedule-request-received-email";
import RescheduleRequestAcceptedEmail, { type RescheduleRequestAcceptedEmailProps } from "./templates/reschedule-request-accepted-email";
import RescheduleRequestDeclinedEmail, { type RescheduleRequestDeclinedEmailProps } from "./templates/reschedule-request-declined-email";
import RescheduleCounterProposalEmail, { type RescheduleCounterProposalEmailProps } from "./templates/reschedule-counter-proposal-email";

Step 2 — Add these 6 exported functions at the BOTTOM of the file. Copy the exact same async pattern as sendRequestRescheduleEmailAndSMS:

export const sendBookingRequestInviteEmail = async (props: BookingRequestInviteEmailProps) => {
  await sendEmail(new BookingRequestInviteEmail(props));
};
export const sendBookingRequestExpiredEmail = async (props: BookingRequestExpiredEmailProps) => {
  await sendEmail(new BookingRequestExpiredEmail(props));
};
export const sendRescheduleRequestReceivedEmail = async (props: RescheduleRequestReceivedEmailProps) => {
  await sendEmail(new RescheduleRequestReceivedEmail(props));
};
export const sendRescheduleRequestAcceptedEmail = async (props: RescheduleRequestAcceptedEmailProps) => {
  await sendEmail(new RescheduleRequestAcceptedEmail(props));
};
export const sendRescheduleRequestDeclinedEmail = async (props: RescheduleRequestDeclinedEmailProps) => {
  await sendEmail(new RescheduleRequestDeclinedEmail(props));
};
export const sendRescheduleCounterProposalEmail = async (props: RescheduleCounterProposalEmailProps) => {
  await sendEmail(new RescheduleCounterProposalEmail(props));
};

Do not touch anything else in the file.
```

---

## STEP 10 — Add barrel exports to emails index.ts ← WAS MISSING BEFORE

This is what makes `import { sendBookingRequestInviteEmail } from "@calcom/emails"` actually work.

First find the barrel file:
```bash
cat packages/emails/index.ts
```

### Cursor Prompt:
```
Open packages/emails/index.ts

Find where existing email send functions are exported (look for existing exports like sendRequestRescheduleEmailAndSMS or similar).

Add these 6 exports in the same style:

export {
  sendBookingRequestInviteEmail,
  sendBookingRequestExpiredEmail,
  sendRescheduleRequestReceivedEmail,
  sendRescheduleRequestAcceptedEmail,
  sendRescheduleRequestDeclinedEmail,
  sendRescheduleCounterProposalEmail,
} from "./email-manager";

Also export the 6 Props types:

export type { BookingRequestInviteEmailProps } from "./templates/booking-request-invite-email";
export type { BookingRequestExpiredEmailProps } from "./templates/booking-request-expired-email";
export type { RescheduleRequestReceivedEmailProps } from "./templates/reschedule-request-received-email";
export type { RescheduleRequestAcceptedEmailProps } from "./templates/reschedule-request-accepted-email";
export type { RescheduleRequestDeclinedEmailProps } from "./templates/reschedule-request-declined-email";
export type { RescheduleCounterProposalEmailProps } from "./templates/reschedule-counter-proposal-email";

Do not remove or change any existing exports.
```

---

## STEP 11 — Add i18n keys to common.json

### Cursor Prompt:
```
Open packages/i18n/locales/en/common.json

Search for "request_reschedule_booking_subject" to find where email subject keys live.

Add these 12 new keys in that same section. Keep the JSON valid (no trailing commas):

"booking_request_invite_subject": "{{hostName}} has invited you to book {{eventTypeName}}",
"booking_request_invite_body": "{{hostName}} has invited you to schedule {{eventTypeName}}. Click the button below to book your time. This link expires on {{expiresAt}}.",
"booking_request_expired_subject": "Your booking request link has expired",
"booking_request_expired_body": "Your invitation to book {{eventTypeName}} with {{hostName}} has expired. Please contact them to request a new link.",
"reschedule_request_received_subject": "{{guestName}} has requested to reschedule {{eventTypeName}}",
"reschedule_request_received_body": "{{guestName}} has requested to reschedule your {{eventTypeName}} meeting.",
"reschedule_request_accepted_subject": "Your reschedule request has been accepted",
"reschedule_request_accepted_body": "Your request to reschedule {{eventTypeName}} with {{hostName}} has been accepted.",
"reschedule_request_declined_subject": "Your reschedule request has been declined",
"reschedule_request_declined_body": "Your request to reschedule {{eventTypeName}} with {{hostName}} was declined. Your original booking time remains unchanged.",
"reschedule_counter_proposal_subject": "{{hostName}} proposed a new time for {{eventTypeName}}",
"reschedule_counter_proposal_body": "{{hostName}} has proposed a new time for {{eventTypeName}}. Please review and confirm the new schedule."

Verify the file is valid JSON after adding the keys.
```

---

## STEP 12 — TypeScript compile check + fix

```bash
# Handlers
yarn tsc --noEmit -p packages/trpc/tsconfig.json

# Emails
yarn tsc --noEmit -p packages/emails/tsconfig.json

# Full build smoke test
yarn build --filter=@calcom/emails
yarn build --filter=@calcom/trpc
```

### Cursor Prompt for any TS error:
```
I have this TypeScript error in my Cal.com handler/email file:
[PASTE THE FULL ERROR]

The file is: [FILE PATH]
The relevant code is:
[PASTE THE CODE BLOCK]

Look at requestReschedule.handler.ts in packages/trpc/server/routers/viewer/bookings/ for the correct handler patterns.
Look at attendee-was-requested-to-reschedule-email.ts in packages/emails/templates/ for the correct email patterns.

Fix the type error while keeping the exact same code style as those reference files.
Only fix the type issue — do not change any logic.
```

---

## COMPLETE FILE CHECKLIST

### Handlers (5 new files)
- [ ] `packages/trpc/server/routers/viewer/bookings/createBookingRequest.handler.ts`
- [ ] `packages/trpc/server/routers/viewer/bookings/listBookingRequests.handler.ts`
- [ ] `packages/trpc/server/routers/viewer/bookings/cancelBookingRequest.handler.ts`
- [ ] `packages/trpc/server/routers/viewer/bookings/requestRescheduleAsAttendee.handler.ts`
- [ ] `packages/trpc/server/routers/viewer/bookings/respondToRescheduleRequest.handler.ts`

### HashedLinkService (1 modified file)
- [ ] `packages/features/hashedLink/lib/service/HashedLinkService.ts` — added `validateAndConsumeBookingRequestLink()`

### Email class files (6 new files)
- [ ] `packages/emails/templates/booking-request-invite-email.ts`
- [ ] `packages/emails/templates/booking-request-expired-email.ts`
- [ ] `packages/emails/templates/reschedule-request-received-email.ts`
- [ ] `packages/emails/templates/reschedule-request-accepted-email.ts`
- [ ] `packages/emails/templates/reschedule-request-declined-email.ts`
- [ ] `packages/emails/templates/reschedule-counter-proposal-email.ts`

### Email React templates (6 new files) ← was missing before
- [ ] `packages/emails/src/templates/BookingRequestInviteEmail.tsx`
- [ ] `packages/emails/src/templates/BookingRequestExpiredEmail.tsx`
- [ ] `packages/emails/src/templates/RescheduleRequestReceivedEmail.tsx`
- [ ] `packages/emails/src/templates/RescheduleRequestAcceptedEmail.tsx`
- [ ] `packages/emails/src/templates/RescheduleRequestDeclinedEmail.tsx`
- [ ] `packages/emails/src/templates/RescheduleCounterProposalEmail.tsx`

### Modified files (3)
- [ ] `packages/emails/email-manager.ts` — 6 imports + 6 functions added
- [ ] `packages/emails/index.ts` — 6 function exports + 6 type exports added ← was missing before
- [ ] `packages/i18n/locales/en/common.json` — 12 keys added

### Compile checks
- [ ] `yarn tsc --noEmit -p packages/trpc/tsconfig.json` passes clean
- [ ] `yarn tsc --noEmit -p packages/emails/tsconfig.json` passes clean
- [ ] Branch pushed and teammates notified

---

## WHAT YOU DO NOT OWN (do not touch these)
- `.schema.ts` files — Rich (P1) owns all 5 of these
- `_router.tsx` route registration — Rich (P1) owns this
- Any UI components — Cherice (P3) owns these
- Tests — Cherice (P3) owns all tests
