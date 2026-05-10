export class PlanLimitError extends Error {
  readonly statusCode = 402;
  readonly resource: string;

  constructor(resource: string) {
    super(`Limite do plano atingido para: ${resource}`);
    this.name = "PlanLimitError";
    this.resource = resource;
  }
}

export class NoActiveSubscriptionError extends Error {
  readonly statusCode = 402;

  constructor() {
    super("Assinatura inativa ou trial expirado");
    this.name = "NoActiveSubscriptionError";
  }
}
