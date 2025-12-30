import express from "express";
import { and, desc, eq, ne, sql } from "drizzle-orm";

import { db } from "../db";
import { classes, enrollments } from "../db/schema";
import { getClassById } from "../controllers/classes";
import { getEnrollmentById } from "../controllers/enrollments";
import { getUserById } from "../controllers/users";
import { parseRequest } from "../lib/validation";
import {
  enrollmentCreateSchema,
  enrollmentIdParamSchema,
  enrollmentJoinSchema,
  enrollmentListQuerySchema,
  enrollmentUpdateSchema,
} from "../validation/enrollments";

const router = express.Router();

// Get all enrollments with optional filters and pagination
router.get("/", async (req, res) => {
  try {
    const {
      classId,
      studentId,
      page = 1,
      limit = 10,
    } = parseRequest(enrollmentListQuerySchema, req.query);

    const filterConditions = [];

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    if (classId) {
      filterConditions.push(eq(enrollments.classId, classId));
    }

    if (studentId) {
      filterConditions.push(eq(enrollments.studentId, studentId));
    }

    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    const enrollmentList = await db
      .select()
      .from(enrollments)
      .where(whereClause)
      .orderBy(desc(enrollments.enrolledAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: enrollmentList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /enrollments error:", error);
    res.status(500).json({ error: "Failed to fetch enrollments" });
  }
});

// Get enrollment by ID
router.get("/:id", async (req, res) => {
  try {
    const { id: enrollmentId } = parseRequest(
      enrollmentIdParamSchema,
      req.params
    );

    const enrollment = await getEnrollmentById(enrollmentId);

    if (!enrollment)
      return res.status(404).json({ error: "Enrollment not found" });

    res.status(200).json({ data: enrollment });
  } catch (error) {
    console.error("GET /enrollments/:id error:", error);
    res.status(500).json({ error: "Failed to fetch enrollment" });
  }
});

// Create enrollment
router.post("/", async (req, res) => {
  try {
    const { classId, studentId } = parseRequest(
      enrollmentCreateSchema,
      req.body
    );

    const classRecord = await getClassById(classId);
    if (!classRecord) return res.status(404).json({ error: "Class not found" });

    const student = await getUserById(studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const [existingEnrollment] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.classId, classId),
          eq(enrollments.studentId, studentId)
        )
      );

    if (existingEnrollment)
      return res
        .status(409)
        .json({ error: "Student already enrolled in class" });

    const [createdEnrollment] = await db
      .insert(enrollments)
      .values({ classId, studentId })
      .returning({ id: enrollments.id });

    if (!createdEnrollment)
      return res.status(500).json({ error: "Failed to create enrollment" });

    const enrollment = await getEnrollmentById(createdEnrollment.id);

    res.status(201).json({ data: enrollment });
  } catch (error) {
    console.error("POST /enrollments error:", error);
    res.status(500).json({ error: "Failed to create enrollment" });
  }
});

// Join class by invite code
router.post("/join", async (req, res) => {
  try {
    const { inviteCode, studentId } = parseRequest(
      enrollmentJoinSchema,
      req.body
    );

    const [classRecord] = await db
      .select()
      .from(classes)
      .where(eq(classes.inviteCode, inviteCode));

    if (!classRecord) return res.status(404).json({ error: "Class not found" });

    const student = await getUserById(studentId);
    if (!student) return res.status(404).json({ error: "Student not found" });

    const [existingEnrollment] = await db
      .select({ id: enrollments.id })
      .from(enrollments)
      .where(
        and(
          eq(enrollments.classId, classRecord.id),
          eq(enrollments.studentId, studentId)
        )
      );

    if (existingEnrollment)
      return res
        .status(409)
        .json({ error: "Student already enrolled in class" });

    const [createdEnrollment] = await db
      .insert(enrollments)
      .values({ classId: classRecord.id, studentId })
      .returning({ id: enrollments.id });

    if (!createdEnrollment)
      return res.status(500).json({ error: "Failed to create enrollment" });

    const enrollment = await getEnrollmentById(createdEnrollment.id);

    res.status(201).json({ data: enrollment });
  } catch (error) {
    console.error("POST /enrollments/join error:", error);
    res.status(500).json({ error: "Failed to join class" });
  }
});

// Update enrollment
router.put("/:id", async (req, res) => {
  try {
    const { id: enrollmentId } = parseRequest(
      enrollmentIdParamSchema,
      req.params
    );

    const { classId, studentId } = parseRequest(
      enrollmentUpdateSchema,
      req.body
    );

    const existingEnrollment = await getEnrollmentById(enrollmentId);
    if (!existingEnrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    if (classId) {
      const classRecord = await getClassById(classId);
      if (!classRecord)
        return res.status(404).json({ error: "Class not found" });
    }

    if (studentId) {
      const student = await getUserById(studentId);
      if (!student) return res.status(404).json({ error: "Student not found" });
    }

    if (classId || studentId) {
      const classIdToCheck = classId ?? existingEnrollment.classId;
      const studentIdToCheck = studentId ?? existingEnrollment.studentId;

      const [existingEnrollmentPair] = await db
        .select({ id: enrollments.id })
        .from(enrollments)
        .where(
          and(
            eq(enrollments.classId, classIdToCheck),
            eq(enrollments.studentId, studentIdToCheck),
            ne(enrollments.id, enrollmentId)
          )
        );

      if (existingEnrollmentPair)
        return res
          .status(409)
          .json({ error: "Student already enrolled in class" });
    }

    const updateValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries({
      classId,
      studentId,
    })) {
      if (value) updateValues[key] = value;
    }

    await db
      .update(enrollments)
      .set(updateValues)
      .where(eq(enrollments.id, enrollmentId));

    const enrollment = await getEnrollmentById(enrollmentId);

    res.status(200).json({ data: enrollment });
  } catch (error) {
    console.error("PUT /enrollments/:id error:", error);
    res.status(500).json({ error: "Failed to update enrollment" });
  }
});

// Delete enrollment
router.delete("/:id", async (req, res) => {
  try {
    const { id: enrollmentId } = parseRequest(
      enrollmentIdParamSchema,
      req.params
    );

    const deletedRows = await db
      .delete(enrollments)
      .where(eq(enrollments.id, enrollmentId))
      .returning({ id: enrollments.id });

    if (deletedRows.length === 0)
      return res.status(404).json({ error: "Enrollment not found" });

    res.status(200).json({ message: "Enrollment deleted" });
  } catch (error) {
    console.error("DELETE /enrollments/:id error:", error);
    res.status(500).json({ error: "Failed to delete enrollment" });
  }
});

export default router;
