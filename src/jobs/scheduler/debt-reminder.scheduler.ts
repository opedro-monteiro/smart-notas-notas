import cron from "node-cron";

import { findDebtsDueTomorrow } from "../../modules/debt/debt.repository.js";
import { messageQueue } from "../queues/message.queue.js";

export function startDebtReminderScheduler() {
  cron.schedule("05 13 * * *", async () => {
    console.log(
      "[scheduler] Running debt reminder job at",
      new Date().toISOString(),
    );

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

  console.log(
    "[scheduler] Debt reminder scheduler started — runs daily at 13:05",
  );
}
