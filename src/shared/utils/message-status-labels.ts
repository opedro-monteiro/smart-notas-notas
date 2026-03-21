import type { MessageInstance } from "twilio/lib/rest/api/v2010/account/message.js";

import { MessageStatus } from "../../../generated/prisma/enums.js";

type TwilioStatus = MessageInstance["status"];

export const twilioStatusMap: Record<TwilioStatus, MessageStatus> = {
  queued: MessageStatus.QUEUED,
  sending: MessageStatus.SENDING,
  sent: MessageStatus.SENT,
  delivered: MessageStatus.DELIVERED,
  read: MessageStatus.READ,
  partially_delivered: MessageStatus.PARTIALLY_DELIVERED,
  received: MessageStatus.RECEIVED,
  receiving: MessageStatus.RECEIVING,
  accepted: MessageStatus.ACCEPTED,
  scheduled: MessageStatus.SCHEDULED,
  failed: MessageStatus.FAILED,
  undelivered: MessageStatus.UNDELIVERED,
  canceled: MessageStatus.CANCELED,
};
