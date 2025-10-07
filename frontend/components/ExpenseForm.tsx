"use client";

import React, { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import type { Expense } from "./ExpensesList";

type MemberForForm = { userId: string; name?: string };

type Props = {
  groupId: string;
  members: MemberForForm[]; // list of group members (userId + name)
  onCreated?: (e: Expense) => void;
};

export default function ExpenseForm({ groupId, members, onCreated }: Props) {
  const { token } = useAuth();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [splitEqual, setSplitEqual] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // memoized equal shares (rounded to 2 decimals, adjust first for rounding diff)
  const equalShares = useMemo(() => {
    const amt = Number(amount);
    if (!isFinite(amt) || amt <= 0) return [];
    const perRaw = amt / members.length;
    const per = Math.round(perRaw * 100) / 100;
    const shares = members.map((m) => ({ userId: m.userId, amount: per }));
    const sum = shares.reduce((s, x) => s + x.amount, 0);
    const diff = Math.round((amt - sum) * 100) / 100;
    if (Math.abs(diff) > 0.0001) {
      shares[0].amount = Math.round((shares[0].amount + diff) * 100) / 100;
    }
    return shares;
  }, [amount, members]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    const amt = Number(amount);
    if (!description.trim()) {
      setError("Description required");
      return;
    }
    if (!isFinite(amt) || amt <= 0) {
      setError("Valid amount required");
      return;
    }

    setSubmitting(true);
    try {
      const body: {
        description: string;
        amount: number;
        groupId: string;
        shares?: { userId: string; amount: number }[];
      } = {
        description: description.trim(),
        amount: Math.round(amt * 100) / 100,
        groupId,
      };

      if (splitEqual) {
        body.shares = equalShares;
      } else {
        // simple group expense (no shares array)
        // backend will store groupId and paidById via token
      }

      const res = await fetch(`${API}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || `Failed to create expense (${res.status})`);
      }

      const created = (await res.json()) as Expense;
      if (onCreated) onCreated(created);
      
      setDescription("");
      setAmount("");
      setSplitEqual(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div>
        <label className="block text-sm mb-1">Description</label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border p-2 rounded"
          placeholder="e.g. Dinner at cafe"
        />
      </div>

      <div>
        <label className="block text-sm mb-1">Amount</label>
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          type="number"
          step="0.01"
          className="w-full border p-2 rounded"
        />
      </div>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={splitEqual} onChange={(e) => setSplitEqual(e.target.checked)} />
          <span className="text-sm">Split equally among {members.length} members</span>
        </label>
      </div>

      {splitEqual && (
        <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
          Equal share preview:
          <ul className="mt-2 space-y-1">
            {equalShares.map((s) => {
              const name = members.find((m) => m.userId === s.userId)?.name ?? s.userId;
              return (
                <li key={s.userId} className="flex justify-between">
                  <div>{name}</div>
                  <div>₹{s.amount.toFixed(2)}</div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button type="button" onClick={() => { setDescription(""); setAmount(""); setSplitEqual(false); }} className="px-3 py-1 rounded border">Clear</button>
        <button type="submit" disabled={submitting} className="btn-primary px-4 py-1">
          {submitting ? "Saving..." : "Add"}
        </button>
      </div>
    </form>
  );
}
