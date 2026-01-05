import express from "express";
import { and, desc, eq, getTableColumns, ilike, or, sql } from "drizzle-orm";

import { db } from "../db";
import { classes, departments, enrollments, subjects, user } from "../db/schema";
import {
  getDepartmentByCode,
  getDepartmentById,
} from "../controllers/departments";
import { parseRequest } from "../lib/validation";
import { authenticate, authorizeRoles } from "../middleware/auth-middleware";
import {
  departmentCreateSchema,
  departmentIdParamSchema,
  departmentItemsQuerySchema,
  departmentListQuerySchema,
  departmentUpdateSchema,
  departmentUsersQuerySchema,
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
        .select({
          ...getTableColumns(departments),
          totalSubjects: sql<number>`count(${subjects.id})`,
        })
        .from(departments)
        .leftJoin(subjects, eq(departments.id, subjects.departmentId))
        .where(whereClause)
        .groupBy(departments.id)
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

// Get department details with counts
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

      const [department] = await db
        .select()
        .from(departments)
        .where(eq(departments.id, departmentId));

      if (!department) {
        return res.status(404).json({ error: "Department not found" });
      }

      const [subjectsCount, classesCount, enrolledStudentsCount] =
        await Promise.all([
          db
            .select({ count: sql<number>`count(*)` })
            .from(subjects)
            .where(eq(subjects.departmentId, departmentId)),
          db
            .select({ count: sql<number>`count(${classes.id})` })
            .from(classes)
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .where(eq(subjects.departmentId, departmentId)),
          db
            .select({ count: sql<number>`count(distinct ${user.id})` })
            .from(user)
            .leftJoin(enrollments, eq(user.id, enrollments.studentId))
            .leftJoin(classes, eq(enrollments.classId, classes.id))
            .leftJoin(subjects, eq(classes.subjectId, subjects.id))
            .where(
              and(
                eq(user.role, "student"),
                eq(subjects.departmentId, departmentId)
              )
            ),
        ]);

      res.status(200).json({
        data: {
          department,
          totals: {
            subjects: subjectsCount[0]?.count ?? 0,
            classes: classesCount[0]?.count ?? 0,
            enrolledStudents: enrolledStudentsCount[0]?.count ?? 0,
          },
        },
      });
    } catch (error) {
      console.error("GET /departments/:id error:", error);
      res.status(500).json({ error: "Failed to fetch department details" });
    }
  }
);

// List subjects in a department with pagination
router.get(
  "/:id/subjects",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  async (req, res) => {
    try {
      const { id: departmentId } = parseRequest(
        departmentIdParamSchema,
        req.params
      );
      const { page = 1, limit = 10 } = parseRequest(
        departmentItemsQuerySchema,
        req.query
      );

      const currentPage = Math.max(1, +page);
      const limitPerPage = Math.max(1, +limit);
      const offset = (currentPage - 1) * limitPerPage;

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(subjects)
        .where(eq(subjects.departmentId, departmentId));

      const totalCount = countResult[0]?.count ?? 0;

      const subjectsList = await db
        .select({
          ...getTableColumns(subjects),
        })
        .from(subjects)
        .where(eq(subjects.departmentId, departmentId))
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
      console.error("GET /departments/:id/subjects error:", error);
      res.status(500).json({ error: "Failed to fetch department subjects" });
    }
});

// List classes in a department with pagination
router.get(
  "/:id/classes",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  async (req, res) => {
    try {
      const { id: departmentId } = parseRequest(
        departmentIdParamSchema,
        req.params
      );
      const { page = 1, limit = 10 } = parseRequest(
        departmentItemsQuerySchema,
        req.query
      );

      const currentPage = Math.max(1, +page);
      const limitPerPage = Math.max(1, +limit);
      const offset = (currentPage - 1) * limitPerPage;

      const countResult = await db
        .select({ count: sql<number>`count(${classes.id})` })
        .from(classes)
        .leftJoin(subjects, eq(classes.subjectId, subjects.id))
        .where(eq(subjects.departmentId, departmentId));

      const totalCount = countResult[0]?.count ?? 0;

      const classesList = await db
        .select({
          ...getTableColumns(classes),
          subject: {
            ...getTableColumns(subjects),
          },
          teacher: {
            ...getTableColumns(user),
          },
        })
        .from(classes)
        .leftJoin(subjects, eq(classes.subjectId, subjects.id))
        .leftJoin(user, eq(classes.teacherId, user.id))
        .where(eq(subjects.departmentId, departmentId))
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
      console.error("GET /departments/:id/classes error:", error);
      res.status(500).json({ error: "Failed to fetch department classes" });
    }
});

// List users in a department by role with pagination
router.get(
  "/:id/users",
  authenticate,
  authorizeRoles("admin", "teacher", "student"),
  async (req, res) => {
    try {
      const { id: departmentId } = parseRequest(
        departmentIdParamSchema,
        req.params
      );
      const { role, page = 1, limit = 10 } = parseRequest(
        departmentUsersQuerySchema,
        req.query
      );

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
              .leftJoin(subjects, eq(classes.subjectId, subjects.id))
              .where(
                and(
                  eq(user.role, role),
                  eq(subjects.departmentId, departmentId)
                )
              )
          : await db
              .select({ count: sql<number>`count(distinct ${user.id})` })
              .from(user)
              .leftJoin(enrollments, eq(user.id, enrollments.studentId))
              .leftJoin(classes, eq(enrollments.classId, classes.id))
              .leftJoin(subjects, eq(classes.subjectId, subjects.id))
              .where(
                and(
                  eq(user.role, role),
                  eq(subjects.departmentId, departmentId)
                )
              );

      const totalCount = countResult[0]?.count ?? 0;

      const usersList =
        role === "teacher"
          ? await db
              .select(baseSelect)
              .from(user)
              .leftJoin(classes, eq(user.id, classes.teacherId))
              .leftJoin(subjects, eq(classes.subjectId, subjects.id))
              .where(
                and(
                  eq(user.role, role),
                  eq(subjects.departmentId, departmentId)
                )
              )
              .groupBy(...groupByFields)
              .orderBy(desc(user.createdAt))
              .limit(limitPerPage)
              .offset(offset)
          : await db
              .select(baseSelect)
              .from(user)
              .leftJoin(enrollments, eq(user.id, enrollments.studentId))
              .leftJoin(classes, eq(enrollments.classId, classes.id))
              .leftJoin(subjects, eq(classes.subjectId, subjects.id))
              .where(
                and(
                  eq(user.role, role),
                  eq(subjects.departmentId, departmentId)
                )
              )
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
      console.error("GET /departments/:id/users error:", error);
      res.status(500).json({ error: "Failed to fetch department users" });
    }
});

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
