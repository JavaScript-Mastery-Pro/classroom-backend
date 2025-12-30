import { z } from "zod";

export const enrollmentIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const enrollmentListQuerySchema = z
  .object({
    classId: z.coerce.number().int().positive().optional(),
    studentId: z.string().trim().min(1).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const enrollmentCreateSchema = z
  .object({
    classId: z.coerce.number().int().positive(),
  })
  .strict();

export const enrollmentJoinSchema = z
  .object({
    inviteCode: z.string().trim().min(1),
  })
  .strict();

export const enrollmentUpdateSchema = z
  .object({
    classId: z.coerce.number().int().positive().optional(),
    studentId: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  });
