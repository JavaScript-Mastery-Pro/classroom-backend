interface Schedule {
  day: string;
  startTime: string;
  endTime: string;
}

declare namespace Express {
  interface Locals {
    user?: {
      id?: string;
      role?: "admin" | "teacher" | "student";
      [key: string]: unknown;
    };
    session?: unknown;
  }
}
