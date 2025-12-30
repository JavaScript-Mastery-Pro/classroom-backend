import { z } from "zod";

type ValidationErrorPayload = {
  error: string;
  details: unknown;
};

export class RequestValidationError extends Error {
  status: number;
  payload: ValidationErrorPayload;

  constructor(details: unknown) {
    super("Invalid request");
    this.name = "RequestValidationError";
    this.status = 400;
    this.payload = {
      error: "Invalid request",
      details,
    };
  }
}

export const parseRequest = <TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  input: unknown
): z.infer<TSchema> => {
  const parsed = schema.safeParse(input);

  if (!parsed.success) {
    throw new RequestValidationError(parsed.error.flatten());
  }

  return parsed.data;
};
