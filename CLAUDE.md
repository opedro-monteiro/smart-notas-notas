# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm dev              # Run with hot reload (tsx --watch)

# Linting
pnpm eslint .         # Lint
pnpm prettier --write .  # Format

# Database
pnpm prisma migrate dev    # Run migrations
pnpm prisma generate       # Regenerate Prisma client (outputs to generated/prisma/)
pnpm prisma studio         # Open Prisma Studio

# Infrastructure
docker-compose up -d  # Start PostgreSQL (port 5432)
```

## Architecture

This is a **Fastify 5 REST API** (Node 22, ESM, TypeScript) for the Smart Notas platform — a debt/client management system with messaging logs.

**Request flow:**
1. `src/index.ts` — single entry point; registers all plugins and routes inline
2. Clerk (`@clerk/fastify`) handles authentication — use `getAuth(request)` to get `userId`, then `clerkClient.users.getUser(userId)` to fetch user data
3. Routes use `app.withTypeProvider<ZodTypeProvider>().route(...)` with Zod schemas for validation and serialization
4. Prisma client is generated to `generated/prisma/` (not the default location) — import from there

**Data model** (PostgreSQL via Prisma):
- `User` — Clerk-managed identity (id from Clerk, not auto-generated)
- `Client` — belongs to User; represents debtors
- `Debt` — belongs to Client; has `DebtStatus` (PENDING/PAID/OVERDUE) and due date
- `MessageLog` — belongs to Debt; tracks notifications via SMS/WHATSAPP/EMAIL/CALL with `MessageStatus`

**Environment variables** (see `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — from Clerk dashboard
- `PORT` — defaults to 3333

**Swagger UI** is available at `/docs` in development.

**Prisma config** uses a custom `prisma.config.ts` — the generated client is at `generated/prisma/`, not `node_modules/@prisma/client`.
