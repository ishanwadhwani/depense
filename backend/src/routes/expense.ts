import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";

const router = Router();
const prisma = new PrismaClient();

// Get all expenses for logged-in user (either created or part of groups)
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      where: { paidById: req.user!.userId },
      include: {
        group: true,
        paidBy: true,
        expenseShare: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(expenses);
  } catch (error) {
    console.error("Fetch expenses error:", error);
    res
      .status(500)
      .json({ error: "Something went wrong while fetching expenses" });
  }
});

// Get single expense
router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const expense = await prisma.expense.findUnique({
      where: { id },
      include: { group: true, paidBy: true },
    });

    if (!expense || expense.paidById !== req.user!.userId) {
      return res
        .status(404)
        .json({ error: "Expense not found or unauthorized" });
    }

    res.json(expense);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: "Something went wrong while fetching expense" });
  }
});

// Expense Share in the group by its members
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { description, amount, groupId, shares, paidById } = req.body;

    if (!description || amount === undefined || amount === null) {
      return res.status(400).json({
        error: "Missing required fields: description and amount are required",
      });
    }

    const parsedAmount = Number(amount);
    if (!isFinite(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    let payerId = req.user!.userId;

    if (paidById) {
      if (!groupId) {
        return res
          .status(400)
          .json({ error: "paidById can only be provided for group expenses" });
      }
      const [requesterIsMember, payerIsMember] = await Promise.all([
        prisma.groupMember.findFirst({
          where: { groupId, userId: req.user!.userId },
        }),
        prisma.groupMember.findFirst({ where: { groupId, userId: paidById } }),
      ]);
      if (!requesterIsMember)
        return res
          .status(403)
          .json({ error: "You must be a member of the group to add expenses" });
      if (!payerIsMember)
        return res
          .status(400)
          .json({ error: "paidById must be a member of the group" });
      payerId = paidById;
    }

    const isSplit = Array.isArray(shares) && shares.length > 0;

    if (isSplit) {
      if (!groupId) {
        return res
          .status(400)
          .json({ error: "groupId is required when providing shares" });
      }

      const totalShare = shares.reduce(
        (s: number, x: any) => s + Number(x.amount || 0),
        0
      );
      if (Math.abs(totalShare - parsedAmount) > 0.01) {
        return res
          .status(400)
          .json({ error: "Shares must add up to total amount" });
      }

      // const groupMember = await prisma.groupMember.findFirst({
      //   where: { groupId, userId: payerId },
      // });
      // if (!groupMember) {
      //   return res
      //     .status(403)
      //     .json({ error: "Payer must be part of the group" });
      // }

      // create expense and shares
      const expense = await prisma.expense.create({
        data: {
          description,
          amount: parsedAmount,
          groupId,
          paidById: payerId,
          expenseShare: {
            create: shares.map((s: any) => ({
              userId: s.userId,
              amount: Number(s.amount),
            })),
          },
        },
        include: {
          paidBy: true,
          group: true,
          expenseShare: { include: { user: true } },
        },
      });

      return res.status(201).json(expense);
    } else {
      const exp = await prisma.expense.create({
        data: {
          description,
          amount: parsedAmount,
          groupId: groupId ?? null,
          paidById: payerId,
        },
        include: {
          paidBy: true,
          group: true,
          expenseShare: { include: { user: true } },
        },
      });

      return res.status(201).json(exp);
    }
  } catch (err) {
    console.error("Create expense error:", err);
    return res.status(500).json({ error: "Something went wrong" });
  }
});

router.get("/:id/balance", authMiddleware, async (req: AuthRequest, res) => {
  const { id } = req.params;

  try {
    const shares = await prisma.expenseShare.findMany({
      where: { expense: { groupId: id } },
      include: { expense: true, user: true },
    });

    const balances: Record<string, number> = {};

    shares.forEach((share) => {
      balances[share.userId] = (balances[share.userId] || 0) - share.amount;
      balances[share.expense.paidById] =
        (balances[share.expense.paidById] || 0) + share.amount;
    });

    res.json(balances);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to calculate balances" });
  }
});

// Delete expense
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const expense = await prisma.expense.findUnique({ where: { id } });

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" });
    }

    if (expense.paidById !== req.user!.userId) {
      return res
        .status(403)
        .json({ error: "Unauthorized: you can only delete your own expenses" });
    }

    await prisma.expenseShare.deleteMany({ where: { expenseId: id } });
    await prisma.expense.delete({ where: { id } });

    return res.json({ message: "Expense deleted successfully" });
  } catch (err) {
    console.error("Error deleting expense:", err);
    return res
      .status(500)
      .json({ error: "Something went wrong while deleting expense" });
  }
});

export default router;
