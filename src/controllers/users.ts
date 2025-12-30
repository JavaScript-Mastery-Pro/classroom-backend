import { eq } from "drizzle-orm";

import { db } from "../db";
import { user } from "../db/schema/auth";

export const getUserById = async (userId: string) => {
  const userRows = await db.select().from(user).where(eq(user.id, userId));

  return userRows[0];
};
