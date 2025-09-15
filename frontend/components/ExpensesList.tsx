"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

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

type Props = {
  groupId?: string;
  initialItems?: Expense[];
  onItemsChange?: (items: Expense[]) => void;
  refreshKey?: number;
};

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
        // when groupId is present the server already returned only group expenses
        const filtered = groupId ? data : data;
        setItems(filtered);
        if (onItemsChange) setTimeout(() => onItemsChange(filtered), 0);
        // const res = await fetch(`${API}/expenses`, {
        //   headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        //   signal: controller.signal,
        // });
        // if (!res.ok) {
        //   const payload = await res.json().catch(() => null);
        //   throw new Error(
        //     payload?.error || `Failed to load expenses (${res.status})`
        //   );
        // }
        // const data = (await res.json()) as Expense[];
        // if (!mounted) return;

        // const filtered = groupId
        //   ? data.filter((e) => e.group?.id === groupId)
        //   : data;
        // setItems(filtered);
        // if (onItemsChange) setTimeout(() => onItemsChange(filtered), 0);
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
          {/* {items.map((e) => (
            <li
              key={e.id}
              className="card p-3 flex justify-between items-start"
            >
              <div>
                <div className="font-semibold">{e.description}</div>
                <div className="text-sm muted">
                  {new Date(e.createdAt).toLocaleString()} •{" "}
                  {e.group ? e.group.name : "Personal"}{" "}
                  {e.paidBy
                    ? `• Paid by ${
                        e.paidBy.name ?? e.paidBy.email ?? e.paidBy.id
                      }`
                    : ""}
                </div>
                {e.expenseShare && e.expenseShare.length > 0 && (
                  <div className="text-sm mt-1">
                    Shares:
                    {e.expenseShare.map((s) => (
                      <span key={s.id} className="mr-2 text-xs text-gray-600">
                        {(s.user && (s.user.name ?? s.user.email)) ?? s.userId}: ₹{s.amount}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-lg font-bold">₹{e.amount.toFixed(2)}</div>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="text-sm text-red-600 hover:underline"
                  aria-label={`Delete expense ${e.description}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))} */}
          {/* {items.map((e) => (
            <li
              key={e.id}
              className="p-4 bg-white dark:bg-gray-800 rounded shadow"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">
                    {e.isPayment
                      ? `💸 Payment: ${e.paidBy?.name ?? "Someone"} → ${
                          e.expenseShare?.[0]?.user?.name ?? "Someone"
                        }`
                      : e.description}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(e.createdAt).toLocaleDateString()}{" "}
                    {e.group ? `• Group: ${e.group.name}` : "• Personal"}
                  </div>
                </div>
                <div className="text-lg font-bold">₹{e.amount}</div>
              </div>
            </li>
          ))} */}
          {items
            .slice()
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
            .map((e) => (
              <li
                key={e.id}
                className="p-4 bg-white dark:bg-gray-800 rounded shadow"
              >
                <div className="flex justify-between items-center">
                  <div>
                    {e.isPayment ? (
                      <>
                        <div className="font-semibold flex items-center gap-2">
                          💸 Payment
                        </div>
                        <div className="text-sm text-gray-500">
                          {e.paidBy?.name ?? "Someone"} →{" "}
                          {e.expenseShare?.[0]?.user?.name ?? "Someone"}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-semibold">{e.description}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(e.createdAt).toLocaleDateString()}{" "}
                          {e.group ? `• Group: ${e.group.name}` : "• Personal"}{" "}
                          {e.paidBy
                            ? `• Paid by ${
                                e.paidBy.name ?? e.paidBy.email ?? e.paidBy.id
                              }`
                            : ""}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div className="text-lg font-bold">
                      ₹
                      {typeof e.amount === "number"
                        ? e.amount.toFixed(2)
                        : "0.00"}
                    </div>
                    {!e.isPayment && (
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="text-sm text-red-600 hover:underline"
                        aria-label={`Delete expense ${e.description}`}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {/* Normal expense shares */}
                {!e.isPayment &&
                  e.expenseShare &&
                  e.expenseShare.length > 0 && (
                    <div className="text-sm mt-1">
                      Shares:
                      {e.expenseShare.map((s) => (
                        <span key={s.id} className="mr-2 text-xs text-gray-600">
                          {(s.user && (s.user.name ?? s.user.email)) ??
                            s.userId}
                          : ₹{s.amount}
                        </span>
                      ))}
                    </div>
                  )}
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
