import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";

const router = Router();
const prisma = new PrismaClient();

/**
 * Helper: rounding to 2 decimals
 */
function round2(v: number) {
  return Math.round(v * 100) / 100;
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

/**
 * GET /groups/:groupId
 * return basic group info + members (with user)
 */
router.get("/:groupId", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { groupId } = req.params;

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { include: { user: true } },
      },
    });

    if (!group) return res.status(404).json({ error: "Group not found" });

    return res.json({
      id: group.id,
      name: group.name,
      members: group.members.map((m) => ({
        id: m.id,
        userId: m.userId,
        user: m.user
          ? { id: m.user.id, name: m.user.name, email: m.user.email }
          : null,
      })),
    });
  } catch (err) {
    console.error("GET /groups/:groupId error:", err);
    return res.status(500).json({ error: "Failed to fetch group" });
  }
});

/**
 * GET /groups/:groupId/expenses
 * Return all expenses for this group (including isPayment flag and shares, paidBy)
 */
router.get(
  "/:groupId/expenses",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { groupId } = req.params;

      const expenses = await prisma.expense.findMany({
        where: { groupId },
        include: {
          paidBy: true,
          expenseShare: { include: { user: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      return res.json(expenses);
    } catch (err) {
      console.error("GET group expenses error:", err);
      return res.status(500).json({ error: "Failed to fetch group expenses" });
    }
  }
);

/**
 * GET /groups/:groupId/settlements
 * - balances (net per member)
 * - settlementsRaw (pairwise net debts - after applying payments)
 * - settlementsSimplified (greedy pairing from balances)
 */
// router.get(
//   "/:groupId/settlements",
//   authMiddleware,
//   async (req: AuthRequest, res) => {
//     try {
//       const { groupId } = req.params;

//       const group = await prisma.group.findUnique({
//         where: { id: groupId },
//         include: {
//           members: { include: { user: true } },
//           expenses: {
//             where: { isPayment: false },
//             include: {
//               paidBy: true,
//               expenseShare: { include: { user: true } },
//             },
//           },
//         },
//       });

//       if (!group) return res.status(404).json({ error: "Group not found" });

//       // 1) compute balances from ALL expenses (payments + normal)
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

//       // 2) build pairAgg from NORMAL expenses only (isPayment == false)
//       const pairAgg: Record<string, Record<string, number>> = {};
//       for (const exp of group.expenses) {
//         if (exp.isPayment) continue; // only normal expenses here
//         const toId = exp.paidById;
//         for (const s of exp.expenseShare) {
//           const fromId = s.userId;
//           if (fromId === toId) continue;
//           pairAgg[toId] = pairAgg[toId] || {};
//           pairAgg[toId][fromId] = round2(
//             (pairAgg[toId][fromId] || 0) + Number(s.amount)
//           );
//         }
//       }

//       // 3) apply payments (isPayment === true) as REDUCTIONS to pairAgg
//       //    If we created payment with paidBy = payer and expenseShare.userId = receiver,
//       //    then we reduce pairAgg[receiver][payer] by the paid amount.
//       for (const exp of group.expenses) {
//         if (!exp.isPayment) continue;
//         const payer = exp.paidById;
//         for (const s of exp.expenseShare) {
//           const receiver = s.userId;
//           pairAgg[receiver] = pairAgg[receiver] || {};
//           pairAgg[receiver][payer] = round2(
//             (pairAgg[receiver][payer] || 0) - Number(s.amount)
//           );
//         }
//       }

//       // 4) normalize pairAgg into settlementsRaw (one entry per positive net only)
//       const membersIds = group.members.map((m) => m.userId);
//       const settlementsRaw: {
//         fromId: string;
//         fromName?: string | null;
//         toId: string;
//         toName?: string | null;
//         amount: number;
//       }[] = [];

//       // Turn pairAgg into net entries: for each unordered pair compute net = pairAgg[A][B] - pairAgg[B][A]
//       for (let i = 0; i < membersIds.length; i++) {
//         for (let j = i + 1; j < membersIds.length; j++) {
//           const A = membersIds[i];
//           const B = membersIds[j];
//           const aToB = pairAgg[A]?.[B] || 0;
//           const bToA = pairAgg[B]?.[A] || 0;
//           const net = round2(aToB - bToA);
//           if (net > 0.009) {
//             // B owes A net
//             const toMember = group.members.find((m) => m.userId === A);
//             const fromMember = group.members.find((m) => m.userId === B);
//             settlementsRaw.push({
//               fromId: B,
//               fromName: fromMember?.user?.name ?? null,
//               toId: A,
//               toName: toMember?.user?.name ?? null,
//               amount: net,
//             });
//           } else if (net < -0.009) {
//             // A owes B -net
//             const toMember = group.members.find((m) => m.userId === B);
//             const fromMember = group.members.find((m) => m.userId === A);
//             settlementsRaw.push({
//               fromId: A,
//               fromName: fromMember?.user?.name ?? null,
//               toId: B,
//               toName: toMember?.user?.name ?? null,
//               amount: Math.abs(net),
//             });
//           }
//         }
//       }

//       // 5) simplified settlements (greedy)
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





// inside routes/group.ts (replace the old settlements handler)
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
          // include ALL expenses (payments + normal). We'll handle sign logic below.
          expenses: {
            include: {
              paidBy: true,
              expenseShare: { include: { user: true } },
            },
          },
        },
      });

      if (!group) return res.status(404).json({ error: "Group not found" });

      const round2 = (v: number) => Math.round(v * 100) / 100;

      // 1) compute net balances (for balances list)
      const balancesMap: Record<string, number> = {};
      for (const m of group.members) balancesMap[m.userId] = 0;

      for (const exp of group.expenses) {
        // balances: paidBy gets +amount, each share subtracts
        balancesMap[exp.paidById] = round2(
          (balancesMap[exp.paidById] || 0) + Number(exp.amount)
        );
        for (const s of exp.expenseShare) {
          balancesMap[s.userId] = round2(
            (balancesMap[s.userId] || 0) - Number(s.amount)
          );
        }
      }

      const balances = group.members.map((m) => ({
        userId: m.userId,
        name: m.user?.name ?? null,
        balance: round2(balancesMap[m.userId] || 0),
      }));

      // 2) Build pairwise aggregation (pairAgg[toId][fromId] = net amount fromId owes to toId)
      // For normal expenses: pairAgg[to][from] += share
      // For payments (exp.isPayment === true): we subtract - treat them as reducing pairAgg[to][from]
      const pairAgg: Record<string, Record<string, number>> = {};

      for (const exp of group.expenses) {
        const toId = exp.paidById;
        for (const s of exp.expenseShare) {
          const fromId = s.userId;
          const amt = round2(Number(s.amount));
          if (amt < 0.01) continue;
          if (fromId === toId) continue;
          const sign = exp.isPayment ? -1 : 1; // payments reduce pairwise debt
          pairAgg[toId] = pairAgg[toId] || {};
          pairAgg[toId][fromId] = round2((pairAgg[toId][fromId] || 0) + sign * amt);
        }
      }

      // 3) Build settlementsRaw from pairAgg (only positive nets)
      const settlementsRaw: {
        fromId: string;
        fromName?: string | null;
        toId: string;
        toName?: string | null;
        amount: number;
      }[] = [];

      for (const toId of Object.keys(pairAgg)) {
        for (const fromId of Object.keys(pairAgg[toId])) {
          const amount = round2(pairAgg[toId][fromId]);
          if (amount <= 0.009) continue; // ignore non-positive
          const toMember = group.members.find((m) => m.userId === toId);
          const fromMember = group.members.find((m) => m.userId === fromId);
          settlementsRaw.push({
            fromId,
            fromName: fromMember?.user?.name ?? null,
            toId,
            toName: toMember?.user?.name ?? null,
            amount,
          });
        }
      }

      // 4) Simplify: compute simplified settlements from net balances (greedy)
      const creditors: { id: string; name?: string | null; amount: number }[] = [];
      const debtors: { id: string; name?: string | null; amount: number }[] = [];

      for (const m of group.members) {
        const bal = round2(balancesMap[m.userId] || 0);
        if (Math.abs(bal) < 0.01) continue;
        if (bal > 0) creditors.push({ id: m.userId, name: m.user?.name ?? null, amount: bal });
        if (bal < 0) debtors.push({ id: m.userId, name: m.user?.name ?? null, amount: -bal });
      }

      const settlementsSimplified: {
        fromId: string;
        fromName?: string | null;
        toId: string;
        toName?: string | null;
        amount: number;
      }[] = [];

      let d = 0, c = 0;
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

      return res.json({
        group: group.name,
        balances,
        settlementsRaw,
        settlementsSimplified,
      });
    } catch (err) {
      console.error("Error calculating settlements:", err);
      return res.status(500).json({ error: "Something went wrong while calculating settlements" });
    }
  }
);

/**
 * POST /groups/:groupId/record-payment
 * Creates an expense with isPayment = true that represents a manual payment
 * payer (fromId) paid receiver (toId) amount.
 * After creation, return updated settlements (same shape as /settlements)
 */
router.post(
  "/:groupId/record-payment",
  authMiddleware,
  async (req: AuthRequest, res) => {
    try {
      const { groupId } = req.params;
      const { fromId, toId, amount } = req.body;

      if (!fromId || !toId || !amount || Number(amount) <= 0) {
        return res.status(400).json({ error: "Missing or invalid fields" });
      }

      // verify group and membership
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: { members: true },
      });
      if (!group) return res.status(404).json({ error: "Group not found" });

      const validUserIds = group.members.map((m) => m.userId);
      if (!validUserIds.includes(fromId) || !validUserIds.includes(toId)) {
        return res
          .status(400)
          .json({ error: "Both users must be in the group" });
      }

      // create payment expense (isPayment=true) - paidBy = payer (fromId)
      const payment = await prisma.expense.create({
        data: {
          description: `Payment from ${fromId} to ${toId}`,
          amount: Number(amount),
          paidById: fromId,
          groupId,
          isPayment: true,
          expenseShare: {
            create: [
              {
                userId: toId,
                amount: Number(amount),
              },
            ],
          },
        },
        include: { expenseShare: true },
      });

      // compute updated settlements by calling the same logic as above:
      const refreshedGroup = await prisma.group.findUnique({
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

      if (!refreshedGroup)
        return res
          .status(500)
          .json({ error: "Failed to reload group after payment" });

      // compute balances, pairAgg and simplified again (DRY copied from above)
      const balancesMap: Record<string, number> = {};
      for (const m of refreshedGroup.members) balancesMap[m.userId] = 0;
      for (const exp of refreshedGroup.expenses) {
        balancesMap[exp.paidById] = round2(
          (balancesMap[exp.paidById] || 0) + Number(exp.amount)
        );
        for (const s of exp.expenseShare) {
          balancesMap[s.userId] = round2(
            (balancesMap[s.userId] || 0) - Number(s.amount)
          );
        }
      }
      const balances = refreshedGroup.members.map((m) => ({
        userId: m.userId,
        name: m.user?.name ?? null,
        balance: round2(balancesMap[m.userId] || 0),
      }));

      const pairAgg: Record<string, Record<string, number>> = {};
      for (const exp of refreshedGroup.expenses) {
        if (exp.isPayment) continue; // normal expenses
        const toId = exp.paidById;
        for (const s of exp.expenseShare) {
          const fromId = s.userId;
          if (fromId === toId) continue;
          pairAgg[toId] = pairAgg[toId] || {};
          pairAgg[toId][fromId] = round2(
            (pairAgg[toId][fromId] || 0) + Number(s.amount)
          );
        }
      }
      // apply payments as reductions
      for (const exp of refreshedGroup.expenses) {
        if (!exp.isPayment) continue;
        const payer = exp.paidById;
        for (const s of exp.expenseShare) {
          const receiver = s.userId;
          pairAgg[receiver] = pairAgg[receiver] || {};
          pairAgg[receiver][payer] = round2(
            (pairAgg[receiver][payer] || 0) - Number(s.amount)
          );
        }
      }

      const membersIds = refreshedGroup.members.map((m) => m.userId);
      const settlementsRaw: {
        fromId: string;
        fromName?: string | null;
        toId: string;
        toName?: string | null;
        amount: number;
      }[] = [];
      for (let i = 0; i < membersIds.length; i++) {
        for (let j = i + 1; j < membersIds.length; j++) {
          const A = membersIds[i];
          const B = membersIds[j];
          const aToB = pairAgg[A]?.[B] || 0;
          const bToA = pairAgg[B]?.[A] || 0;
          const net = round2(aToB - bToA);
          if (net > 0.009) {
            const toMember = refreshedGroup.members.find((m) => m.userId === A);
            const fromMember = refreshedGroup.members.find(
              (m) => m.userId === B
            );
            settlementsRaw.push({
              fromId: B,
              fromName: fromMember?.user?.name ?? null,
              toId: A,
              toName: toMember?.user?.name ?? null,
              amount: net,
            });
          } else if (net < -0.009) {
            const toMember = refreshedGroup.members.find((m) => m.userId === B);
            const fromMember = refreshedGroup.members.find(
              (m) => m.userId === A
            );
            settlementsRaw.push({
              fromId: A,
              fromName: fromMember?.user?.name ?? null,
              toId: B,
              toName: toMember?.user?.name ?? null,
              amount: Math.abs(net),
            });
          }
        }
      }

      // simplified (from balances)
      const creditors: { id: string; name?: string | null; amount: number }[] =
        [];
      const debtors: { id: string; name?: string | null; amount: number }[] =
        [];
      for (const m of refreshedGroup.members) {
        const bal = round2(balancesMap[m.userId] || 0);
        if (Math.abs(bal) < 0.01) continue;
        if (bal > 0)
          creditors.push({
            id: m.userId,
            name: m.user?.name ?? null,
            amount: bal,
          });
        else
          debtors.push({
            id: m.userId,
            name: m.user?.name ?? null,
            amount: -bal,
          });
      }

      const settlementsSimplified: {
        fromId: string;
        fromName?: string | null;
        toId: string;
        toName?: string | null;
        amount: number;
      }[] = [];
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

      return res.json({
        message: "Payment recorded",
        payment,
        updated: { balances, settlementsRaw, settlementsSimplified },
      });
    } catch (err) {
      console.error("POST record-payment error:", err);
      return res.status(500).json({ error: "Failed to record payment" });
    }
  }
);

export default router;
