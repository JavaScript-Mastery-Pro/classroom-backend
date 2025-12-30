import express from "express";
import { eq, ilike, or, and, desc, sql, getTableColumns } from "drizzle-orm";

import { db } from "../db";
import { departments, subjects } from "../db/schema";
import {
  subjectCreateSchema,
  subjectIdParamSchema,
  subjectUpdateSchema,
} from "../validation/subjects";
import { getSubjectByCode, getSubjectById } from "../controllers/subjects";
import { getDepartmentById } from "../controllers/departments";
import { parseRequest } from "../lib/validation";

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

// Get a single subject by ID
router.get("/:id", async (req, res) => {
  try {
    const { id: subjectId } = parseRequest(subjectIdParamSchema, req.params);

    const subject = await getSubjectById(subjectId);

    if (!subject) {
      return res.status(404).json({ error: "Subject not found" });
    }

    res.status(200).json({ data: subject });
  } catch (error) {
    console.error("GET /subjects/:id error:", error);
    res.status(500).json({ error: "Failed to fetch subject" });
  }
});

// Create a new subject
router.post("/", async (req, res) => {
  try {
    const { departmentId, name, code, description } = parseRequest(
      subjectCreateSchema,
      req.body
    );

    const department = await getDepartmentById(departmentId);

    if (!department)
      return res.status(404).json({ error: "Department not found" });

    const existingSubject = await getSubjectByCode(code);
    if (existingSubject)
      return res.status(409).json({ error: "Subject code already exists" });

    const [createdSubject] = await db
      .insert(subjects)
      .values({
        departmentId,
        name,
        code,
        description: description ?? null,
      })
      .returning({ id: subjects.id });

    if (!createdSubject)
      return res.status(500).json({ error: "Failed to create subject" });

    const subject = await getSubjectById(createdSubject.id);

    res.status(201).json({ data: subject });
  } catch (error) {
    console.error("POST /subjects error:", error);
    res.status(500).json({ error: "Failed to create subject" });
  }
});

// Update a subject by ID
router.put("/:id", async (req, res) => {
  try {
    const { id: subjectId } = parseRequest(subjectIdParamSchema, req.params);

    const existingSubjectById = await getSubjectById(subjectId);
    if (!existingSubjectById)
      return res.status(404).json({ error: "Subject not found" });

    const { departmentId, name, code, description } = parseRequest(
      subjectUpdateSchema,
      req.body
    );

    const updateValues: Record<string, unknown> = {};

    if (departmentId) {
      const department = await getDepartmentById(departmentId);

      if (!department)
        return res.status(404).json({ error: "Department not found" });

      updateValues.departmentId = departmentId;
    }

    if (code) {
      const existingSubjectWithCode = await getSubjectByCode(code);

      if (existingSubjectWithCode && existingSubjectWithCode.id !== subjectId)
        return res.status(409).json({ error: "Subject code already exists" });

      updateValues.code = code;
    }

    for (const [key, value] of Object.entries({ name, description })) {
      if (value) updateValues[key] = value;
    }

    await db
      .update(subjects)
      .set(updateValues)
      .where(eq(subjects.id, subjectId));

    const subject = await getSubjectById(subjectId);

    res.status(200).json({ data: subject });
  } catch (error) {
    console.error("PUT /subjects/:id error:", error);
    res.status(500).json({ error: "Failed to update subject" });
  }
});

// Delete a subject by ID
router.delete("/:id", async (req, res) => {
  try {
    const { id: subjectId } = parseRequest(subjectIdParamSchema, req.params);

    const deletedRows = await db
      .delete(subjects)
      .where(eq(subjects.id, subjectId))
      .returning({ id: subjects.id });

    if (deletedRows.length === 0)
      return res.status(404).json({ error: "Subject not found" });

    res.status(200).json({ message: "Subject deleted" });
  } catch (error) {
    console.error("DELETE /subjects/:id error:", error);
    res.status(500).json({ error: "Failed to delete subject" });
  }
});

export default router;
