import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { db } from "../db";
import { departments, subjects, classes, enrollments } from "../db/schema";
import { user } from "../db/schema/auth";

type SeedData = {
  departments: Array<{
    code: string;
    name: string;
    description?: string | null;
  }>;
  subjects: Array<{
    code: string;
    name: string;
    description?: string | null;
    departmentCode: string;
  }>;
  users: Array<{
    id: string;
    name: string;
    email: string;
    emailVerified?: boolean;
    image?: string | null;
    imageCldPubId?: string | null;
    role?: "admin" | "teacher" | "student";
  }>;
  classes: Array<{
    name: string;
    inviteCode: string;
    subjectCode: string;
    teacherId: string;
    description?: string | null;
    bannerUrl?: string | null;
    bannerCldPubId?: string | null;
    capacity?: number;
    status?: "active" | "inactive" | "archived";
    schedules?: Array<{
      day: string;
      startTime: string;
      endTime: string;
    }>;
  }>;
  enrollments: Array<{
    classInviteCode: string;
    studentId: string;
  }>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loadSeedData = async (): Promise<SeedData> => {
  const filePath = path.join(__dirname, "data.json");
  const fileContents = await readFile(filePath, "utf8");
  return JSON.parse(fileContents) as SeedData;
};

const seed = async () => {
  const data = await loadSeedData();

  await db.delete(enrollments);
  await db.delete(classes);
  await db.delete(subjects);
  await db.delete(departments);
  await db.delete(user);

  const departmentRows = await db
    .insert(departments)
    .values(
      data.departments.map((department) => ({
        code: department.code,
        name: department.name,
        description: department.description ?? null,
      }))
    )
    .returning({ id: departments.id, code: departments.code });

  const departmentIdByCode = new Map(
    departmentRows.map((department) => [department.code, department.id])
  );

  const subjectRows = await db
    .insert(subjects)
    .values(
      data.subjects.map((subject) => ({
        code: subject.code,
        name: subject.name,
        description: subject.description ?? null,
        departmentId: departmentIdByCode.get(subject.departmentCode)!,
      }))
    )
    .returning({ id: subjects.id, code: subjects.code });

  const subjectIdByCode = new Map(
    subjectRows.map((subject) => [subject.code, subject.id])
  );

  await db
    .insert(user)
    .values(
      data.users.map((seedUser) => ({
        id: seedUser.id,
        name: seedUser.name,
        email: seedUser.email,
        emailVerified: seedUser.emailVerified ?? false,
        image: seedUser.image ?? null,
        imageCldPubId: seedUser.imageCldPubId ?? null,
        role: seedUser.role ?? "student",
      }))
    )
    .returning({ id: user.id });

  const classRows = await db
    .insert(classes)
    .values(
      data.classes.map((classItem) => ({
        name: classItem.name,
        inviteCode: classItem.inviteCode,
        subjectId: subjectIdByCode.get(classItem.subjectCode)!,
        teacherId: classItem.teacherId,
        description: classItem.description ?? null,
        bannerUrl: classItem.bannerUrl ?? null,
        bannerCldPubId: classItem.bannerCldPubId ?? null,
        capacity: classItem.capacity ?? 50,
        status: classItem.status ?? "active",
        schedules: classItem.schedules ?? [],
      }))
    )
    .returning({ id: classes.id, inviteCode: classes.inviteCode });

  const classIdByInvite = new Map(
    classRows.map((classItem) => [classItem.inviteCode, classItem.id])
  );

  if (data.enrollments.length > 0) {
    await db.insert(enrollments).values(
      data.enrollments.map((enrollment) => ({
        classId: classIdByInvite.get(enrollment.classInviteCode)!,
        studentId: enrollment.studentId,
      }))
    );
  }

  console.log("Seed completed.");
};

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
