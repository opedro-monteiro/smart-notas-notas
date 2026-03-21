import "dotenv/config";

export function redisConnection() {
  return {
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null, // required by BullMQ Worker
  };
}
