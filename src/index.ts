import cors from "cors";
import express from "express";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./lib/auth";

import subjectsRouter from "./routes/subjects";
import usersRouter from "./routes/users";

const app = express();
const PORT = 8000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // React app URL
    methods: ["GET", "POST", "PUT", "DELETE"], // Specify allowed HTTP methods
    credentials: true, // allow cookies
  })
);

app.use(express.json());

app.all("/api/auth/{*any}", toNodeHandler(auth));

app.use("/api/users", usersRouter);
app.use("/api/subjects", subjectsRouter);

app.get("/", (req, res) => {
  res.send("Backend server is running!");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
