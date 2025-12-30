import { eq } from "drizzle-orm";

import { db } from "../db";
import { user } from "../db/schema/auth";

export const getUserById = async (userId: string) => {
  const userRows = await db.select().from(user).where(eq(user.id, userId));

  return userRows[0];
};

export const getUserByEmail = async (email: string) => {
  const userRows = await db.select().from(user).where(eq(user.email, email));

  return userRows[0];
};
