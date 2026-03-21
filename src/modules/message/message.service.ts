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
