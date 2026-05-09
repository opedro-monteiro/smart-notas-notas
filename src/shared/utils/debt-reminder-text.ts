import "dayjs/locale/pt-br";

import dayjs from "dayjs";

dayjs.locale("pt-br");

export function formatDebtDueDate(dueDate: Date): string {
  return dayjs(dueDate).format("DD/MM/YYYY");
}

/** Texto falado em ligação (data por extenso em português). */
export function formatDebtDueDateSpoken(dueDate: Date): string {
  return dayjs(dueDate).format("D [de] MMMM [de] YYYY");
}

export function buildDebtReminderParagraph(
  clientName: string,
  amount: number,
  sender: string,
  dueDate: Date,
  useCompanyWording: boolean,
): string {
  const due = formatDebtDueDate(dueDate);
  const value = amount.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return useCompanyWording
    ? `Essa é uma mensagem automática da SmartNotas. Sr(a) ${clientName} possui uma dívida no valor de R$ ${value}, com a empresa ${sender}, com vencimento em ${due}. Por favor, regularize seu pagamento ou entre em contato para mais informações.`
    : `Essa é uma mensagem automática da SmartNotas. Sr(a) ${clientName} possui uma dívida no valor de R$ ${value}, com ${sender}, com vencimento em ${due}. Por favor, regularize seu pagamento ou entre em contato para mais informações.`;
}
