"use client";

import React, { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { safeName } from "@/utils/safeName";

type UserLite = { id?: string; name?: string; email?: string; userId?: string };
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

type Props = {
  groupId?: string;
  initialItems?: Expense[];
  onItemsChange?: (items: Expense[]) => void;
  refreshKey?: number;
};

// function safeName(user?: UserLite | null) {
//   if (!user) return "Someone";
//   return user.name ?? user.email ?? user.id ?? user.userId ?? "Someone";
// }

export default function ExpensesList({
  groupId,
  initialItems,
  onItemsChange,
}: Props) {
  const { token } = useAuth();
  const [items, setItems] = useState<Expense[]>(initialItems ?? []);
  const [loading, setLoading] = useState<boolean>(!initialItems);
  const [error, setError] = useState<string | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    if (initialItems) return;
    let mounted = true;
    const controller = new AbortController();

    const fetchExpenses = async () => {
      setLoading(true);
      setError(null);

      try {
        const url = groupId
          ? `${API}/groups/${groupId}/expenses`
          : `${API}/expenses`;

        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(
            payload?.error || `Failed to load expenses (${res.status})`
          );
        }
        const data = (await res.json()) as Expense[];

        const filtered = groupId ? data : data;
        setItems(filtered);
        if (onItemsChange) setTimeout(() => onItemsChange(filtered), 0);
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Failed to load expenses"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchExpenses();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [API, token, groupId, initialItems, onItemsChange]);

  useEffect(() => {
    if (initialItems) {
      setItems(initialItems);
    }
  }, [initialItems]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;

    try {
      const res = await fetch(`${API}/expenses/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const message =
          payload?.error ||
          payload?.message ||
          `Failed to delete expense (${res.status})`;

        if (res.status === 401) {
          throw new Error("Not authorized. Please login again.");
        } else if (res.status === 403) {
          throw new Error("Forbidden: you can't delete this expense.");
        } else {
          throw new Error(message);
        }
      }

      setItems((prev) => {
        const next = prev.filter((i) => i.id !== id);
        if (onItemsChange) setTimeout(() => onItemsChange(next), 0);
        return next;
      });
    } catch (err: unknown) {
      console.error("Delete error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete expense");
    }
  };

  const sorted = items.slice().sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : Date.now();
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : Date.now();
    return bTime - aTime;
  });

  return (
    <div>
      {loading ? (
        <div className="text-gray-600">Loading expenses...</div>
      ) : error ? (
        <div className="text-red-600">Error: {error}</div>
      ) : items.length === 0 ? (
        <div className="text-gray-500">No expenses yet.</div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((e) => {
            const createdAtDate = e.createdAt ? new Date(e.createdAt) : null;
            const createdAtStr =
              createdAtDate && !isNaN(createdAtDate.getTime())
                ? createdAtDate.toLocaleString()
                : "Pending...";
            const amount = typeof e.amount === "number" ? e.amount : 0;
            return (
              <li
                key={`${e.id}-${e.createdAt ?? "pending"}`}
                className="p-4 expenses-card rounded-lg shadow-sm hover:shadow-md transition"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">
                      {e.isPayment
                        ? `💸 Payment: ${safeName(e.paidBy)} → ${safeName(
                            e.expenseShare?.[0]?.user ?? {
                              userId: e.expenseShare?.[0]?.userId,
                            }
                          )}`
                        : e.description}
                    </div>

                    <div className="mt-1 text-xs muted font-medium">
                      {createdAtStr} |{" "}
                      {e.paidBy
                        ? `Paid by ${safeName(e.paidBy)}`
                        : "Paid by Someone"}
                    </div>
                  </div>

                  <div
                    className={`text-lg font-bold ${
                      e.isPayment ? "text-positive" : "sub-heading"
                    }`}
                  >
                    ₹{amount.toFixed(2)}
                  </div>
                </div>

                {e.expenseShare && e.expenseShare.length > 0 && (
                  <details className="mt-2 text-sm">
                    <summary className="cursor-pointer muted">
                      View split
                    </summary>
                    <ul className="mt-1 space-y-1">
                      {e.expenseShare.map((s) => (
                        <li key={s.id} className="muted">
                          {safeName(s.user ?? { userId: s.userId })}: ₹
                          {(s.amount ?? 0).toFixed(2)}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => handleDelete(e.id)}
                    className="cursor-pointer text-xs text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
