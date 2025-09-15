import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";

const router = Router();
const prisma = new PrismaClient();

function computeSettlementsFromGroup(group: any) {
  const round2 = (v: number) => Math.round(v * 100) / 100;

  const balancesMap: Record<string, number> = {};
  for (const m of group.members) balancesMap[m.userId] = 0;

  for (const exp of group.expenses) {
    balancesMap[exp.paidById] = round2(
      (balancesMap[exp.paidById] || 0) + Number(exp.amount)
    );
    for (const s of exp.expenseShare) {
      balancesMap[s.userId] = round2(
        (balancesMap[s.userId] || 0) - Number(s.amount)
      );
    }
  }

  const balances = group.members.map((m: any) => ({
    userId: m.userId,
    name: m.user?.name ?? null,
    balance: round2(balancesMap[m.userId] || 0),
  }));

  const pairAgg: Record<string, Record<string, number>> = {};
  for (const exp of group.expenses) {
    const toId = exp.paidById;
    for (const s of exp.expenseShare) {
      const fromId = s.userId;
      const amt = round2(Number(s.amount));
      if (amt < 0.01) continue;
      if (fromId === toId) continue;
      pairAgg[toId] = pairAgg[toId] || {};
      pairAgg[toId][fromId] = round2((pairAgg[toId][fromId] || 0) + amt);
    }
  }

  const settlementsRaw: any[] = [];
  for (const toId of Object.keys(pairAgg)) {
    for (const fromId of Object.keys(pairAgg[toId])) {
      const amount = round2(pairAgg[toId][fromId]);
      if (amount < 0.01) continue;
      const toMember = group.members.find((m: any) => m.userId === toId);
      const fromMember = group.members.find((m: any) => m.userId === fromId);
      settlementsRaw.push({
        fromId,
        fromName: fromMember?.user?.name ?? null,
        toId,
        toName: toMember?.user?.name ?? null,
        amount,
      });
    }
  }

  const creditors: { id: string; name?: string | null; amount: number }[] = [];
  const debtors: { id: string; name?: string | null; amount: number }[] = [];

  for (const m of group.members) {
    const bal = round2(balancesMap[m.userId] || 0);
    if (Math.abs(bal) < 0.01) continue;
    if (bal > 0)
      creditors.push({ id: m.userId, name: m.user?.name ?? null, amount: bal });
    if (bal < 0)
      debtors.push({ id: m.userId, name: m.user?.name ?? null, amount: -bal });
  }

  const settlementsSimplified: any[] = [];
  let d = 0,
    c = 0;
  while (d < debtors.length && c < creditors.length) {
    const debtor = debtors[d];
    const creditor = creditors[c];
    const amt = round2(Math.min(debtor.amount, creditor.amount));
    if (amt >= 0.01) {
      settlementsSimplified.push({
        fromId: debtor.id,
        fromName: debtor.name ?? null,
        toId: creditor.id,
        toName: creditor.name ?? null,
        amount: amt,
      });
    }
    debtor.amount = round2(debtor.amount - amt);
    creditor.amount = round2(creditor.amount - amt);
    if (debtor.amount <= 0.009) d++;
    if (creditor.amount <= 0.009) c++;
  }

  return { group: group.name, balances, settlementsRaw, settlementsSimplified };
}

router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name, members } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }

    const memberIds: string[] = Array.isArray(members)
      ? members.filter(Boolean)
      : [];

    const creatorId = req.user!.userId;
    if (!memberIds.includes(creatorId)) {
      memberIds.unshift(creatorId);
    }

    const uniqueMemberIds = Array.from(new Set(memberIds));

    const group = await prisma.group.create({
      data: {
        name,
        members: {
          create: uniqueMemberIds.map((userId) => ({ userId })),
        },
      },
      include: {
        members: { include: { user: true } },
      },
    });

    res.status(201).json(group);
  } catch (error) {
    console.error("Group creation error:", error);
    res.status(500).json({ error: "Failed to create group" });
  }
});

// group details including members (with user info) and expenses
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  const groups = await prisma.group.findMany({
    where: {
      members: {
        some: { userId: req.user!.userId },
      },
    },
    include: { members: true },
  });

  res.json(groups);
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: { include: { user: true } },
        expenses: {
          include: {
            paidBy: true,
            expenseShare: { include: { user: true } },
          },
        },
      },
    });

    if (!group) return res.status(404).json({ error: "Group not found" });

    res.json(group);
  } catch (err) {
    console.error("GET /groups/:id error:", err);
    res.status(500).json({ error: "Failed to fetch group" });
  }
});

// split amount by the groups and members
// router.get(
//   "/:groupId/settlements",
//   authMiddleware,
//   async (req: AuthRequest, res) => {
//     try {
//       const { groupId } = req.params;
//       const simplify = req.query.simplify === "true";

//       const group = await prisma.group.findUnique({
//         where: { id: groupId },
//         include: {
//           members: { include: { user: true } },
//           expenses: {
//             include: {
//               paidBy: true,
//               expenseShare: { include: { user: true } },
//             },
//           },
//         },
//       });

//       if (!group) {
//         return res.status(404).json({ error: "Group not found" });
//       }

//       const round2 = (v: number) => Math.round(v * 100) / 100;

//       //balance for each user
//       const balances: Record<string, number> = {};
//       group.members.forEach((m) => {
//         balances[m.userId] = 0;
//       });

//       // const balancesMap: Record<string, number> ={};
//       // for (const m of group.members) {
//       //   balancesMap[m.userId] = 0;
//       // }

//       //balance for each expense
//       for (const expense of group.expenses) {
//         // balances[expense.paidById] += expense.amount;
//         balances[expense.paidById] = round2(
//           (balances[expense.paidById] || 0) + Number(expense.amount)
//         );

//         for (const share of expense.expenseShare) {
//           balances[share.userId] = round2(
//             (balances[share.userId] || 0) - Number(share.amount)
//           );
//         }
//       }

//       // const creditors = [];
//       // const debtors = [];

//       // for (const [userId, balance] of Object.entries(balances)) {
//       //   if (balance > 0) creditors.push({ userId, amount: balance });
//       //   if (balance < 0) debtors.push({ userId, amount: -balance });
//       // }

//       const formattedBalances = group.members.map((m) => ({
//         userId: m.user.id,
//         name: m.user.name,
//         balance: balances[m.user.id] || 0,
//       }));

//       if (simplify) {
//         const creditors: { id: string; name?: string; amount: number }[] = [];
//         const debtors: { id: string; name?: string; amount: number }[] = [];

//         for (const m of group.members) {
//           const bal = round2(balances[m.userId] || 0);
//           if (Math.abs(bal) < 0.01) continue;
//           if (bal > 0)
//             creditors.push({ id: m.userId, name: m.user?.name, amount: bal });
//           if (bal < 0)
//             debtors.push({ id: m.userId, name: m.user?.name, amount: -bal });
//         }

//         const settlements: {
//           fromId: string;
//           fromName?: string | null;
//           toId: string;
//           toName?: string | null;
//           amount: number;
//         }[] = [];

//         let d = 0;
//         let c = 0;
//         while (d < debtors.length && c < creditors.length) {
//           const debtor = debtors[d];
//           const creditor = creditors[c];
//           const amount = round2(Math.min(debtor.amount, creditor.amount));
//           if (amount > 0.009) {
//             settlements.push({
//               fromId: debtor.id,
//               fromName: debtor.name ?? null,
//               toId: creditor.id,
//               toName: creditor.name ?? null,
//               amount,
//             });
//           }
//           debtor.amount = round2(debtor.amount - amount);
//           creditor.amount = round2(creditor.amount - amount);
//           if (debtor.amount <= 0.009) d++;
//           if (creditor.amount <= 0.009) c++;
//         }

//         return res.json({
//           group: group.name,
//           balances: formattedBalances,
//           settlements,
//         });
//       }

//       const pairMap: Record<string, Record<string, number>> = {}; // pairMap[toId][fromId] = sum
//       for (const exp of group.expenses) {
//         const toId = exp.paidById;
//         for (const s of exp.expenseShare) {
//           const fromId = s.userId;
//           const amt = round2(Number(s.amount));
//           if (amt < 0.01) continue; // ignore tiny shares
//           if (fromId === toId) continue; // ignore self shares
//           pairMap[toId] = pairMap[toId] || {};
//           pairMap[toId][fromId] = round2((pairMap[toId][fromId] || 0) + amt);
//         }
//       }

//       // build settlements array from pairMap
//       const rawSettlements: {
//         fromId: string;
//         fromName?: string | null;
//         toId: string;
//         toName?: string | null;
//         amount: number;
//       }[] = [];

//       for (const toId of Object.keys(pairMap)) {
//         const froms = pairMap[toId];
//         for (const fromId of Object.keys(froms)) {
//           const amount = round2(froms[fromId]);
//           if (amount < 0.01) continue;
//           const toMember = group.members.find((m) => m.userId === toId);
//           const fromMember = group.members.find((m) => m.userId === fromId);
//           rawSettlements.push({
//             fromId,
//             fromName: fromMember?.user?.name ?? null,
//             toId,
//             toName: toMember?.user?.name ?? null,
//             amount,
//           });
//         }
//       }

//       return res.json({
//         group: group.name,
//         balances: formattedBalances,
//         settlements: rawSettlements,
//       });
//     } catch (error) {
//       console.error("Error calculating settlements:", error);
//       res.status(500).json({ error: "Failed to calculate settlements" });
//     }
//   }
// );

// router.get(
//   "/:groupId/settlements",
//   authMiddleware,
//   async (req: AuthRequest, res) => {
//     try {
//       const { groupId } = req.params;

//       // load group with members, expenses, and shares
//       const group = await prisma.group.findUnique({
//         where: { id: groupId },
//         include: {
//           members: { include: { user: true } },
//           expenses: {
//             include: {
//               paidBy: true,
//               expenseShare: { include: { user: true } },
//             },
//           },
//         },
//       });

//       if (!group) return res.status(404).json({ error: "Group not found" });

//       const round2 = (v: number) => Math.round(v * 100) / 100;

//       // 1) compute net balances (for balances list and simplified algorithm)
//       const balancesMap: Record<string, number> = {};
//       for (const m of group.members) balancesMap[m.userId] = 0;

//       for (const exp of group.expenses) {
//         balancesMap[exp.paidById] = round2(
//           (balancesMap[exp.paidById] || 0) + Number(exp.amount)
//         );
//         for (const s of exp.expenseShare) {
//           balancesMap[s.userId] = round2(
//             (balancesMap[s.userId] || 0) - Number(s.amount)
//           );
//         }
//       }

//       const balances = group.members.map((m) => ({
//         userId: m.userId,
//         name: m.user?.name ?? null,
//         balance: round2(balancesMap[m.userId] || 0),
//       }));

//       const pairAgg: Record<string, Record<string, number>> = {};
//       for (const exp of group.expenses) {
//         const toId = exp.paidById;
//         for (const s of exp.expenseShare) {
//           const fromId = s.userId;
//           const amt = round2(Number(s.amount));
//           if (amt < 0.01) continue;
//           if (fromId === toId) continue;
//           pairAgg[toId] = pairAgg[toId] || {};
//           pairAgg[toId][fromId] = round2((pairAgg[toId][fromId] || 0) + amt);
//         }
//       }

//       const settlementsRaw: {
//         fromId: string;
//         fromName?: string | null;
//         toId: string;
//         toName?: string | null;
//         amount: number;
//       }[] = [];

//       for (const toId of Object.keys(pairAgg)) {
//         for (const fromId of Object.keys(pairAgg[toId])) {
//           const amount = round2(pairAgg[toId][fromId]);
//           if (amount < 0.01) continue;
//           const toMember = group.members.find((m) => m.userId === toId);
//           const fromMember = group.members.find((m) => m.userId === fromId);
//           settlementsRaw.push({
//             fromId,
//             fromName: fromMember?.user?.name ?? null,
//             toId,
//             toName: toMember?.user?.name ?? null,
//             amount,
//           });
//         }
//       }

//       const creditors: { id: string; name?: string | null; amount: number }[] =
//         [];
//       const debtors: { id: string; name?: string | null; amount: number }[] =
//         [];

//       for (const m of group.members) {
//         const bal = round2(balancesMap[m.userId] || 0);
//         if (Math.abs(bal) < 0.01) continue;
//         if (bal > 0)
//           creditors.push({
//             id: m.userId,
//             name: m.user?.name ?? null,
//             amount: bal,
//           });
//         if (bal < 0)
//           debtors.push({
//             id: m.userId,
//             name: m.user?.name ?? null,
//             amount: -bal,
//           });
//       }

//       const settlementsSimplified: {
//         fromId: string;
//         fromName?: string | null;
//         toId: string;
//         toName?: string | null;
//         amount: number;
//       }[] = [];

//       let d = 0,
//         c = 0;
//       while (d < debtors.length && c < creditors.length) {
//         const debtor = debtors[d];
//         const creditor = creditors[c];
//         const amt = round2(Math.min(debtor.amount, creditor.amount));
//         if (amt >= 0.01) {
//           settlementsSimplified.push({
//             fromId: debtor.id,
//             fromName: debtor.name ?? null,
//             toId: creditor.id,
//             toName: creditor.name ?? null,
//             amount: amt,
//           });
//         }
//         debtor.amount = round2(debtor.amount - amt);
//         creditor.amount = round2(creditor.amount - amt);
//         if (debtor.amount <= 0.009) d++;
//         if (creditor.amount <= 0.009) c++;
//       }

//       return res.json({
//         group: group.name,
//         balances,
//         settlementsRaw,
//         settlementsSimplified,
//       });
//     } catch (err) {
//       console.error("Error calculating settlements:", err);
//       return res
//         .status(500)
//         .json({ error: "Something went wrong while calculating settlements" });
//     }
//   }
// );

// Get all expenses for a specific group
// router.get(
//   "/:groupId/expenses",
//   authMiddleware,
//   async (req: AuthRequest, res) => {
//     try {
//       const { groupId } = req.params;

//       // Ensure user is member of the group
//       const isMember = await prisma.groupMember.findFirst({
//         where: { groupId, userId: req.user!.userId },
//       });

//       if (!isMember) {
//         return res
//           .status(403)
//           .json({ error: "You are not a member of this group" });
//       }

//       const expenses = await prisma.expense.findMany({
//         where: { groupId },
//         include: {
//           paidBy: true, // show who paid
//           expenseShare: {
//             include: { user: true }, // show split details
//           },
//         },
//         orderBy: { createdAt: "desc" },
//       });

//       res.json(expenses);
//     } catch (error) {
//       console.error("Error fetching group expenses:", error);
//       res.status(500).json({ error: "Failed to fetch group expenses" });
//     }
//   }
// );

router.get(
  "/:groupId/settlements",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { groupId } = req.params;

      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          members: { include: { user: true } },
          expenses: {
            where: { isPayment: false }, // ✅ filter payments here
            include: {
              paidBy: true,
              expenseShare: { include: { user: true } },
            },
          },
        },
      });

      if (!group) return res.status(404).json({ error: "Group not found" });

      const payload = computeSettlementsFromGroup(group);
      return res.json(payload);
    } catch (err) {
      console.error("Error calculating settlements:", err);
      return res
        .status(500)
        .json({ error: "Something went wrong while calculating settlements" });
    }
  }
);

// expenses as per the group
router.get(
  "/:groupId/expenses",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { groupId } = req.params;

      const expenses = await prisma.expense.findMany({
        where: { groupId },
        include: {
          paidBy: { select: { id: true, name: true, email: true } },
          expenseShare: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(expenses);
    } catch (err) {
      console.error("Fetch group expenses error:", err);
      res.status(500).json({ error: "Failed to fetch group expenses" });
    }
  }
);

// record payments
// router.post(
//   "/:groupId/payments",
//   authMiddleware,
//   async (req: AuthRequest, res) => {
//     try {
//       const { groupId } = req.params;
//       const payerId = req.user!.userId;
//       const { payments } = req.body as {
//         payments?: { toId: string; amount: number; note?: string }[];
//       };

//       if (!Array.isArray(payments) || payments.length === 0) {
//         return res
//           .status(400)
//           .json({ error: "payments must be a non-empty array" });
//       }

//       const group = await prisma.group.findUnique({
//         where: { id: groupId },
//         include: { members: true },
//       });
//       if (!group) return res.status(404).json({ error: "Group not found" });

//       const isPayerMember = group.members.some((m) => m.userId === payerId);
//       if (!isPayerMember)
//         return res
//           .status(403)
//           .json({ error: "You are not a member of this group" });

//       for (const p of payments) {
//         if (
//           !p ||
//           typeof p.toId !== "string" ||
//           typeof p.amount !== "number" ||
//           p.amount <= 0
//         ) {
//           return res
//             .status(400)
//             .json({
//               error:
//                 "Each payment must have toId (string) and amount (positive number)",
//             });
//         }
//         const isToMember = group.members.some((m) => m.userId === p.toId);
//         if (!isToMember) {
//           return res
//             .status(400)
//             .json({ error: `toId ${p.toId} is not a member of the group` });
//         }
//       }

//       const created = await prisma.$transaction(
//         payments.map((p) =>
//           prisma.expense.create({
//             data: {
//               description: p.note
//                 ? `Payment: ${p.note}`
//                 : `Payment to ${p.toId}`,
//               amount: p.amount,
//               groupId: groupId,
//               paidById: payerId,
//               expenseShare: { create: [{ userId: p.toId, amount: p.amount }] },
//             },
//             include: {
//               paidBy: { select: { id: true, name: true, email: true } },
//               expenseShare: {
//                 include: {
//                   user: { select: { id: true, name: true, email: true } },
//                 },
//               },
//             },
//           })
//         )
//       );
//       return res.json({ created });
//     } catch (err) {
//       console.error("Batch payment error:", err);
//       return res.status(500).json({ error: "Failed to record payments" });
//     }
//   }
// );

router.post(
  "/:groupId/payments",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { groupId } = req.params;
      const payerId = req.user!.userId;
      const paymentsInput = req.body?.payments;

      if (!Array.isArray(paymentsInput) || paymentsInput.length === 0) {
        return res
          .status(400)
          .json({ error: "payments must be a non-empty array" });
      }

      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { members: true },
      });
      if (!group) return res.status(404).json({ error: "Group not found" });

      const isPayerMember = group.members.some((m) => m.userId === payerId);
      if (!isPayerMember)
        return res
          .status(403)
          .json({ error: "You are not a member of this group" });

      const payments: { toId: string; amount: number; note?: string }[] = [];
      for (const p of paymentsInput) {
        if (!p || typeof p.toId !== "string")
          return res
            .status(400)
            .json({ error: "Each payment must include toId (string)" });

        const amt =
          typeof p.amount === "string"
            ? parseFloat(p.amount)
            : Number(p.amount);
        if (!Number.isFinite(amt) || amt <= 0)
          return res
            .status(400)
            .json({ error: "Each payment must have amount > 0" });
        const isToMember = group.members.some((m) => m.userId === p.toId);
        if (!isToMember)
          return res
            .status(400)
            .json({ error: `toId ${p.toId} is not a member` });
        payments.push({
          toId: p.toId,
          amount: Math.round(amt * 100) / 100,
          note: p.note,
        });
      }

      const creates = payments.map((p) =>
        prisma.expense.create({
          data: {
            description: p.note ? `Payment: ${p.note}` : `Payment to ${p.toId}`,
            amount: p.amount,
            groupId,
            paidById: payerId,
            expenseShare: { create: [{ userId: p.toId, amount: p.amount }] },
          },
          include: {
            paidBy: { select: { id: true, name: true, email: true } },
            expenseShare: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        })
      );

      const created = await prisma.$transaction(creates);

      // fetch updated group + compute settlements and return both
      const updatedGroup = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          members: { include: { user: true } },
          expenses: {
            include: {
              paidBy: true,
              expenseShare: { include: { user: true } },
            },
          },
        },
      });

      const updatedPayload = updatedGroup
        ? computeSettlementsFromGroup(updatedGroup)
        : null;

      return res.json({ created, updated: updatedPayload });
    } catch (err) {
      console.error("Batch payment error:", err);
      return res.status(500).json({ error: "Failed to record payments" });
    }
  }
);

// Record a manual payment inside a group
// router.post(
//   "/:groupId/record-payment",
//   authMiddleware,
//   async (req: AuthRequest, res) => {
//     try {
//       const { groupId } = req.params;
//       const { fromId, toId, amount } = req.body;

//       if (!fromId || !toId || !amount) {
//         return res.status(400).json({ error: "Missing required fields" });
//       }

//       const group = await prisma.group.findUnique({
//         where: { id: groupId },
//         include: { members: true },
//       });
//       if (!group) {
//         return res.status(404).json({ error: "Group not found" });
//       }

//       const fromMember = group.members.find((m) => m.userId === fromId);
//       const toMember = group.members.find((m) => m.userId === toId);

//       if (!fromMember || !toMember) {
//         return res.status(400).json({ error: "Both users must be in group" });
//       }

//       const paymentExpense = await prisma.expense.create({
//         data: {
//           description: `Payment from ${fromId} to ${toId}`,
//           amount: amount,
//           paidById: fromId,
//           groupId,
//           expenseShare: {
//             create: [
//               {
//                 userId: toId,
//                 amount: amount,
//               },
//             ],
//           },
//         },
//         include: { expenseShare: true },
//       });

//       return res.json({ success: true, payment: paymentExpense });
//     } catch (err) {
//       console.error("Record payment error:", err);
//       return res.status(500).json({ error: "Something went wrong" });
//     }
//   }
// );

// Record a manual payment (as a special expense)
// router.post(
//   "/:groupId/record-payment",
//   authMiddleware,
//   async (req: AuthRequest, res) => {
//     try {
//       const { groupId } = req.params;
//       const { fromId, toId, amount } = req.body;

//       if (!fromId || !toId || !amount) {
//         return res.status(400).json({ error: "Missing required fields" });
//       }

//       // verify group and members
//       const group = await prisma.group.findUnique({
//         where: { id: groupId },
//         include: { members: true },
//       });
//       if (!group) return res.status(404).json({ error: "Group not found" });

//       const fromMember = group.members.find((m) => m.userId === fromId);
//       const toMember = group.members.find((m) => m.userId === toId);

//       if (!fromMember || !toMember) {
//         return res.status(400).json({ error: "Both users must be in group" });
//       }

//       // create special expense
//       const expense = await prisma.expense.create({
//         data: {
//           description: `Payment from ${fromId} to ${toId}`,
//           amount: Number(amount),
//           paidById: fromId,
//           groupId,
//           isPayment: true, // ✅ now valid
//           expenseShare: {
//             create: [
//               {
//                 userId: toId,
//                 amount: Number(amount),
//               },
//             ],
//           },
//         },
//         include: { expenseShare: true },
//       });

//       return res.json({ success: true, expense });
//     } catch (err) {
//       console.error("Error recording payment:", err);
//       return res.status(500).json({ error: "Something went wrong" });
//     }
//   }
// );

// POST /groups/:groupId/record-payment
router.post(
  "/:groupId/record-payment",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { groupId } = req.params;
      const { fromId, toId, amount } = req.body;

      if (!fromId || !toId || !amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid payment data" });
      }

      // Ensure group exists
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { members: true },
      });
      if (!group) return res.status(404).json({ error: "Group not found" });

      // Verify both users are in the group
      const validUserIds = group.members.map((m) => m.userId);
      if (!validUserIds.includes(fromId) || !validUserIds.includes(toId)) {
        return res.status(400).json({ error: "Both users must belong to group" });
      }

      // ✅ Create payment record as an expense
      const payment = await prisma.expense.create({
        data: {
          description: "Payment",
          amount: parseFloat(amount),
          paidById: fromId,
          groupId,
          isPayment: true, // <-- mark it as payment
          expenseShare: {
            create: [
              {
                userId: toId,
                amount: parseFloat(amount),
              },
            ],
          },
        },
        include: { expenseShare: true },
      });

      // ✅ Recalculate settlements *after* recording payment
      const updatedGroup = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          members: { include: { user: true } },
          expenses: {
            include: {
              paidBy: true,
              expenseShare: { include: { user: true } },
            },
          },
        },
      });

      if (!updatedGroup) {
        return res.status(404).json({ error: "Group not found after update" });
      }

      // Use same settlement calculation as in /:groupId/settlements
      const round2 = (v: number) => Math.round(v * 100) / 100;
      const balancesMap: Record<string, number> = {};
      for (const m of updatedGroup.members) balancesMap[m.userId] = 0;

      for (const exp of updatedGroup.expenses) {
        if (exp.isPayment) {
          // ✅ still adjust balances since payment is also a transaction
          balancesMap[exp.paidById] += round2(Number(exp.amount));
          for (const s of exp.expenseShare) {
            balancesMap[s.userId] -= round2(Number(s.amount));
          }
        } else {
          balancesMap[exp.paidById] += round2(Number(exp.amount));
          for (const s of exp.expenseShare) {
            balancesMap[s.userId] -= round2(Number(s.amount));
          }
        }
      }

      const balances = updatedGroup.members.map((m) => ({
        userId: m.userId,
        name: m.user?.name ?? null,
        balance: round2(balancesMap[m.userId] || 0),
      }));

      return res.json({
        message: "Payment recorded successfully",
        payment,
        updated: { balances },
      });
    } catch (err) {
      console.error("Error recording payment:", err);
      res
        .status(500)
        .json({ error: "Something went wrong while recording payment" });
    }
  }
);


export default router;
