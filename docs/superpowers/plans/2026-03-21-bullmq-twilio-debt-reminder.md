# BullMQ + Twilio Debt Reminder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a BullMQ job queue that sends Twilio debt payment reminders (SMS, WhatsApp, Email, Call) 1 day before each debt's `dueDate`, triggered by a daily cron at 08:30 and also manually via `POST /messages/send`.

**Architecture:** Each `Debt` stores a `channels: MessageChannel[]` array. A `node-cron` scheduler at 08:30 finds debts due tomorrow and enqueues one BullMQ job per channel. A single Worker uses the Strategy Pattern — a `ProviderFactory` maps each `MessageChannel` to a dedicated provider class (`SmsProvider`, `WhatsappProvider`, `EmailProvider`, `CallProvider`) that calls the appropriate Twilio/SendGrid API and returns a typed `MessageStatus`.

**Tech Stack:** Fastify 5, TypeScript ESM (no path aliases — use relative imports with `.js` extension), Prisma 7 (client at `generated/prisma/`), BullMQ 5, ioredis, twilio SDK, @sendgrid/mail, node-cron, Node 22.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/shared/plugins/redis.ts` | Modify | Change singleton → factory function |
| `prisma/schema.prisma` | Modify | Add `channels MessageChannel[]` to `Debt` |
| `src/modules/debt/debt.schema.ts` | Modify | Add `channels` to `CreateDebtSchema` and `DebtSchema` |
| `src/modules/debt/debt.repository.ts` | Modify | Add `findDebtsDueTomorrow()` and `findDebtWithClient()` |
| `src/jobs/queues/message.queue.ts` | Modify | Use `redisConnection()` factory (rename dir first) |
| `src/modules/message/providers/message-provider.interface.ts` | Create | `IMessageProvider` interface |
| `src/modules/message/providers/sms.provider.ts` | Create | Twilio SMS |
| `src/modules/message/providers/whatsapp.provider.ts` | Create | Twilio WhatsApp |
| `src/modules/message/providers/email.provider.ts` | Create | SendGrid email |
| `src/modules/message/providers/call.provider.ts` | Create | Twilio Voice Call |
| `src/modules/message/providers/provider.factory.ts` | Create | Maps `MessageChannel` → `IMessageProvider` |
| `src/jobs/workers/message.worker.ts` | Rewrite | BullMQ Worker with Strategy dispatch + failed handler |
| `src/jobs/scheduler/debt-reminder.scheduler.ts` | Create | node-cron 08:30 daily scheduler |
| `src/modules/message/message.routes.ts` | Create | `POST /messages/send` route |
| `src/modules/message/message.service.ts` | Modify | Enqueue jobs by channels array |
| `src/routes.ts` | Modify | Register `messageRoutes` |
| `src/index.ts` | Modify | Start worker + scheduler + graceful shutdown |
| `.env.example` | Modify | Add new env vars |

---

## Task 1: Rename directory and install dependencies

**Files:**
- Rename: `src/ jobs/` → `src/jobs/` (directory has a space — must fix before any imports work)

- [ ] **Step 1: Rename the broken directory**

```bash
mv "/Users/pedromonteiro/Documents/github-repository/smart-notas-notas/src/ jobs" \
   "/Users/pedromonteiro/Documents/github-repository/smart-notas-notas/src/jobs"
```

- [ ] **Step 2: Verify the rename worked**

```bash
ls src/jobs/
```
Expected output: `queues/  workers/`

- [ ] **Step 3: Install new dependencies**

```bash
pnpm add node-cron @sendgrid/mail
pnpm add -D @types/node-cron
```

- [ ] **Step 4: Verify packages installed**

```bash
grep -E "node-cron|sendgrid" package.json
```
Expected: both packages appear in `dependencies`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: rename jobs directory and install node-cron + sendgrid dependencies"
```

---

## Task 2: Fix Redis connection (singleton → factory)

The existing `redis.ts` exports a shared singleton instance. BullMQ's Worker uses blocking Redis commands and requires its own dedicated connection. Passing the singleton to both Queue and Worker will crash at runtime.

**Files:**
- Modify: `src/shared/plugins/redis.ts`

- [ ] **Step 1: Replace singleton with factory**

Replace the entire content of `src/shared/plugins/redis.ts` with:

```ts
import "dotenv/config";

import { Redis } from "ioredis";

export function redisConnection() {
  return new Redis({
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null, // required by BullMQ Worker
  });
}
```

- [ ] **Step 2: Update message.queue.ts to use factory**

Replace the entire content of `src/jobs/queues/message.queue.ts` with:

```ts
import { Queue } from "bullmq";

import { redisConnection } from "../../shared/plugins/redis.js";

export const messageQueue = new Queue("message-queue", {
  connection: redisConnection(),
});
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors related to `redisConnection`.

- [ ] **Step 4: Commit**

```bash
git add src/shared/plugins/redis.ts src/jobs/queues/message.queue.ts
git commit -m "fix: convert redis plugin to factory function for BullMQ compatibility"
```

---

## Task 3: Prisma schema — add channels to Debt

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/modules/debt/debt.schema.ts`

- [ ] **Step 1: Add `channels` field to Debt model**

In `prisma/schema.prisma`, find the `Debt` model and add the `channels` field after `status`:

```prisma
model Debt {
  id        String           @id @default(uuid())
  amount    Float
  dueDate   DateTime
  status    DebtStatus       @default(PENDING)
  channels  MessageChannel[]
  createdAt DateTime         @default(now())

  clientId String
  client   Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  messages MessageLog[]
}
```

- [ ] **Step 2: Run migration and regenerate client**

```bash
pnpm prisma migrate dev --name add_channels_to_debt
pnpm prisma generate
```

Expected: migration created in `prisma/migrations/`, client regenerated in `generated/prisma/`.

- [ ] **Step 3: Update DebtSchema and CreateDebtSchema in debt.schema.ts**

Replace the entire content of `src/modules/debt/debt.schema.ts` with:

```ts
import { z } from "zod";

export const DebtStatusSchema = z.enum(["PENDING", "PAID", "OVERDUE"]);
export const MessageChannelSchema = z.enum(["SMS", "WHATSAPP", "EMAIL", "CALL"]);

export const DebtSchema = z.object({
  id: z.string(),
  amount: z.number(),
  dueDate: z.coerce.date(),
  status: DebtStatusSchema,
  channels: z.array(MessageChannelSchema),
  createdAt: z.coerce.date(),
  clientId: z.string(),
});

export const CreateDebtSchema = z.object({
  amount: z.number().positive(),
  dueDate: z.coerce.date(),
  clientId: z.string(),
  channels: z.array(MessageChannelSchema).default([]),
});

export const UpdateDebtStatusSchema = z.object({
  status: DebtStatusSchema,
});

export type DebtDTO = z.infer<typeof DebtSchema>;
export type CreateDebtDTO = z.infer<typeof CreateDebtSchema>;
export type UpdateDebtStatusDTO = z.infer<typeof UpdateDebtStatusSchema>;
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/modules/debt/debt.schema.ts
git commit -m "feat: add channels array to Debt model and update Zod schemas"
```

---

## Task 4: Debt repository — add query functions

The Worker and Scheduler need two new functions: one to find debts due tomorrow, one to find a debt with its client included.

**Files:**
- Modify: `src/modules/debt/debt.repository.ts`

- [ ] **Step 1: Add the two new functions**

Append to the bottom of `src/modules/debt/debt.repository.ts`:

```ts
export async function findDebtsDueTomorrow() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(tomorrow.getDate() + 1);

  return prisma.debt.findMany({
    where: {
      status: "PENDING",
      dueDate: { gte: tomorrow, lt: dayAfter },
    },
    include: { client: true },
  });
}

export async function findDebtWithClient(id: string) {
  return prisma.debt.findUniqueOrThrow({
    where: { id },
    include: { client: true },
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/modules/debt/debt.repository.ts
git commit -m "feat: add findDebtsDueTomorrow and findDebtWithClient to debt repository"
```

---

## Task 5: Create message providers

Each channel gets its own provider class implementing `IMessageProvider`. All providers return `{ status: MessageStatus }` — no raw Twilio strings leak to the worker.

**Files:**
- Create: `src/modules/message/providers/message-provider.interface.ts`
- Create: `src/modules/message/providers/sms.provider.ts`
- Create: `src/modules/message/providers/whatsapp.provider.ts`
- Create: `src/modules/message/providers/email.provider.ts`
- Create: `src/modules/message/providers/call.provider.ts`
- Create: `src/modules/message/providers/provider.factory.ts`

- [ ] **Step 1: Create the IMessageProvider interface**

Create `src/modules/message/providers/message-provider.interface.ts`:

```ts
import type { Client, Debt } from "../../../../generated/prisma/index.js";
import type { MessageStatus } from "../../../../generated/prisma/enums.js";

export interface IMessageProvider {
  send(debt: Debt & { client: Client }): Promise<{ status: MessageStatus }>;
}
```

- [ ] **Step 2: Create SmsProvider**

Create `src/modules/message/providers/sms.provider.ts`:

```ts
import twilio from "twilio";

import { twilioStatusMap } from "../../../shared/utils/message-status-labels.js";
import type { IMessageProvider } from "./message-provider.interface.js";
import type { Client, Debt } from "../../../../generated/prisma/index.js";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

export class SmsProvider implements IMessageProvider {
  async send(debt: Debt & { client: Client }) {
    if (!debt.client.phone) {
      throw new Error(`Client ${debt.client.id} has no phone number for SMS`);
    }

    const response = await twilioClient.messages.create({
      body: `Lembrete: sua dívida de R$${debt.amount} vence amanhã (${debt.dueDate.toLocaleDateString("pt-BR")}).`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: debt.client.phone,
    });

    return { status: twilioStatusMap[response.status] };
  }
}
```

- [ ] **Step 3: Create WhatsappProvider**

Create `src/modules/message/providers/whatsapp.provider.ts`:

```ts
import twilio from "twilio";

import { twilioStatusMap } from "../../../shared/utils/message-status-labels.js";
import type { IMessageProvider } from "./message-provider.interface.js";
import type { Client, Debt } from "../../../../generated/prisma/index.js";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

export class WhatsappProvider implements IMessageProvider {
  async send(debt: Debt & { client: Client }) {
    if (!debt.client.phone) {
      throw new Error(`Client ${debt.client.id} has no phone number for WhatsApp`);
    }

    const response = await twilioClient.messages.create({
      body: `🔔 Lembrete: sua dívida de R$${debt.amount} vence amanhã (${debt.dueDate.toLocaleDateString("pt-BR")}).`,
      from: process.env.TWILIO_WHATSAPP_NUMBER,
      to: `whatsapp:${debt.client.phone}`,
    });

    return { status: twilioStatusMap[response.status] };
  }
}
```

- [ ] **Step 4: Create EmailProvider**

Create `src/modules/message/providers/email.provider.ts`:

```ts
import sgMail from "@sendgrid/mail";

import { MessageStatus } from "../../../../generated/prisma/enums.js";
import type { IMessageProvider } from "./message-provider.interface.js";
import type { Client, Debt } from "../../../../generated/prisma/index.js";

sgMail.setApiKey(process.env.SENDGRID_API_KEY ?? "");

export class EmailProvider implements IMessageProvider {
  async send(debt: Debt & { client: Client }) {
    if (!debt.client.email) {
      throw new Error(`Client ${debt.client.id} has no email for Email channel`);
    }

    await sgMail.send({
      to: debt.client.email,
      from: process.env.SENDGRID_FROM_EMAIL ?? "",
      subject: "Lembrete de vencimento de dívida",
      text: `Olá ${debt.client.name}, sua dívida de R$${debt.amount} vence amanhã (${debt.dueDate.toLocaleDateString("pt-BR")}). Por favor, regularize seu pagamento.`,
    });

    return { status: MessageStatus.SENT };
  }
}
```

> **Note:** SendGrid does not return a Twilio-style status string, so we return `MessageStatus.SENT` directly on success.

- [ ] **Step 5: Create CallProvider**

Create `src/modules/message/providers/call.provider.ts`:

```ts
import twilio from "twilio";

import { twilioStatusMap } from "../../../shared/utils/message-status-labels.js";
import type { IMessageProvider } from "./message-provider.interface.js";
import type { Client, Debt } from "../../../../generated/prisma/index.js";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(accountSid, authToken);

export class CallProvider implements IMessageProvider {
  async send(debt: Debt & { client: Client }) {
    if (!debt.client.phone) {
      throw new Error(`Client ${debt.client.id} has no phone number for Call`);
    }

    const twiml = `<Response><Say language="pt-BR">Olá. Você possui uma dívida de ${debt.amount} reais que vence amanhã. Por favor, regularize seu pagamento.</Say></Response>`;

    const response = await twilioClient.calls.create({
      twiml,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: debt.client.phone,
    });

    return { status: twilioStatusMap[response.status] };
  }
}
```

- [ ] **Step 6: Create ProviderFactory**

Create `src/modules/message/providers/provider.factory.ts`:

```ts
import { MessageChannel } from "../../../../generated/prisma/enums.js";
import type { IMessageProvider } from "./message-provider.interface.js";
import { CallProvider } from "./call.provider.js";
import { EmailProvider } from "./email.provider.js";
import { SmsProvider } from "./sms.provider.js";
import { WhatsappProvider } from "./whatsapp.provider.js";

const providerMap: Record<MessageChannel, IMessageProvider> = {
  [MessageChannel.SMS]: new SmsProvider(),
  [MessageChannel.WHATSAPP]: new WhatsappProvider(),
  [MessageChannel.EMAIL]: new EmailProvider(),
  [MessageChannel.CALL]: new CallProvider(),
};

export function getProvider(channel: MessageChannel): IMessageProvider {
  return providerMap[channel];
}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/modules/message/providers/
git commit -m "feat: add message providers (SMS, WhatsApp, Email, Call) with provider factory"
```

---

## Task 6: Rewrite message.worker.ts

The existing worker at `src/jobs/workers/message.worker.ts` uses broken `@/` path aliases — it has never run. Rewrite it from scratch with correct ESM relative imports.

**Files:**
- Rewrite: `src/jobs/workers/message.worker.ts`

- [ ] **Step 1: Rewrite the worker**

Replace the entire content of `src/jobs/workers/message.worker.ts`:

```ts
import { Worker } from "bullmq";

import { MessageStatus, type MessageChannel } from "../../../generated/prisma/enums.js";
import { findDebtWithClient } from "../../modules/debt/debt.repository.js";
import { createMessageLog } from "../../modules/message/message.repository.js";
import { getProvider } from "../../modules/message/providers/provider.factory.js";
import { redisConnection } from "../../shared/plugins/redis.js";

export const messageWorker = new Worker(
  "message-queue",
  async (job) => {
    if (job.name === "send-message") {
      const { debtId, channel } = job.data as { debtId: string; channel: MessageChannel };
      const debt = await findDebtWithClient(debtId);
      const provider = getProvider(channel);
      const result = await provider.send(debt);
      await createMessageLog({ debtId, channel, status: result.status, sentAt: new Date() });
    }
  },
  {
    connection: redisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    },
  },
);

messageWorker.on("failed", async (job, _err) => {
  if (job && job.name === "send-message") {
    const { debtId, channel } = job.data as { debtId: string; channel: MessageChannel };
    await createMessageLog({
      debtId,
      channel,
      status: MessageStatus.FAILED,
      sentAt: new Date(),
    });
  }
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/jobs/workers/message.worker.ts
git commit -m "feat: rewrite message worker with ESM imports and Strategy Pattern dispatch"
```

---

## Task 7: Create debt-reminder scheduler

**Files:**
- Create: `src/jobs/scheduler/debt-reminder.scheduler.ts`

- [ ] **Step 1: Create the scheduler**

Create `src/jobs/scheduler/debt-reminder.scheduler.ts`:

```ts
import cron from "node-cron";

import { findDebtsDueTomorrow } from "../../modules/debt/debt.repository.js";
import { messageQueue } from "../queues/message.queue.js";

export function startDebtReminderScheduler() {
  cron.schedule("30 8 * * *", async () => {
    console.log("[scheduler] Running debt reminder job at", new Date().toISOString());

    const debts = await findDebtsDueTomorrow();
    console.log(`[scheduler] Found ${debts.length} debts due tomorrow`);

    for (const debt of debts) {
      for (const channel of debt.channels) {
        await messageQueue.add(
          "send-message",
          { debtId: debt.id, channel },
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
          },
        );
      }
    }
  });

  console.log("[scheduler] Debt reminder scheduler started — runs daily at 08:30");
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/jobs/scheduler/debt-reminder.scheduler.ts
git commit -m "feat: add debt reminder scheduler with node-cron at 08:30 daily"
```

---

## Task 8: Create POST /messages/send route

**Files:**
- Create: `src/modules/message/message.routes.ts`
- Modify: `src/modules/message/message.service.ts`
- Modify: `src/routes.ts`

- [ ] **Step 1: Update message.service.ts to enqueue jobs**

Replace the entire content of `src/modules/message/message.service.ts`:

```ts
import { type MessageChannel } from "../../../generated/prisma/enums.js";
import { findDebtWithClient } from "../debt/debt.repository.js";
import { messageQueue } from "../../jobs/queues/message.queue.js";
import { findMessagesByDebtId } from "./message.repository.js";

export async function listMessages(debtId: string) {
  return findMessagesByDebtId(debtId);
}

export async function enqueueMessages(data: {
  debtId: string;
  channels?: MessageChannel[];
}) {
  const debt = await findDebtWithClient(data.debtId);
  const channels = data.channels && data.channels.length > 0 ? data.channels : debt.channels;

  if (channels.length === 0) {
    throw new Error("No channels configured for this debt");
  }

  for (const channel of channels) {
    await messageQueue.add(
      "send-message",
      { debtId: data.debtId, channel },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
      },
    );
  }

  return { queued: channels.length };
}
```

- [ ] **Step 2: Create message.routes.ts**

Create `src/modules/message/message.routes.ts`:

```ts
import { getAuth } from "@clerk/fastify";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";

import { enqueueMessages, listMessages } from "./message.service.js";

const MessageChannelSchema = z.enum(["SMS", "WHATSAPP", "EMAIL", "CALL"]);

export async function messageRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().route({
    method: "POST",
    url: "/messages/send",
    schema: {
      description: "Enqueue message jobs for a debt",
      tags: ["messages"],
      body: z.object({
        debtId: z.string(),
        channels: z.array(MessageChannelSchema).optional(),
      }),
      response: {
        200: z.object({ queued: z.number() }),
        400: z.object({ error: z.string() }),
        401: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const { isAuthenticated } = getAuth(request);
      if (!isAuthenticated) {
        return reply.code(401).send({ error: "User not authenticated" });
      }

      try {
        const result = await enqueueMessages(request.body);
        return reply.code(200).send(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to enqueue messages";
        return reply.code(400).send({ error: message });
      }
    },
  });

  app.withTypeProvider<ZodTypeProvider>().route({
    method: "GET",
    url: "/messages/:debtId",
    schema: {
      description: "List messages for a debt",
      tags: ["messages"],
      params: z.object({ debtId: z.string() }),
      response: {
        200: z.array(
          z.object({
            id: z.string(),
            channel: MessageChannelSchema,
            status: z.string(),
            content: z.string().nullable(),
            sentAt: z.coerce.date().nullable(),
            createdAt: z.coerce.date(),
            debtId: z.string(),
          }),
        ),
        401: z.object({ error: z.string() }),
      },
    },
    handler: async (request, reply) => {
      const { isAuthenticated } = getAuth(request);
      if (!isAuthenticated) {
        return reply.code(401).send({ error: "User not authenticated" });
      }

      const messages = await listMessages(request.params.debtId);
      return reply.code(200).send(messages);
    },
  });
}
```

- [ ] **Step 3: Register messageRoutes in routes.ts**

Replace the content of `src/routes.ts`:

```ts
import { authRoutes } from "./modules/auth/auth.routes.js";
import { clientRoutes } from "./modules/client/client.routes.js";
import { debtRoutes } from "./modules/debt/debt.routes.js";
import { messageRoutes } from "./modules/message/message.routes.js";
import type { FastifyTypedInstance } from "./types/index.js";

export async function routes(app: FastifyTypedInstance) {
  app.register(clientRoutes, { prefix: "/api" });
  app.register(debtRoutes, { prefix: "/api" });
  app.register(authRoutes, { prefix: "/api" });
  app.register(messageRoutes, { prefix: "/api" });
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/message/message.service.ts src/modules/message/message.routes.ts src/routes.ts
git commit -m "feat: add POST /messages/send route with BullMQ enqueue logic"
```

---

## Task 9: Wire up worker and scheduler in src/index.ts

**Files:**
- Modify: `src/index.ts`

- [ ] **Step 1: Remove the old /send-message test route and wire up worker + scheduler**

In `src/index.ts`:

1. Remove these lines (the test route from lines 16 and 54-76):
   ```ts
   import { sendMessage } from "./modules/message/message.service.js";
   ```
   and the entire `app.withTypeProvider<ZodTypeProvider>().route({ method: "GET", url: "/send-message", ... })` block.

2. Add these imports at the top of the file (after existing imports):
   ```ts
   import { messageWorker } from "./jobs/workers/message.worker.js";
   import { startDebtReminderScheduler } from "./jobs/scheduler/debt-reminder.scheduler.js";
   ```

3. Before the `app.listen(...)` call, add:
   ```ts
   startDebtReminderScheduler();
   ```

4. After the `app.listen(...)` block, add graceful shutdown:
   ```ts
   process.on("SIGTERM", async () => {
     await messageWorker.close();
     await app.close();
     process.exit(0);
   });

   process.on("SIGINT", async () => {
     await messageWorker.close();
     await app.close();
     process.exit(0);
   });
   ```

The final `src/index.ts` should look like:

```ts
import "dotenv/config";

import { clerkClient, clerkPlugin, getAuth } from "@clerk/fastify";
import cors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUI from "@fastify/swagger-ui";
import Fastify from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import z from "zod";

import { messageWorker } from "./jobs/workers/message.worker.js";
import { startDebtReminderScheduler } from "./jobs/scheduler/debt-reminder.scheduler.js";
import { routes } from "./routes.js";
import { type UserDTO, UserSchema } from "./types/users.js";

const app = Fastify({
  logger: true,
});

await app.register(cors, {
  origin: "*",
});

await app.register(clerkPlugin);

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: "smartNotasAPI",
      description: "Simple API for training backend skills",
      version: "1.0.0",
    },
    servers: [
      {
        description: "Localhost",
        url: "http://localhost:3333",
      },
    ],
  },
  transform: jsonSchemaTransform,
});

await app.register(fastifySwaggerUI, {
  routePrefix: "/docs",
});

app.register(routes);

app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/protected",
  schema: {
    description: "protected Route",
    tags: ["protected"],
    response: {
      200: z.object({
        message: z.string(),
        user: UserSchema,
      }),
      401: z.object({
        error: z.string(),
      }),
      500: z.object({
        error: z.string(),
      }),
    },
  },
  handler: async (request, reply) => {
    try {
      const { isAuthenticated, userId } = getAuth(request);

      if (!isAuthenticated)
        return reply.code(401).send({ error: "User not authenticated" });

      const { id, fullName, emailAddresses, username, imageUrl, createdAt } =
        await clerkClient.users.getUser(userId);

      const formatedUser: UserDTO = {
        id,
        email: emailAddresses[0]?.emailAddress ?? null,
        fullName,
        username,
        imageUrl,
        createdAt,
      };

      return reply.code(200).send({
        message: "User retrieved successfully",
        user: formatedUser,
      });
    } catch (error) {
      app.log.error(error);
      return reply.code(500).send({ error: "Failed to retrieve user" });
    }
  },
});

startDebtReminderScheduler();

try {
  await app.listen({ port: Number(process.env.PORT) || 3333 });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

process.on("SIGTERM", async () => {
  await messageWorker.close();
  await app.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  await messageWorker.close();
  await app.close();
  process.exit(0);
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm exec tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Start Docker and the dev server to verify startup**

```bash
docker-compose up -d
pnpm dev
```

Expected console output:
- `[scheduler] Debt reminder scheduler started — runs daily at 08:30`
- Fastify listening on port 3333
- No import errors or crashes

- [ ] **Step 4: Commit**

```bash
git add src/index.ts
git commit -m "feat: wire up message worker and debt reminder scheduler in main entry point"
```

---

## Task 10: Update .env.example

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Add new environment variables**

Append to `.env.example`:

```
# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=          # E.164 format, e.g. +15551234567 (SMS and Call sender)
TWILIO_WHATSAPP_NUMBER=       # e.g. whatsapp:+14155238886 (Twilio Sandbox or approved number)

# SendGrid (Email channel)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=          # Must be a verified sender in your SendGrid account

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add new env vars for Twilio channels, SendGrid, and Redis"
```

---

## Task 11: Manual smoke test

Verify the full flow end-to-end before declaring done.

- [ ] **Step 1: Ensure Docker is running**

```bash
docker-compose up -d
```

- [ ] **Step 2: Start the server**

```bash
pnpm dev
```

- [ ] **Step 3: Create a test debt with channels via API**

Use Swagger UI at `http://localhost:3333/docs` or curl:

```bash
curl -X POST http://localhost:3333/api/debts \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-clerk-token>" \
  -d '{
    "amount": 150.00,
    "dueDate": "<tomorrow ISO date>",
    "clientId": "<existing-client-id>",
    "channels": ["SMS", "WHATSAPP"]
  }'
```

Expected: 201 response with the created debt including `channels`.

- [ ] **Step 4: Manually trigger message send**

```bash
curl -X POST http://localhost:3333/api/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-clerk-token>" \
  -d '{
    "debtId": "<debt-id-from-step-3>"
  }'
```

Expected: `{ "queued": 2 }` (one job per channel).

- [ ] **Step 5: Verify MessageLog entries in DB**

```bash
pnpm prisma studio
```

Check `MessageLog` table — should see entries for each channel with a valid status.

- [ ] **Step 6: Final commit if any cleanup needed**

```bash
git add -A
git commit -m "feat: complete BullMQ + Twilio debt reminder system implementation"
```
