// message.worker.ts
import { Worker } from "bullmq";

import { MessageService } from "@/modules/message/message.service";
import { TwilioProvider } from "@/modules/message/twilio.provider";
import { redisConnection } from "@/shared/plugins/redis";

const worker = new Worker(
  "message-queue",
  async (job) => {
    const service = new MessageService(new TwilioProvider());

    if (job.name === "send-message") {
      await service.sendDebtReminder(job.data.debtId);
    }
  },
  {
    connection: redisConnection,
  },
);
