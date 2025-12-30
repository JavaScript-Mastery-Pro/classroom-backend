import express from "express";
import { and, desc, eq, ilike, sql } from "drizzle-orm";

import { db } from "../db";
import { user } from "../db/schema/auth";
import { getUserByEmail, getUserById } from "../controllers/users";
import { parseRequest } from "../lib/validation";
import {
  userCreateSchema,
  userIdParamSchema,
  userListQuerySchema,
  userUpdateSchema,
} from "../validation/users";

const router = express.Router();

// Get all users with optional role filter, search by name, and pagination
router.get("/", async (req, res) => {
  try {
    const {
      role,
      search,
      page = 1,
      limit = 10,
    } = parseRequest(userListQuerySchema, req.query);

    const filterConditions = [];

    const currentPage = Math.max(1, +page);
    const limitPerPage = Math.max(1, +limit);
    const offset = (currentPage - 1) * limitPerPage;

    if (role) {
      filterConditions.push(eq(user.role, role));
    }

    if (search) {
      filterConditions.push(ilike(user.name, `%${search}%`));
    }

    const whereClause =
      filterConditions.length > 0 ? and(...filterConditions) : undefined;

    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(user)
      .where(whereClause);

    const totalCount = countResult[0]?.count ?? 0;

    const usersList = await db
      .select()
      .from(user)
      .where(whereClause)
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
      message: "Users retrieved successfully",
    });
  } catch (error) {
    console.error("GET /users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get user by ID
router.get("/:id", async (req, res) => {
  try {
    const { id: userId } = parseRequest(userIdParamSchema, req.params);

    const userRecord = await getUserById(userId);

    if (!userRecord) {
      return res
        .status(404)
        .json({ error: "User not found", message: "User not found" });
    }

    res.status(200).json({
      data: userRecord,
      message: "User retrieved successfully",
    });
  } catch (error) {
    console.error("GET /users/:id error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// Create user
router.post("/", async (req, res) => {
  try {
    const payload = parseRequest(userCreateSchema, req.body);

    const existingUser = await getUserByEmail(payload.email);
    if (existingUser)
      return res.status(409).json({
        error: "Email already exists",
        message: "Email already exists",
      });

    const [createdUser] = await db.insert(user).values(payload).returning();
    if (!createdUser)
      return res.status(500).json({
        error: "Internal server error",
        message: "Failed to create user",
      });

    res.status(201).json({
      data: createdUser,
      message: "User created successfully",
    });
  } catch (error) {
    console.error("POST /users error:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Update user
router.put("/:id", async (req, res) => {
  try {
    const { id: userId } = parseRequest(userIdParamSchema, req.params);
    const { name, email, image, imageCldPubId, role } = parseRequest(
      userUpdateSchema,
      req.body
    );

    const existingUser = await getUserById(userId);
    if (!existingUser)
      return res
        .status(404)
        .json({ error: "User not found", message: "User not found" });

    if (email) {
      const existingEmail = await getUserByEmail(email);

      if (existingEmail && existingEmail.id !== userId)
        return res.status(409).json({
          error: "Email already exists",
          message: "Email already exists",
        });
    }

    const updateValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries({
      name,
      email,
      image,
      imageCldPubId,
      role,
    })) {
      if (value) {
        updateValues[key] = value;
      }
    }

    const [updatedUser] = await db
      .update(user)
      .set(updateValues)
      .where(eq(user.id, userId))
      .returning();

    if (!updatedUser)
      return res
        .status(404)
        .json({ error: "User not found", message: "User not found" });

    res.status(200).json({
      data: updatedUser,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("PUT /users/:id error:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Delete user
router.delete("/:id", async (req, res) => {
  try {
    const { id: userId } = parseRequest(userIdParamSchema, req.params);

    const [deletedUser] = await db
      .delete(user)
      .where(eq(user.id, userId))
      .returning();

    if (!deletedUser)
      return res
        .status(404)
        .json({ error: "User not found", message: "User not found" });

    res.status(200).json({
      data: deletedUser,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /users/:id error:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
