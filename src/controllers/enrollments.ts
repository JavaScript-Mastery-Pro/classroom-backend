import { eq, getTableColumns } from "drizzle-orm";

import { db } from "../db";
import { classes, enrollments } from "../db/schema";
import { user } from "../db/schema/auth";

export const getEnrollmentById = async (enrollmentId: number) => {
  const enrollmentRows = await db
    .select({
      ...getTableColumns(enrollments),
      class: {
        ...getTableColumns(classes),
      },
      student: {
        ...getTableColumns(user),
      },
    })
    .from(enrollments)
    .leftJoin(classes, eq(enrollments.classId, classes.id))
    .leftJoin(user, eq(enrollments.studentId, user.id))
    .where(eq(enrollments.id, enrollmentId));

  return enrollmentRows[0];
};
