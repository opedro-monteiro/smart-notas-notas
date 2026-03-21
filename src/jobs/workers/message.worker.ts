import { Worker } from "bullmq";

import { type MessageChannel,MessageStatus } from "../../../generated/prisma/enums.js";
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
  },
);

messageWorker.on("failed", async (job, err) => {
  console.error("[worker] Job failed:", err);
  if (job?.name === "send-message") {
    const { debtId, channel } = job.data as { debtId: string; channel: MessageChannel };
    try {
      await createMessageLog({
        debtId,
        channel,
        status: MessageStatus.FAILED,
        sentAt: new Date(),
      });
    } catch (logErr) {
      console.error("[worker] Failed to write FAILED log entry:", logErr);
    }
  }
});
