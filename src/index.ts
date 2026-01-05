import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";

import subjectsRouter from "./routes/subjects";
import usersRouter from "./routes/users";
import classesRouter from "./routes/classes";
import departmentsRouter from "./routes/departments";
import statsRouter from "./routes/stats";

// import securityMiddleware from "./middleware/security";
import { auth } from "./lib/auth";

const app = express();
const PORT = 8000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // React app URL
    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // allow cookies
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json());

// app.use(securityMiddleware);

app.use("/api/subjects", subjectsRouter);
app.use("/api/users", usersRouter);
app.use("/api/classes", classesRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/stats", statsRouter);

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
