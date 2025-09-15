"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

type Settlement = {
  fromId: string;
  fromName?: string | null;
  toId: string;
  toName?: string | null;
  amount: number;
};

// type ApiResponse = {
//   balances: { userId: string; name?: string | null; balance: number }[];
//   settlementsRaw: Settlement[];
//   settlementsSimplified: Settlement[];
// };

type Props = {
  groupId: string;
  refreshKey?: number;
  onDone?: () => void; // just a signal to parent
};

// type Balance = { userId: string; name?: string | null; balance: number };

export default function SettleUp({ groupId, refreshKey, onDone }: Props) {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  //   const [balances, setBalances] = useState<Balance[]>([]);
  const [raw, setRaw] = useState<Settlement[]>([]);
  const [simplified, setSimplified] = useState<Settlement[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  const currentUserId = user?.id ?? null;

  // read global simplify setting (single source of truth)
  const readSimplify = () => {
    try {
      return localStorage.getItem("simplifyDebts") === "true";
    } catch {
      return false;
    }
  };

  const [simplify] = useState<boolean>(readSimplify());

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    const controller = new AbortController();

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API}/groups/${groupId}/settlements`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          const p = await res.json().catch(() => null);
          throw new Error(p?.error || `Failed to load (${res.status})`);
        }
        const payload = await res.json();
        if (!mounted) return;

        // setBalances(payload.balances || []);
        setRaw(payload.settlementsRaw || []);
        setSimplified(payload.settlementsSimplified || []);
        setSelected({}); // reset
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Failed to load settle-up data"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [API, groupId, token, onDone, refreshKey]);

  if (!token) return <div className="text-gray-600">Please log in</div>;
  if (loading) return <div className="text-gray-600">Loading settle-up...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  // choose which settlement list to use (respect global toggle)
  const settlements = simplify ? simplified : raw;

  // Filter settlements
  const myDebts = settlements.filter(
    (s) => s.fromId === currentUserId && s.amount >= 1
  );
  const myCredits = settlements.filter(
    (s) => s.toId === currentUserId && s.amount >= 1
  );

  // helper to build a stable id for each settlement row
  const rowId = (s: Settlement) => `${s.fromId}_${s.toId}_${s.amount}`;

  const toggleRow = (s: Settlement) => {
    const id = rowId(s);
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConfirm = async () => {
    // Build payments where current user is the payer (from)
    const payments = myDebts
      .filter((s) => selected[rowId(s)])
      .map((s) => ({
        toId: s.toId,
        amount: s.amount,
        note: `Settle up`,
      }));

    if (payments.length === 0) {
      return alert("Select at least one debt to record payment.");
    }

    try {
      setLoading(true);

      const res = await fetch(`${API}/groups/${groupId}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ payments }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          payload?.error || `Failed to record payments (${res.status})`
        );
      }

    //   await res.json();
      // success — you can show toast here
      // reset selected and refresh parent
      setSelected({});

      if (typeof onDone === "function") {
      // pass updated payload to parent so it can immediately refresh using returned data
      onDone();
    } else {
      // fallback: update local state or re-fetch
      // (you can set a local key to trigger refetch)
      window.location.reload(); // last resort (but prefer onDone)
    }
    //   if (onDone) onDone();
      // also reload local data
      // simple approach: refresh page data by re-calling effect (use onDone or force)
      // we'll just reload the component data by toggling a local key:
      //   window.location.reload(); // simple guaranteed refresh; you can replace with a finer refresh later
    } catch (err: unknown) {
      console.error("SettleUp confirm error:", err);
      alert(err instanceof Error ? err.message : "Failed to record payments");
    } finally {
      setLoading(false);
    }
  };

  const totalSelected = myDebts.reduce(
    (sum, s) => (selected[rowId(s)] ? sum + s.amount : sum),
    0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Settle Up</h3>
        <div className="text-sm text-gray-500">
          Mode: {simplify ? "Simplified" : "Raw (detailed)"}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
        <h4 className="font-medium mb-2">You owe</h4>
        {myDebts.length === 0 ? (
          <div className="text-sm text-gray-500">
            No debts where you are the payer.
          </div>
        ) : (
          <ul className="space-y-2">
            {myDebts.map((s) => (
              <li
                key={rowId(s)}
                className="flex items-center justify-between gap-4"
              >
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!selected[rowId(s)]}
                    onChange={() => toggleRow(s)}
                    className="accent-indigo-600"
                  />
                  <div>
                    <div className="font-medium">{s.toName ?? s.toId}</div>
                    <div className="text-sm text-gray-500">
                      Amount: ₹{s.amount.toFixed(2)}
                    </div>
                  </div>
                </label>
                <div className="text-sm">{/* optional quick-pay button */}</div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Selected total: ₹{totalSelected.toFixed(2)}
          </div>
          <button
            onClick={handleConfirm}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded disabled:opacity-60"
            disabled={totalSelected <= 0 || loading}
          >
            Confirm Payments
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
        <h4 className="font-medium mb-2">You are owed (view only)</h4>
        {myCredits.length === 0 ? (
          <div className="text-sm text-gray-500">
            Nobody owes you right now.
          </div>
        ) : (
          <ul className="space-y-2">
            {myCredits.map((s, i) => (
              <li key={i} className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{s.fromName ?? s.fromId}</div>
                  <div className="text-sm text-gray-500">
                    Amount: ₹{s.amount.toFixed(2)}
                  </div>
                </div>
                <div className="text-sm text-gray-600">Awaiting payment</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
