import express from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "../db";
import { classes } from "../db/schema";
import { getClassById, getClassByInviteCode } from "../controllers/classes";
import { getSubjectById } from "../controllers/subjects";
import { getUserById } from "../controllers/users";
import { parseRequest } from "../lib/validation";
import { authenticate, authorizeRoles } from "../middleware/auth-middleware";
import {
  classCreateSchema,
  classIdParamSchema,
  classInviteParamSchema,
  classListQuerySchema,
  classUpdateSchema,
} from "../validation/classes";

const router = express.Router();

// Get all classes with optional filters and pagination
router.get(
  "/",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  async (req, res) => {
  try {
    const {
      search,
      subjectId,
      teacherId,
      status,
      page = 1,
      limit = 10,
    } = parseRequest(classListQuerySchema, req.query);

    const filterConditions = [];

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    if (search) {
      filterConditions.push(
        or(
          ilike(classes.name, `%${search}%`),
          ilike(classes.inviteCode, `%${search}%`)
        )
      );
    }

    if (subjectId) {
      filterConditions.push(eq(classes.subjectId, subjectId));
    }

    if (teacherId) {
      filterConditions.push(eq(classes.teacherId, teacherId));
    }

    if (status) {
      filterConditions.push(eq(classes.status, status));
    }

    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    const classesList = await db
      .select()
      .from(classes)
      .where(whereClause)
      .orderBy(desc(classes.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: classesList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /classes error:", error);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

// Get class by invite code
router.get(
  "/invite/:code",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  async (req, res) => {
  try {
    const { code } = parseRequest(classInviteParamSchema, req.params);

    const classRecord = await getClassByInviteCode(code);

    if (!classRecord) return res.status(404).json({ error: "Class not found" });

    res.status(200).json({ data: classRecord });
  } catch (error) {
    console.error("GET /classes/invite/:code error:", error);
    res.status(500).json({ error: "Failed to fetch class" });
  }
});

// Get class by ID
router.get(
  "/:id",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  async (req, res) => {
  try {
    const { id: classId } = parseRequest(classIdParamSchema, req.params);

    const classRecord = await getClassById(classId);

    if (!classRecord) {
      return res.status(404).json({ error: "Class not found" });
    }

    res.status(200).json({ data: classRecord });
  } catch (error) {
    console.error("GET /classes/:id error:", error);
    res.status(500).json({ error: "Failed to fetch class" });
  }
});

// Create class
router.post(
  "/",
  authenticate,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
  try {
    const {
      subjectId,
      inviteCode,
      name,
      teacherId,
      bannerCldPubId,
      bannerUrl,
      capacity,
      description,
      schedules,
      status,
    } = parseRequest(classCreateSchema, req.body);

    const subject = await getSubjectById(subjectId);
    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const teacher = await getUserById(teacherId);
    if (!teacher) return res.status(404).json({ error: "Teacher not found" });

    const existingInvite = await getClassByInviteCode(inviteCode);
    if (existingInvite)
      return res.status(409).json({ error: "Invite code already exists" });

    const [createdClass] = await db
      .insert(classes)
      .values({
        subjectId,
        inviteCode,
        name,
        teacherId,
        bannerCldPubId,
        bannerUrl,
        capacity,
        description,
        schedules,
        status,
      })
      .returning({ id: classes.id });

    if (!createdClass)
      return res.status(500).json({ error: "Failed to create class" });

    const classRecord = await getClassById(createdClass.id);

    res.status(201).json({ data: classRecord });
  } catch (error) {
    console.error("POST /classes error:", error);
    res.status(500).json({ error: "Failed to create class" });
  }
});

// Update class
router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
  try {
    const { id: classId } = parseRequest(classIdParamSchema, req.params);
    const {
      subjectId,
      inviteCode,
      bannerCldPubId,
      bannerUrl,
      capacity,
      description,
      name,
      schedules,
      status,
    } = parseRequest(classUpdateSchema, req.body);

    const existingClass = await getClassById(classId);
    if (!existingClass)
      return res.status(404).json({ error: "Class not found" });

    if (subjectId) {
      const subject = await getSubjectById(subjectId);
      if (!subject) return res.status(404).json({ error: "Subject not found" });
    }

    if (inviteCode) {
      const existingInvite = await getClassByInviteCode(inviteCode);

      if (existingInvite && existingInvite.id !== classId)
        return res.status(409).json({ error: "Invite code already exists" });
    }

    const updateValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries({
      subjectId,
      inviteCode,
      bannerCldPubId,
      bannerUrl,
      capacity,
      description,
      name,
      schedules,
      status,
    })) {
      if (value) updateValues[key] = value;
    }

    await db.update(classes).set(updateValues).where(eq(classes.id, classId));

    const classRecord = await getClassById(classId);

    res.status(200).json({ data: classRecord });
  } catch (error) {
    console.error("PUT /classes/:id error:", error);
    res.status(500).json({ error: "Failed to update class" });
  }
});

// Delete class
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin", "teacher"),
  async (req, res) => {
  try {
    const { id: classId } = parseRequest(classIdParamSchema, req.params);

    const deletedRows = await db
      .delete(classes)
      .where(eq(classes.id, classId))
      .returning({ id: classes.id });

    if (deletedRows.length === 0)
      return res.status(404).json({ error: "Class not found" });

    res.status(200).json({ message: "Class deleted" });
  } catch (error) {
    console.error("DELETE /classes/:id error:", error);
    res.status(500).json({ error: "Failed to delete class" });
  }
});

export default router;
