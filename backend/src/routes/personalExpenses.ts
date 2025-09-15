import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";

const router = Router();
const prisma = new PrismaClient();

//CREATE A EXPENSE
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { description, amount } = req.body;

    if (!description || !amount) {
      return res.status(400).json({ error: "Description and amount required" });
    }

    const expense = await prisma.expense.create({
      data: {
        description,
        amount: parseFloat(amount),
        paidById: req.user!.userId,
        groupId: null,
      },
    });

    res.status(201).json(expense);
  } catch (err) {
    console.error("Create expense error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

//GET THE LIST OF EXPENSES
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const personal = req.query.personal === "true";
    const where: any = { paidById: req.user!.userId };
    if (personal) where.groupId = null;
    
    const expenses = await prisma.expense.findMany({
      where: {
        paidById: req.user!.userId,
        groupId: null,
      },
      orderBy: { createdAt: "desc" },
    });

    const total = expenses.reduce((sum, e) => sum + e.amount, 0);

    res.json({ total, expenses });
  } catch (err) {
    console.error("Fetch personal expenses error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

//DELETE EXPENSE
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const expense = await prisma.expense.findUnique({ where: { id } });

    if (!expense || expense.groupId !== null || expense.paidById !== req.user!.userId) {
      return res.status(404).json({ error: "Expense not found or unauthorized" });
    }

    await prisma.expense.delete({ where: { id } });

    res.json({ message: "Expense deleted" });
  } catch (err) {
    console.error("Delete personal expense error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

export default router;