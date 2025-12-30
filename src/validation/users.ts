import { z } from "zod";

import { roleEnum } from "../db/schema/auth";

export const userIdParamSchema = z
  .object({
    id: z.string().trim().min(1),
  })
  .strict();

export const userListQuerySchema = z
  .object({
    role: z.enum(roleEnum.enumValues).optional(),
    search: z.string().trim().min(1).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const userCreateSchema = z
  .object({
    id: z.string().trim().min(1),
    name: z.string().trim().min(1),
    email: z.string().trim().email(),
    emailVerified: z.boolean().optional().default(false),
    image: z.string().trim().optional().nullable(),
    imageCldPubId: z.string().trim().optional().nullable(),
    role: z.enum(roleEnum.enumValues).optional().default("student"),
  })
  .strict();

export const userUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    emailVerified: z.boolean().optional(),
    image: z.string().trim().optional().nullable(),
    imageCldPubId: z.string().trim().optional().nullable(),
    role: z.enum(roleEnum.enumValues).optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  });
