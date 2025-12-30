import { eq } from "drizzle-orm";

import { db } from "../db";
import { departments } from "../db/schema";

export const getDepartmentById = async (departmentId: number) => {
  const departmentRows = await db
    .select()
    .from(departments)
    .where(eq(departments.id, departmentId));

  return departmentRows[0];
};
