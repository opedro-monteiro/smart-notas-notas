import { Queue } from "bullmq";

import { redisConnection } from "../../shared/plugins/redis.js";

export const messageQueue = new Queue("message-queue", {
  connection: redisConnection(),
});
