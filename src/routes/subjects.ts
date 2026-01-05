import express from "express";
import { eq, ilike, or, and, desc, sql, getTableColumns } from "drizzle-orm";

import { db } from "../db/index.js";
import { classes, departments, enrollments, subjects, user } from "../db/schema/index.js";

const router = express.Router();

// Get all subjects with optional search, department filter, and pagination
router.get("/", async (req, res) => {
  try {
    const { search, department, page = 1, limit = 10 } = req.query;

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const filterConditions = [];

    if (search) {
      filterConditions.push(
        or(
          ilike(subjects.name, `%${search}%`),
          ilike(subjects.code, `%${search}%`)
        )
      );
    }

    if (department) {
      filterConditions.push(ilike(departments.name, `%${department}%`));
    }

    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    // Count query MUST include the join
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    // Data query
    const subjectsList = await db
      .select({
        ...getTableColumns(subjects),
        department: {
          ...getTableColumns(departments),
        },
      })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(whereClause)
      .orderBy(desc(subjects.createdAt))
      .limit(limitPerPage)
      .offset(offset);

    res.status(200).json({
      data: subjectsList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /subjects error:", error);
    res.status(500).json({ error: "Failed to fetch subjects" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { departmentId, name, code, description } = req.body;

    const [createdSubject] = await db
      .insert(subjects)
      .values({ departmentId, name, code, description })
      .returning({ id: subjects.id });

    if (!createdSubject) throw Error;

    res.status(201).json({ data: createdSubject });
  } catch (error) {
    console.error("POST /subjects error:", error);
    res.status(500).json({ error: "Failed to create subject" });
  }
});

// Get subject details with counts
router.get("/:id", async (req, res) => {
  try {
    const subjectId = Number(req.params.id);

    if (!Number.isFinite(subjectId)) {
      return res.status(400).json({ error: "Invalid subject id" });
    }

    const [subject] = await db
      .select({
        ...getTableColumns(subjects),
        department: {
          ...getTableColumns(departments),
        },
      })
      .from(subjects)
      .leftJoin(departments, eq(subjects.departmentId, departments.id))
      .where(eq(subjects.id, subjectId));

    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }

    const classesCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .where(eq(classes.subjectId, subjectId));

    res.status(200).json({
      data: {
        subject,
        totals: {
          classes: classesCount[0]?.count ?? 0,
        },
      },
    });
  } catch (error) {
    console.error("GET /subjects/:id error:", error);
    res.status(500).json({ error: "Failed to fetch subject details" });
  }
});

// List classes in a subject with pagination
router.get("/:id/classes", async (req, res) => {
  try {
    const subjectId = Number(req.params.id);
    const { page = 1, limit = 10 } = req.query;

    if (!Number.isFinite(subjectId)) {
      return res.status(400).json({ error: "Invalid subject id" });
    }

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(classes)
      .where(eq(classes.subjectId, subjectId));

    const totalCount = countResult[0]?.count ?? 0;

    const classesList = await db
      .select({
        ...getTableColumns(classes),
        teacher: {
          ...getTableColumns(user),
        },
      })
      .from(classes)
      .leftJoin(user, eq(classes.teacherId, user.id))
      .where(eq(classes.subjectId, subjectId))
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
    console.error("GET /subjects/:id/classes error:", error);
    res.status(500).json({ error: "Failed to fetch subject classes" });
  }
});

// List users in a subject by role with pagination
router.get("/:id/users", async (req, res) => {
  try {
    const subjectId = Number(req.params.id);
    const { role, page = 1, limit = 10 } = req.query;

    if (!Number.isFinite(subjectId)) {
      return res.status(400).json({ error: "Invalid subject id" });
    }

    if (role !== "teacher" && role !== "student") {
      return res.status(400).json({ error: "Invalid role" });
    }

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    const baseSelect = {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      imageCldPubId: user.imageCldPubId,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const groupByFields = [
      user.id,
      user.name,
      user.email,
      user.emailVerified,
      user.image,
      user.role,
      user.imageCldPubId,
      user.createdAt,
      user.updatedAt,
    ];

    const countResult =
      role === "teacher"
        ? await db
            .select({ count: sql<number>`count(distinct ${user.id})` })
            .from(user)
            .leftJoin(classes, eq(user.id, classes.teacherId))
            .where(and(eq(user.role, role), eq(classes.subjectId, subjectId)))
        : await db
            .select({ count: sql<number>`count(distinct ${user.id})` })
            .from(user)
            .leftJoin(enrollments, eq(user.id, enrollments.studentId))
            .leftJoin(classes, eq(enrollments.classId, classes.id))
            .where(and(eq(user.role, role), eq(classes.subjectId, subjectId)));

    const totalCount = countResult[0]?.count ?? 0;

    const usersList =
      role === "teacher"
        ? await db
            .select(baseSelect)
            .from(user)
            .leftJoin(classes, eq(user.id, classes.teacherId))
            .where(and(eq(user.role, role), eq(classes.subjectId, subjectId)))
            .groupBy(...groupByFields)
            .orderBy(desc(user.createdAt))
            .limit(limitPerPage)
            .offset(offset)
        : await db
            .select(baseSelect)
            .from(user)
            .leftJoin(enrollments, eq(user.id, enrollments.studentId))
            .leftJoin(classes, eq(enrollments.classId, classes.id))
            .where(and(eq(user.role, role), eq(classes.subjectId, subjectId)))
            .groupBy(...groupByFields)
            .orderBy(desc(user.createdAt))
            .limit(limitPerPage)
            .offset(offset);

    res.status(200).json({
      data: usersList,
      pagination: {
        page: currentPage,
        limit: limitPerPage,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitPerPage),
      },
    });
  } catch (error) {
    console.error("GET /subjects/:id/users error:", error);
    res.status(500).json({ error: "Failed to fetch subject users" });
  }
});

export default router;
