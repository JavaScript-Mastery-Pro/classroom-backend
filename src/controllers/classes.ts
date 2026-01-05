import { eq, getTableColumns } from "drizzle-orm";

import { db } from "../db";
import { classes, departments, subjects } from "../db/schema";
import { user } from "../db/schema/auth";

export const getClassById = async (classId: number) => {
  const classRows = await db
    .select({
      ...getTableColumns(classes),
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
    .from(classes)
    .leftJoin(subjects, eq(classes.subjectId, subjects.id))
    .leftJoin(departments, eq(subjects.departmentId, departments.id))
    .leftJoin(user, eq(classes.teacherId, user.id))
    .where(eq(classes.id, classId));

  return classRows[0];
};

export const getClassByInviteCode = async (inviteCode: string) => {
  const classRows = await db
    .select()
    .from(classes)
    .where(eq(classes.inviteCode, inviteCode));

  return classRows[0];
};
