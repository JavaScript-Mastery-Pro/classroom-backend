import { z } from "zod";

export const subjectIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const subjectListQuerySchema = z
  .object({
    search: z.string().trim().min(1).optional(),
    department: z.string().trim().min(1).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const subjectCreateSchema = z
  .object({
    departmentId: z.coerce.number().int().positive(),
    name: z.string().trim().min(1),
    code: z.string().trim().min(1),
    description: z.string().trim().optional().nullable(),
  })
  .strict();

export const subjectUpdateSchema = z
  .object({
    departmentId: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(1).optional(),
    code: z.string().trim().min(1).optional(),
    description: z.string().trim().optional().nullable(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  });
