import "dotenv/config";

import { Redis } from "ioredis";

export function redisConnection() {
  return new Redis({
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null, // required by BullMQ Worker
  });
}
