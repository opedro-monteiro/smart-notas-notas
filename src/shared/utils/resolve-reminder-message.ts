/**
 * Resolves reminder copy for a debt + client.
 *
 * Future precedence (not implemented):
 * 1. client.reminderTemplateId → body from MessageTemplate library
 * 2. client.reminderMessageTemplate (inline)
 * 3. System default (buildDebtReminderParagraph / call-specific default script)
 */

import type {
  ClientModel,
  DebtModel,
  UserModel,
} from "../../../generated/prisma/models.js";

export type DebtReminderContext = DebtModel & {
  client: ClientModel & { user: UserModel };
};
import {
  buildDebtReminderParagraph,
  formatDebtDueDate,
  formatDebtDueDateSpoken,
} from "./debt-reminder-text.js";

/** Supported placeholders: {{clientName}}, {{amount}}, {{dueDate}}, {{dueDateSpoken}}, {{sender}}, {{companyName}} */
export const REMINDER_PLACEHOLDER_KEYS = [
  "clientName",
  "amount",
  "dueDate",
  "dueDateSpoken",
  "sender",
  "companyName",
] as const;

export const MAX_REMINDER_MESSAGE_TEMPLATE_LENGTH = 1600;

function buildPlaceholderMap(debt: DebtReminderContext): Record<string, string> {
  const u = debt.client.user;
  const sender = u.companyName ?? u.fullName ?? "SmartNotas";
  const amount = debt.amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return {
    clientName: debt.client.name,
    amount,
    dueDate: formatDebtDueDate(debt.dueDate),
    dueDateSpoken: formatDebtDueDateSpoken(debt.dueDate),
    sender,
    companyName: u.companyName ?? "",
  };
}

/** Unknown {{keys}} are left unchanged so the author can spot typos. */
export function interpolateReminderTemplate(
  template: string,
  debt: DebtReminderContext,
): string {
  const map = buildPlaceholderMap(debt);
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = map[key];
    return value !== undefined ? value : match;
  });
}

/** SMS, WhatsApp, e-mail: custom template or system default paragraph. */
export function resolveTextChannelBody(debt: DebtReminderContext): string {
  const template = debt.client.reminderMessageTemplate?.trim();
  if (!template) {
    const u = debt.client.user;
    const sender = u.companyName ?? u.fullName ?? "SmartNotas";
    return buildDebtReminderParagraph(
      debt.client.name,
      debt.amount,
      sender,
      debt.dueDate,
      Boolean(u.companyName),
    );
  }
  return interpolateReminderTemplate(template, debt);
}

/**
 * Text spoken in Twilio `<Say>`: custom template or the legacy default call script
 * (not identical to SMS wording — preserves previous behavior when no custom template).
 */
export function resolveCallSayInnerText(debt: DebtReminderContext): string {
  const template = debt.client.reminderMessageTemplate?.trim();
  if (!template) {
    const { companyName, fullName } = debt.client.user;
    const sender = companyName ?? fullName ?? "SmartNotas";
    const senderText = companyName
      ? `com a empresa ${sender}`
      : `com ${sender}`;
    const value = debt.amount.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const dueSpoken = formatDebtDueDateSpoken(debt.dueDate);
    return `Olá ${debt.client.name}. Você possui uma dívida de ${value} reais, ${senderText}, com vencimento em ${dueSpoken}. Por favor, regularize seu pagamento ou entre em contato para mais informações.`;
  }
  return interpolateReminderTemplate(template, debt).replaceAll(/\s+/g, " ").trim();
}

/** Escape text embedded inside TwiML `<Say>` content. */
export function escapeXmlForTwiml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
