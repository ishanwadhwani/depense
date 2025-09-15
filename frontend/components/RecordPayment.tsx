"use client";

import { useEffect, useCallback, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ToastProvider";

type UserLite = { id: string; name?: string; email?: string };
type GroupRef = { id: string; name?: string } | null;

export type Expense = {
  id: string;
  description: string;
  amount: number;
  createdAt: string;
  group?: GroupRef;
  paidBy?: UserLite | null;
  expenseShare?: Array<{
    id: string;
    userId: string;
    amount: number;
    user?: { name?: string; email?: string };
  }>;
  isPayment?: boolean;
};

type Settlement = {
  fromId: string;
  fromName?: string | null;
  toId: string;
  toName?: string | null;
  amount: number;
};

type ApiResponse = {
  balances: { userId: string; name?: string | null; balance: number }[];
  settlementsRaw: Settlement[];
  settlementsSimplified: Settlement[];
};

export default function RecordPayment({
  groupId,
  refreshKey,
  onDone,
}: {
  groupId: string;
  refreshKey?: number;
  onDone?: (newPayment?: Expense) => void;
}) {
  const { token, user } = useAuth();
  const toast = useToast();

  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const fetchDebts = useCallback(async () => {
    if (!token || !user) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/groups/${groupId}/settlements`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(
          payload?.error || `Failed to load settlements (${res.status})`
        );
      }
      const payload = (await res.json()) as ApiResponse;

      // identify current userId
      // let userId: string | undefined;
      // if (user && typeof (user as any).id === "string") userId = (user as any).id;
      // else if (user && typeof (user as any).userId === "string") userId = (user as any).userId;
      let userId: string | undefined;
      if ("id" in user && typeof user.id === "string") {
        userId = user.id;
      } else if ("userId" in user && typeof user.userId === "string") {
        userId = user.userId;
      }

      const simplify = localStorage.getItem("simplifyDebts") === "true";
      const settlements = simplify
        ? payload.settlementsSimplified
        : payload.settlementsRaw;

      // const myDebts = (payload.settlementsRaw || []).filter(
      //   (s) => userId && s.fromId === userId && s.amount >= 1
      // );
      // setSettlements(myDebts);
      const myDebts = settlements.filter(
        (s) => userId && s.fromId === userId && s.amount >= 1
      );
      setSettlements(myDebts);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load settlements"
      );
    } finally {
      setLoading(false);
    }
  }, [API, groupId, token, user]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts, refreshKey]);

  const handleConfirmPayment = async (s: Settlement) => {
    try {
      setError(null);
      setLoading(true);

      const res = await fetch(`${API}/groups/${groupId}/record-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromId: s.fromId,
          toId: s.toId,
          amount: s.amount,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || "Failed to record payment");
      }

      const data: Expense = await res.json();

      toast.push({
        type: "success",
        title: "Recorded",
        message: "Payment recorded",
      });

      setSettlements((prev) =>
        prev.filter(
          (item) => !(item.fromId === s.fromId && item.toId === s.toId)
        )
      );

      // re-fetch debts so the entry disappears
      // await fetchDebts();

      // notify parent (will increment refreshKey)
      if (typeof onDone === "function") {
        onDone(data);
      }
    } catch (err: unknown) {
      console.error("RecordPayment error:", err);
      toast.push({
        type: "error",
        title: "Error",
        message:
          err instanceof Error ? err.message : "Could not record payment",
      });
    }
  };

  if (loading) return <div className="text-gray-600">Loading debts...</div>;
  if (error) return <div className="text-red-600">Error: {error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Record Payment</h2>
      {settlements.length === 0 ? (
        <p className="text-gray-500">You don’t owe anything 🎉</p>
      ) : (
        <ul className="space-y-3">
          {settlements.map((s, idx) => (
            <li
              key={idx}
              className="p-4 bg-white dark:bg-gray-800 rounded shadow flex justify-between items-center"
            >
              <div>
                <div className="font-medium">
                  You owe{" "}
                  <span className="text-red-600 font-bold">
                    ₹{s.amount.toFixed(2)}
                  </span>{" "}
                  to {s.toName ?? s.toId}
                </div>
              </div>
              <button
                onClick={() => handleConfirmPayment(s)}
                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                Confirm Payment
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
