# Design: BullMQ + Twilio Debt Reminder System

**Date:** 2026-03-21
**Status:** Approved

---

## Overview

Implement a job queue system using BullMQ + Redis that sends debt payment reminders via Twilio 1 day before the `dueDate`. Each `Debt` stores its own list of notification channels (`MessageChannel[]`). A `node-cron` scheduler runs daily at 08:30, queries debts due the next day, and enqueues one BullMQ job per channel per debt. A single Worker processes all jobs using the Strategy Pattern (one provider per channel).

---

## Architecture

### Request Flow — Manual Send

```
POST /messages/send (requires Clerk auth)
  body: { debtId: string, channels?: MessageChannel[] }
        ↓
  uses channels from body OR debt.channels from DB
        ↓
  messageQueue.add("send-message", { debtId, channel }) × N channels
        ↓
  Worker picks up job
        ↓
  findDebtWithClient(debtId) → debt + client
        ↓
  getProvider(channel) → provider.send(debt)  →  Twilio API
        ↓
  twilioStatusMap[rawStatus] → MessageStatus
        ↓
  createMessageLog({ debtId, channel, status, sentAt })
```

### Scheduler Flow — Daily 08:30

```
node-cron ("30 8 * * *") → debt-reminder.scheduler.ts
        ↓
  findDebtsDueTomorrow() → Debt[] (status=PENDING, dueDate=tomorrow, include client)
        ↓
  for each debt → for each channel in debt.channels
        ↓
  messageQueue.add("send-message", { debtId, channel })
```

---

## Database Change

Add `channels` field to `Debt` model:

```prisma
model Debt {
  id        String           @id @default(uuid())
  amount    Float
  dueDate   DateTime
  status    DebtStatus       @default(PENDING)
  channels  MessageChannel[] // NEW — defaults to empty array
  createdAt DateTime         @default(now())

  clientId String
  client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  messages MessageLog[]
}
```

**Note:** Existing debts will have `channels = []` after migration. The scheduler will silently skip them until the field is populated — this is expected behavior, not a bug.

Migration required: `pnpm prisma migrate dev`.

---

## File Structure

The current `src/ jobs/` directory (with a space in the name) must be **renamed** to `src/jobs/`. The existing `message.worker.ts` uses broken `@/` path aliases and is dead code — it must be fully rewritten, not patched.

```
src/
  jobs/
    queues/
      message.queue.ts              # existing — BullMQ Queue
    workers/
      message.worker.ts             # REWRITE — proper ESM imports, Strategy dispatch
    scheduler/
      debt-reminder.scheduler.ts    # NEW — node-cron at 08:30
  modules/
    message/
      message.service.ts            # UPDATE — enqueue by channels array
      message.repository.ts         # existing
      providers/
        message-provider.interface.ts   # NEW — IMessageProvider interface
        sms.provider.ts                 # NEW — Twilio SMS
        whatsapp.provider.ts            # NEW — Twilio WhatsApp
        email.provider.ts               # NEW — Twilio SendGrid (separate SDK)
        call.provider.ts                # NEW — Twilio Voice Call
        provider.factory.ts             # NEW — maps MessageChannel → IMessageProvider
```

---

## Components

### IMessageProvider (interface)

```ts
import type { MessageStatus } from "../../../generated/prisma/enums.js"
import type { Debt, Client } from "../../../generated/prisma/index.js"

export interface IMessageProvider {
  send(debt: Debt & { client: Client }): Promise<{ status: MessageStatus }>
}
```

Providers return a typed `MessageStatus` directly (no raw Twilio string leaking out).

### ProviderFactory

```ts
import { MessageChannel } from "../../../generated/prisma/enums.js"
import { SmsProvider } from "./sms.provider.js"
import { WhatsappProvider } from "./whatsapp.provider.js"
import { EmailProvider } from "./email.provider.js"
import { CallProvider } from "./call.provider.js"
import type { IMessageProvider } from "./message-provider.interface.js"

const providerMap: Record<MessageChannel, IMessageProvider> = {
  SMS: new SmsProvider(),
  WHATSAPP: new WhatsappProvider(),
  EMAIL: new EmailProvider(),
  CALL: new CallProvider(),
}

export function getProvider(channel: MessageChannel): IMessageProvider {
  return providerMap[channel]
}
```

### Providers

| Channel   | Twilio API / SDK                                                         |
|-----------|--------------------------------------------------------------------------|
| SMS       | `twilioClient.messages.create({ from: TWILIO_PHONE, to: client.phone, body })` |
| WHATSAPP  | `twilioClient.messages.create({ from: "whatsapp:+...", to: "whatsapp:+..." })` |
| EMAIL     | `@sendgrid/mail` → `sgMail.send({ to, from, subject, text })` (separate package) |
| CALL      | `twilioClient.calls.create({ from: TWILIO_PHONE, to: client.phone, twiml })` |

**EMAIL note:** SendGrid email requires `@sendgrid/mail` (`pnpm add @sendgrid/mail`). It is a separate SDK from the Twilio REST client.

Each provider uses `debt.client.phone` for SMS/WhatsApp/Call and `debt.client.email` for Email. If the required field is missing (`null`/`undefined`), the provider throws a descriptive error and the worker logs `FAILED`.

### message.worker.ts (rewrite)

```ts
import { Worker } from "bullmq"
import { redisConnection } from "../../shared/plugins/redis.js"
import { getProvider } from "../../modules/message/providers/provider.factory.js"
import { findDebtWithClient } from "../../modules/debt/debt.repository.js"
import { createMessageLog } from "../../modules/message/message.repository.js"
import { MessageStatus, type MessageChannel } from "../../../generated/prisma/enums.js"

export const messageWorker = new Worker(
  "message-queue",
  async (job) => {
    if (job.name === "send-message") {
      const { debtId, channel } = job.data as { debtId: string; channel: MessageChannel }
      const debt = await findDebtWithClient(debtId)
      const provider = getProvider(channel)
      const result = await provider.send(debt)
      await createMessageLog({ debtId, channel, status: result.status, sentAt: new Date() })
    }
  },
  { connection: redisConnection() }, // factory call — see Redis section
)

// On final failure, write FAILED log
messageWorker.on("failed", async (job, err) => {
  if (job && job.name === "send-message") {
    const { debtId, channel } = job.data
    await createMessageLog({ debtId, channel, status: MessageStatus.FAILED, sentAt: new Date() })
  }
})
```

### debt-reminder.scheduler.ts

```ts
import cron from "node-cron"
import { messageQueue } from "../queues/message.queue.js"
import { findDebtsDueTomorrow } from "../../modules/debt/debt.repository.js"

export function startDebtReminderScheduler() {
  cron.schedule("30 8 * * *", async () => {
    const debts = await findDebtsDueTomorrow()
    for (const debt of debts) {
      for (const channel of debt.channels) {
        await messageQueue.add("send-message", { debtId: debt.id, channel }, {
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
        })
      }
    }
  })
}
```

Requires `pnpm add node-cron` + `pnpm add -D @types/node-cron`.

### POST /messages/send

```
POST /messages/send
Auth: required (Clerk — getAuth(request))
Body: {
  debtId: string,
  channels?: MessageChannel[]   // optional; falls back to debt.channels
}
Response 200: { queued: number }
Response 400: { error: string }   // missing channels (body and debt both empty)
Response 401: { error: string }   // unauthenticated
```

### Debt DTO Updates

```ts
// debt.schema.ts
export const CreateDebtSchema = z.object({
  amount: z.number(),
  dueDate: z.string().datetime(),
  clientId: z.string(),
  channels: z.array(z.enum(["SMS", "WHATSAPP", "EMAIL", "CALL"])).default([]),
})
```

`channels` is optional on create and defaults to `[]`.

---

## Debt Repository Additions

```ts
// Add to debt.repository.ts

export async function findDebtsDueTomorrow() {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)
  tomorrow.setHours(0, 0, 0, 0)
  const dayAfter = new Date(tomorrow)
  dayAfter.setDate(tomorrow.getDate() + 1)

  return prisma.debt.findMany({
    where: {
      status: "PENDING",
      dueDate: { gte: tomorrow, lt: dayAfter },
    },
    include: { client: true },
  })
}

export async function findDebtWithClient(id: string) {
  return prisma.debt.findUniqueOrThrow({
    where: { id },
    include: { client: true },
  })
}
```

No `date-fns` needed — plain `Date` arithmetic is used.

---

## Redis Connection

BullMQ requires separate Redis connection instances for `Queue` (non-blocking) and `Worker` (blocking subscribe). Change `redis.ts` to export a factory function:

```ts
// shared/plugins/redis.ts
import { Redis } from "ioredis"

export function redisConnection() {
  return new Redis({
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null, // required by BullMQ
  })
}
```

Update `message.queue.ts` and `message.worker.ts` to call `redisConnection()` (new instance each time).

---

## Graceful Shutdown

In `src/index.ts`, register shutdown handlers:

```ts
import { messageWorker } from "./jobs/workers/message.worker.js"

process.on("SIGTERM", async () => {
  await messageWorker.close()
  await app.close()
  process.exit(0)
})
process.on("SIGINT", async () => {
  await messageWorker.close()
  await app.close()
  process.exit(0)
})
```

---

## Environment Variables Required

```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=          # SMS/Call sender (E.164 format)
TWILIO_WHATSAPP_NUMBER=       # WhatsApp sender (e.g. whatsapp:+14155238886)
SENDGRID_API_KEY=             # Email via @sendgrid/mail
SENDGRID_FROM_EMAIL=          # Verified sender email
REDIS_HOST=
REDIS_PORT=
```

---

## New Dependencies

```bash
pnpm add node-cron @sendgrid/mail
pnpm add -D @types/node-cron
```

---

## Migration Steps

1. Rename `src/ jobs/` → `src/jobs/` (remove space from directory name)
2. Install new dependencies: `pnpm add node-cron @sendgrid/mail && pnpm add -D @types/node-cron` — must happen before any file imports these packages
3. Add `channels MessageChannel[]` to Prisma schema; run `pnpm prisma migrate dev && pnpm prisma generate` (generate must follow migrate to regenerate the TypeScript client before compilation)
4. Update `CreateDebtDTO` Zod schema to include `channels` (optional, default `[]`) — must be done immediately after step 3 or `prisma.debt.create` will fail to compile
5. Change `redis.ts` to export a factory function; update all callers: `src/jobs/queues/message.queue.ts` and `src/jobs/workers/message.worker.ts` — both must call `redisConnection()` (factory), not reference the old singleton
6. Add `findDebtsDueTomorrow()` and `findDebtWithClient()` to `debt.repository.ts` — **must happen before step 7** (worker imports these functions)
7. Implement `IMessageProvider` interface + all 4 providers + `ProviderFactory`
8. Rewrite `message.worker.ts` with proper ESM imports + `failed` event handler (uses `MessageStatus.FAILED` enum, not string literal)
9. Implement `debt-reminder.scheduler.ts` with `node-cron`
10. Add `POST /messages/send` route to `message.routes.ts` (create if needed) with Clerk auth
11. Register worker + scheduler in `src/index.ts` + add graceful shutdown handlers
12. Add new env vars to `.env.example`

**Known MVP limitation:** If a Twilio call succeeds but the subsequent `createMessageLog` call inside the processor fails, the `failed` event handler will write a second `FAILED` log for the same job. This double-write is acceptable for MVP; a future improvement would add a unique constraint on `MessageLog(debtId, channel, jobId)` or deduplicate in the `failed` handler.
