import { eq, getTableColumns } from "drizzle-orm";

import { db } from "../db";
import { departments, subjects } from "../db/schema";

export const getSubjectById = async (subjectId: number) => {
  const subjectRows = await db
    .select({
      ...getTableColumns(subjects),
      department: {
        ...getTableColumns(departments),
      },
    })
    .from(subjects)
    .leftJoin(departments, eq(subjects.departmentId, departments.id))
    .where(eq(subjects.id, subjectId));

  return subjectRows[0];
};
