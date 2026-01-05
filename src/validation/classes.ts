import { z } from "zod";

import { classStatusEnum } from "../db/schema";

const scheduleSchema = z
  .object({
    day: z.string().trim().min(1),
    startTime: z.string().trim().min(1),
    endTime: z.string().trim().min(1),
  })
  .strict();

export const classIdParamSchema = z
  .object({
    id: z.coerce.number().int().positive(),
  })
  .strict();

export const classInviteParamSchema = z
  .object({
    code: z.string().trim().min(1),
  })
  .strict();

export const classListQuerySchema = z
  .object({
    search: z.string().trim().min(1).optional(),
    subjectId: z.coerce.number().int().positive().optional(),
    teacherId: z.string().trim().min(1).optional(),
    status: z.enum(classStatusEnum.enumValues).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const classCreateSchema = z
  .object({
    name: z.string().trim().min(1),
    subjectId: z.coerce.number().int().positive(),
    teacherId: z.string().trim().min(1),
    description: z.string().trim().optional().nullable(),
    bannerUrl: z.string().trim().optional().nullable(),
    bannerCldPubId: z.string().trim().optional().nullable(),
    capacity: z.coerce.number().int().min(1).optional(),
    status: z.enum(classStatusEnum.enumValues).optional(),
  })
  .strict();

export const classUsersQuerySchema = z
  .object({
    role: z.enum(["teacher", "student"] as const),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();

export const classUpdateSchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    inviteCode: z.string().trim().min(1).optional(),
    subjectId: z.coerce.number().int().positive().optional(),
    teacherId: z.string().trim().min(1).optional(),
    description: z.string().trim().optional().nullable(),
    bannerUrl: z.string().trim().optional().nullable(),
    bannerCldPubId: z.string().trim().optional().nullable(),
    capacity: z.coerce.number().int().min(1).optional(),
    status: z.enum(classStatusEnum.enumValues).optional(),
    schedules: z.array(scheduleSchema).optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "At least one field must be provided",
  });
