import "dotenv/config";

import {
  DebtStatus,
  MessageChannel,
  MessageStatus,
} from "../generated/prisma/enums";
import { prisma } from "../src/shared/plugins/prisma";

async function main() {
  const clerkUserId = process.env.SEED_USER_ID;
  if (!clerkUserId) {
    throw new Error(
      "SEED_USER_ID env var is required (use your Clerk user ID)",
    );
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  // Upsert user
  const user = await prisma.user.upsert({
    where: { id: clerkUserId },
    update: {},
    create: {
      id: clerkUserId,
      email: "seed@example.com",
      fullName: "Seed User",
    },
  });

  console.log(`User: ${user.id}`);

  // Create clients with debts
  const client1 = await prisma.client.create({
    data: {
      name: "João Silva",
      phone: "+5511999990001",
      email: "joao.silva@example.com",
      userId: user.id,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: "Maria Souza",
      phone: "+5511999990002",
      email: "maria.souza@example.com",
      userId: user.id,
    },
  });

  // Debt due tomorrow (required)
  const debtTomorrow = await prisma.debt.create({
    data: {
      amount: 350.0,
      dueDate: tomorrow,
      status: DebtStatus.PENDING,
      channels: [MessageChannel.WHATSAPP, MessageChannel.SMS],
      clientId: client1.id,
    },
  });

  console.log(
    `Debt due tomorrow: ${debtTomorrow.id} (R$ ${debtTomorrow.amount})`,
  );

  // Overdue debt
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 10);

  const debtOverdue = await prisma.debt.create({
    data: {
      amount: 1200.5,
      dueDate: pastDate,
      status: DebtStatus.OVERDUE,
      channels: [MessageChannel.EMAIL],
      clientId: client2.id,
      messages: {
        create: {
          channel: MessageChannel.EMAIL,
          status: MessageStatus.DELIVERED,
          content: "Lembrete: seu débito está em atraso.",
          sentAt: new Date(pastDate.getTime() + 60 * 60 * 1000),
        },
      },
    },
  });

  console.log(`Overdue debt: ${debtOverdue.id} (R$ ${debtOverdue.amount})`);

  // Paid debt
  const paidDate = new Date();
  paidDate.setDate(paidDate.getDate() - 5);

  const debtPaid = await prisma.debt.create({
    data: {
      amount: 500.0,
      dueDate: paidDate,
      status: DebtStatus.PAID,
      channels: [MessageChannel.WHATSAPP],
      clientId: client1.id,
    },
  });

  console.log(`Paid debt: ${debtPaid.id} (R$ ${debtPaid.amount})`);

  console.log("\nSeed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
