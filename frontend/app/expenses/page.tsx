"use client";

import { useEffect, useMemo, useState } from "react";
import { FiTrash2 } from "react-icons/fi";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ToastProvider";

type User = { id: string; name?: string; email?: string };
type Group = { id: string; name: string };
type Expense = {
  id: string;
  description: string;
  amount: number;
  createdAt: string;
  group?: Group | null;
  paidBy?: User | null;
};

export default function ExpensesPage() {
  const { token, isReady } = useAuth();
  const toast = useToast();
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI: segmented control mode
  const [mode, setMode] = useState<"all" | "personal" | "group">("all");

  // modal for adding expense
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState<"personal" | "group">("personal");
  const [addDescription, setAddDescription] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addGroupId, setAddGroupId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // fetch all expenses & groups (for group select)
  useEffect(() => {
    if (!isReady) return;
    if (!token) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const fetchAll = async () => {
      setLoading(true);
      setError(null);
      try {
        // expenses for logged in user (server returns array of expenses)
        const res = await fetch(`${API}/expenses`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(
            payload?.error || `Failed to fetch expenses (${res.status})`
          );
        }
        const data: Expense[] = await res.json();
        setExpenses(data || []);

        try {
          const gr = await fetch(`${API}/groups`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          if (gr.ok) {
            const groupsData = await gr.json();
            setGroups(
              (groupsData || []).map((g: Group) => ({ id: g.id, name: g.name }))
            );
          } else {
            setGroups([]);
          }
        } catch (gErr) {
          if (gErr instanceof Error && gErr.name === "AbortError") {
            // ignore abort
          } else {
            console.warn("Failed to load groups:", gErr);
            setGroups([]);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("Fetch expenses error:", err);
        setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    return () => controller.abort();
  }, [token, isReady, API]);

  // Derived lists
  const personalExpenses = useMemo(
    () => expenses.filter((e) => !e.group),
    [expenses]
  );
  const groupExpenses = useMemo(
    () => expenses.filter((e) => !!e.group),
    [expenses]
  );

  // Totals
  const totalPaid = useMemo(
    () => expenses.reduce((s, e) => s + e.amount, 0),
    [expenses]
  );
  const totalPersonal = useMemo(
    () => personalExpenses.reduce((s, e) => s + e.amount, 0),
    [personalExpenses]
  );
  const totalGroups = useMemo(
    () => groupExpenses.reduce((s, e) => s + e.amount, 0),
    [groupExpenses]
  );

  // Breakdown per group
  const totalsByGroup = useMemo(() => {
    const map = new Map<string, { id: string; name: string; total: number }>();
    for (const e of groupExpenses) {
      const g = e.group!;
      const existing = map.get(g.id);
      if (!existing) map.set(g.id, { id: g.id, name: g.name, total: e.amount });
      else existing.total += e.amount;
    }
    return Array.from(map.values());
  }, [groupExpenses]);

  // new expense handler
  const handleAdd = async (ev?: React.FormEvent) => {
    ev?.preventDefault();
    setFormError(null);

    const desc = addDescription?.trim() || "";
    if (!desc) {
      setFormError("Please enter a description.");
      return;
    }

    const amt = Number(addAmount);
    if (!isFinite(amt) || amt <= 0) {
      setFormError("Please enter a valid amount greater than 0.");
      return;
    }

    if (addType === "group" && !addGroupId) {
      setFormError("Select a group for group expenses.");
      return;
    }

    setSubmitting(true);
    try {
      const body: {
        description: string;
        amount: number;
        groupId?: string | null;
      } = {
        description: desc,
        amount: amt,
      };
      // only set groupId when it's a group expense
      if (addType === "group") {
        body.groupId = addGroupId || null;
      } else {
        body.groupId = null;
      }

      const res = await fetch(`${API}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        // try to show the server's error message
        const payload = await res.json().catch(() => null);
        throw new Error(
          (payload && payload.error) ||
            `Failed to create expense (${res.status})`
        );
      }

      // refresh list
      const created = await res.json();
      setExpenses((prev) => [created, ...prev]);
      // clear form
      setAddDescription("");
      setAddAmount("");
      setAddGroupId(null);
      setShowAdd(false);
    } catch (err: unknown) {
      console.error("Add expense error:", err);
      setFormError(
        err instanceof Error ? err.message : "Failed to add expense"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;

    try {
      const res = await fetch(`${API}/expenses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Delete failed");
      }
      setExpenses((prev) => prev.filter((p) => p.id !== id));

      toast.push({
        type: "success",
        title: "Deleted",
        message: "Expense deleted successfully",
      });
    } catch (err) {
      // console.error("Delete expense error:", err);
      toast.push({
        type: "error",
        title: "Error",
        message: (err as Error).message || "Failed to delete expense",
      });
    }
  };

  // Which list to display
  const displayed =
    mode === "all"
      ? expenses
      : mode === "personal"
      ? personalExpenses
      : groupExpenses;

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <header className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Expenses</h1>

          <div className="flex items-center gap-3">
            <div className="rounded overflow-hidden flex border">
              <button
                onClick={() => setMode("all")}
                className={`px-4 py-2 transition-all duration-300 ease-in-out ${
                  mode === "all"
                    ? "bg-[var(--primary)] text-white selected"
                    : "text-[var(--text)]"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setMode("personal")}
                className={`px-4 py-2 transition-all duration-300 ease-in-out ${
                  mode === "personal"
                    ? "bg-[var(--primary)] text-white selected"
                    : "text-[var(--text)]"
                }`}
              >
                Personal
              </button>
              <button
                onClick={() => setMode("group")}
                className={`px-4 py-2 transition-all duration-300 ease-in-out ${
                  mode === "group"
                    ? "bg-[var(--primary)] text-white selected"
                    : "text-[var(--text)]"
                }`}
              >
                Group
              </button>
            </div>

            <button
              onClick={() => {
                setShowAdd(true);
                setAddType(mode === "group" ? "group" : "personal");
              }}
              className="btn-primary"
            >
              + Add Expense
            </button>
          </div>
        </header>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="text-sm muted">Total Paid</div>
            <div className="text-lg font-semibold">₹{totalPaid.toFixed(2)}</div>
          </div>
          <div className="card p-4">
            <div className="text-sm muted">Personal</div>
            <div className="text-lg font-semibold text-negative">
              ₹{totalPersonal.toFixed(2)}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-sm muted">In Groups</div>
            <div className="text-lg font-semibold text-positive">
              ₹{totalGroups.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Group breakdown */}
        <div>
          <h2 className="font-semibold mb-2">Group breakdown</h2>
          {totalsByGroup.length === 0 ? (
            <div className="text-sm muted">No group expenses yet.</div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {totalsByGroup.map((g) => (
                <div
                  key={g.id}
                  className="card p-3 flex justify-between items-center"
                >
                  <div>{g.name}</div>
                  <div className="font-semibold">₹{g.total.toFixed(2)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* List */}
        <div>
          {loading ? (
            <div>Loading...</div>
          ) : error ? (
            <div className="text-red-500">{error}</div>
          ) : displayed.length === 0 ? (
            <div className="text-gray-500">No expenses found.</div>
          ) : (
            <ul className="space-y-3">
              {displayed.map((e) => (
                <li
                  key={e.id}
                  className="card p-3 flex justify-between items-start"
                >
                  <div>
                    <div className="font-semibold">{e.description}</div>
                    <div className="text-sm muted">
                      {new Date(e.createdAt).toLocaleString()}{" "}
                      {e.group ? `• ${e.group.name}` : "• Personal"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-lg font-bold">
                      ₹{e.amount.toFixed(2)}
                    </div>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="text-sm text-red-600 cursor-pointer"
                    >
                      <FiTrash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowAdd(false)}
            />
            <div className="relative card rounded p-6 w-full max-w-md z-10">
              <h3 className="text-lg font-semibold mb-3">Add Expense</h3>
              <form onSubmit={handleAdd} className="space-y-3">
                <div>
                  {/* <label className="block text-sm">Type</label> */}
                  <div className="flex gap-2 mt-1">
                    <label
                      className={`px-3 py-1 rounded ${
                        addType === "personal"
                          ? "bg-[var(--primary)] text-white"
                          : "bg-gray-100"
                      }`}
                    >
                      <input
                        className="hidden"
                        type="radio"
                        name="type"
                        checked={addType === "personal"}
                        onChange={() => setAddType("personal")}
                      />
                      Personal
                    </label>
                    <label
                      className={`px-3 py-1 rounded ${
                        addType === "group"
                          ? "bg-[var(--primary)] text-white"
                          : "bg-gray-100"
                      }`}
                    >
                      <input
                        className="hidden"
                        type="radio"
                        name="type"
                        checked={addType === "group"}
                        onChange={() => setAddType("group")}
                      />
                      Group
                    </label>
                  </div>
                </div>

                {addType === "group" && (
                  <div>
                    <label className="block text-sm">Select Group</label>
                    <select
                      value={addGroupId ?? ""}
                      onChange={(e) => setAddGroupId(e.target.value || null)}
                      className="w-full border p-2 rounded mt-1"
                    >
                      <option value="">-- Select group --</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm">Description</label>
                  <input
                    className="w-full border p-2 rounded mt-1"
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm">Amount</label>
                  <input
                    className="w-full border p-2 rounded mt-1"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    type="number"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAdd(false)}
                    className="px-3 py-1 rounded border"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary px-4 py-1"
                  >
                    {submitting ? "Adding..." : "Add"}
                  </button>
                </div>
                {formError && (
                  <div className="text-sm text-red-600 mb-2">{formError}</div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
