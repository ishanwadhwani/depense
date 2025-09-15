import express from "express";
import { PrismaClient } from "@prisma/client"
import cors from "cors";

import authRoutes from "./routes/auth"
import expenseRoutes from "./routes/expense";
import groupRoutes from "./routes/group";
import userRoutes from "./routes/user";
import personalExpensesRouter from "./routes/personalExpenses";


const app = express();
const prisma = new PrismaClient();

app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);


// --- Routes ---
app.use("/auth", authRoutes);
app.use("/expenses", expenseRoutes);
app.use("/groups", groupRoutes);
app.use("/users", userRoutes);
app.use("/personal-expenses", personalExpensesRouter);

app.get("/", (req,res) => {
    res.send("Expense Tracker API is running");
});

export default app;