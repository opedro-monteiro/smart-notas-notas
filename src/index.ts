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

app.withTypeProvider<ZodTypeProvider>().route({
  method: "GET",
  url: "/",
  schema: {
    description: "hello word",
    tags: ["hello word"],
    response: {
      200: z.object({
        message: z.string(),
      }),
    },
  },
  handler: () => {
    return {
      message: "Pix para min",
    };
  },
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

try {
  await app.listen({ port: Number(process.env.PORT) || 3333 });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
