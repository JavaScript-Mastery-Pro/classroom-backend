import { eq, getTableColumns } from "drizzle-orm";

import { db } from "../db";
import { classes, departments, enrollments, subjects } from "../db/schema";
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

export const getEnrollmentDetailsById = async (enrollmentId: number) => {
  const enrollmentRows = await db
    .select({
      ...getTableColumns(enrollments),
      class: {
        ...getTableColumns(classes),
      },
      subject: {
        ...getTableColumns(subjects),
      },
      department: {
        ...getTableColumns(departments),
      },
      teacher: {
        ...getTableColumns(user),
      },
    })
    .from(enrollments)
    .leftJoin(classes, eq(enrollments.classId, classes.id))
    .leftJoin(subjects, eq(classes.subjectId, subjects.id))
    .leftJoin(departments, eq(subjects.departmentId, departments.id))
    .leftJoin(user, eq(classes.teacherId, user.id))
    .where(eq(enrollments.id, enrollmentId));

  return enrollmentRows[0];
};
