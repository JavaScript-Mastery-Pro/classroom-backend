import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";

import { auth } from "../lib/auth";
import { roleEnum } from "../db/schema/auth";

type UserRole = (typeof roleEnum.enumValues)[number];

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = session.user as { id?: string; role?: UserRole };
    res.locals.user = user;
    res.locals.session = session.session ?? session;

    return next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Failed to authenticate" });
  }
};

export const authorizeRoles =
  (...roles: UserRole[]) =>
  (_req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user as { role?: UserRole } | undefined;

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!user.role || !roles.includes(user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return next();
  };
