import express from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";

import { db } from "../db";
import { departments } from "../db/schema";
import {
  getDepartmentByCode,
  getDepartmentById,
} from "../controllers/departments";
import { parseRequest } from "../lib/validation";
import { authenticate, authorizeRoles } from "../middleware/auth-middleware";
import {
  departmentCreateSchema,
  departmentIdParamSchema,
  departmentListQuerySchema,
  departmentUpdateSchema,
} from "../validation/departments";

const router = express.Router();

// Get all departments with optional search and pagination
router.get(
  "/",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  async (req, res) => {
    try {
      const { search, page = 1, limit = 10 } = parseRequest(
        departmentListQuerySchema,
        req.query
      );

      const filterConditions = [];

      const currentPage = Math.max(1, +page);
      const limitPerPage = Math.max(1, +limit);
      const offset = (currentPage - 1) * limitPerPage;

      if (search) {
        filterConditions.push(
          or(
            ilike(departments.name, `%${search}%`),
            ilike(departments.code, `%${search}%`)
          )
        );
      }

      const whereClause =
        filterConditions.length > 0 ? and(...filterConditions) : undefined;

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(departments)
        .where(whereClause);

      const totalCount = countResult[0]?.count ?? 0;

      const departmentList = await db
        .select()
        .from(departments)
        .where(whereClause)
        .orderBy(desc(departments.createdAt))
        .limit(limitPerPage)
        .offset(offset);

      res.status(200).json({
        data: departmentList,
        pagination: {
          page: currentPage,
          limit: limitPerPage,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitPerPage),
        },
      });
    } catch (error) {
      console.error("GET /departments error:", error);
      res.status(500).json({ error: "Failed to fetch departments" });
    }
  }
);

// Get department by ID
router.get(
  "/:id",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  async (req, res) => {
    try {
      const { id: departmentId } = parseRequest(
        departmentIdParamSchema,
        req.params
      );

      const department = await getDepartmentById(departmentId);

      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }

      res.status(200).json({ data: department });
    } catch (error) {
      console.error("GET /departments/:id error:", error);
      res.status(500).json({ error: "Failed to fetch department" });
    }
  }
);

// Create department
router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { name, code, description } = parseRequest(
        departmentCreateSchema,
        req.body
      );

      const existingDepartment = await getDepartmentByCode(code);
      if (existingDepartment) {
        return res.status(409).json({ error: "Department code already exists" });
      }

      const [createdDepartment] = await db
        .insert(departments)
        .values({
          name,
          code,
          description: description ?? null,
        })
        .returning({ id: departments.id });

      if (!createdDepartment) {
        return res.status(500).json({ error: "Failed to create department" });
      }

      const department = await getDepartmentById(createdDepartment.id);

      res.status(201).json({ data: department });
    } catch (error) {
      console.error("POST /departments error:", error);
      res.status(500).json({ error: "Failed to create department" });
    }
  }
);

// Update department
router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { id: departmentId } = parseRequest(
        departmentIdParamSchema,
        req.params
      );
      const { name, code, description } = parseRequest(
        departmentUpdateSchema,
        req.body
      );

      const existingDepartment = await getDepartmentById(departmentId);
      if (!existingDepartment) {
        return res.status(404).json({ error: "Department not found" });
      }

      if (code) {
        const existingDepartmentWithCode = await getDepartmentByCode(code);
        if (
          existingDepartmentWithCode &&
          existingDepartmentWithCode.id !== departmentId
        ) {
          return res
            .status(409)
            .json({ error: "Department code already exists" });
        }
      }

      const updateValues: Record<string, unknown> = {};
      for (const [key, value] of Object.entries({ name, code, description })) {
        if (value) updateValues[key] = value;
      }

      await db
        .update(departments)
        .set(updateValues)
        .where(eq(departments.id, departmentId));

      const department = await getDepartmentById(departmentId);

      res.status(200).json({ data: department });
    } catch (error) {
      console.error("PUT /departments/:id error:", error);
      res.status(500).json({ error: "Failed to update department" });
    }
  }
);

// Delete department
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      const { id: departmentId } = parseRequest(
        departmentIdParamSchema,
        req.params
      );

      const deletedRows = await db
        .delete(departments)
        .where(eq(departments.id, departmentId))
        .returning({ id: departments.id });

      if (deletedRows.length === 0) {
        return res.status(404).json({ error: "Department not found" });
      }

      res.status(200).json({ message: "Department deleted" });
    } catch (error) {
      console.error("DELETE /departments/:id error:", error);
      res.status(500).json({ error: "Failed to delete department" });
    }
  }
);

export default router;
