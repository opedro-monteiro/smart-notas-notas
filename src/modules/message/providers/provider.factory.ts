import { MessageChannel } from "../../../../generated/prisma/enums.js";

import { CallProvider } from "./call.provider.js";
import { EmailProvider } from "./email.provider.js";
import { SmsProvider } from "./sms.provider.js";
import { WhatsappProvider } from "./whatsapp.provider.js";
import type { IMessageProvider } from "./message-provider.interface.js";

const providerMap: Record<MessageChannel, IMessageProvider> = {
  [MessageChannel.SMS]: new SmsProvider(),
  [MessageChannel.WHATSAPP]: new WhatsappProvider(),
  [MessageChannel.EMAIL]: new EmailProvider(),
  [MessageChannel.CALL]: new CallProvider(),
};

export function getProvider(channel: MessageChannel): IMessageProvider {
  return providerMap[channel];
}
