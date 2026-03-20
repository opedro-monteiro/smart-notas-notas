export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id "${id}" not found`);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor() {
    super("User not authenticated");
    this.name = "UnauthorizedError";
  }
}
