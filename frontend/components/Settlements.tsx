"use client";

import React, { useEffect, useState } from "react";
import { PiCirclesThreeLight } from "react-icons/pi";

import { useAuth } from "@/context/AuthContext";
import SettlementAccordion from "./SettlementAccordion";

type Balance = {
  userId: string;
  name?: string;
  balance: number;
};

type Settlement = {
  fromId: string;
  fromName?: string;
  toId: string;
  toName?: string;
  amount: number;
};

type ApiResponse = {
  group?: string;
  balances?: Balance[];
  // settlements?: Settlement[];
  settlementsRaw: Settlement[];
  settlementsSimplified: Settlement[];
};

type Props = {
  groupId: string;
  refreshKey?: number;
};

const ChevronIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${
      isOpen ? "rotate-180" : "rotate-0"
    }`}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m19.5 8.25-7.5 7.5-7.5-7.5"
    />
  </svg>
);

export default function Settlements({ groupId, refreshKey }: Props) {
  const { token, user } = useAuth();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [simplify, setSimplify] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("simplifyDebts");
      return saved === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem("simplifyDebts", simplify.toString());
  }, [simplify]);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  // const currentUserId: string | null = user ? user.id : null;

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    const controller = new AbortController();

    const fetchSettlements = async () => {
      setLoading(true);
      setError(null);
      try {
        // const res = await fetch(
        //   `${API}/groups/${groupId}/settlements${
        //     simplify ? "?simplify=true" : ""
        //   }`,
        //   {
        //     headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        //     signal: controller.signal,
        //   }
        // );
        const res = await fetch(`${API}/groups/${groupId}/settlements`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(
            payload?.error || `Failed to load settlements (${res.status})`
          );
        }

        const payload = (await res.json()) as ApiResponse;
        if (!mounted) return;
        setData({
          balances: payload.balances || [],
          settlementsRaw: payload.settlementsRaw || [],
          settlementsSimplified: payload.settlementsSimplified || [],
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(
          err instanceof Error ? err.message : "Failed to load settlements"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSettlements();
    return () => {
      mounted = false;
      controller.abort();
    };
  }, [API, groupId, token, refreshKey]);

  const currentSettlements: Settlement[] = simplify
    ? data?.settlementsSimplified ?? []
    : data?.settlementsRaw ?? [];

  if (loading) {
    return <div className="text-gray-600">Loading settlements...</div>;
  }

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  if (!data) {
    return <div className="text-gray-500">No settlements 🎉</div>;
  }

  const visibleSettlements = currentSettlements.filter(
    (s) => Math.abs(s.amount) >= 1
  );

  const members = (data.balances ?? []).map((b) => ({
    userId: b.userId,
    name: b.name ?? null,
  }));

  // const settlementsByReceiver: Record<
  //   string,
  //   { receiver?: string | null; total: number; details: Settlement[] }
  // > = {};

  // if (data.settlements) {
  //   for (const s of data.settlements) {
  //     if (s.amount < 1) continue;
  //     if (!settlementsByReceiver[s.toId]) {
  //       settlementsByReceiver[s.toId] = {
  //         receiver: s.toName ?? s.toId,
  //         total: 0,
  //         details: [],
  //       };
  //     }
  //     settlementsByReceiver[s.toId].total += s.amount;
  //     settlementsByReceiver[s.toId].details.push(s);
  //   }
  // }

  // const byReceiver: Record<
  //   string,
  //   { receiverName?: string | null; total: number; details: Settlement[] }
  // > = {};
  // for (const s of settlements) {
  //   const toId = s.toId;
  //   byReceiver[toId] = byReceiver[toId] || {
  //     receiverName: s.toName ?? null,
  //     total: 0,
  //     details: [],
  //   };
  //   byReceiver[toId].total += s.amount;
  //   byReceiver[toId].details.push(s);
  // }
  const byReceiver: Record<
    string,
    { receiverName?: string | null; total: number; details: Settlement[] }
  > = {};
  for (const m of members) {
    byReceiver[m.userId] = { receiverName: m.name, total: 0, details: [] };
  }

  for (const s of visibleSettlements) {
    // ensure receiver key exists
    byReceiver[s.toId] = byReceiver[s.toId] || {
      receiverName: s.toName ?? null,
      total: 0,
      details: [],
    };
    byReceiver[s.toId].total = +(byReceiver[s.toId].total + s.amount).toFixed(
      2
    );
    byReceiver[s.toId].details.push(s);
  }

  const currentUserId = user?.id ?? null;
  const myBalance =
    data.balances?.find((b) => b.userId === currentUserId)?.balance ?? 0;

  // const myBalance =
  //   data.balances?.find((b) => b.userId === currentUserId)?.balance ?? 0;

  // backend should give us *both* settlementsRaw and simplified
  const { balances, settlementsRaw, settlementsSimplified } = data;

  // pick which to use
  const settlementsToUse = simplify ? settlementsSimplified : settlementsRaw;

  return (
    <div>
      {/* <div className="mb-3">
        <div className="text-sm muted">Group</div>
        <div className="text-2xl font-semibold">{data.group}</div>
      </div> */}
      {/* <div className="flex justify-end mb-3">
        <button
          onClick={() => setSimplify((prev) => !prev)}
          className="px-4 py-2 text-sm font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {simplify ? "Show Raw Debts" : "Simplify Debts"}
        </button>
      </div> */}

      {/* <div className="flex items-center gap-2">
        <div className="text-sm text-gray-600 mr-3">
          {currentUserId ? (
            myBalance >= 0 ? (
              <span>
                You should get back{" "}
                <span className="font-bold text-green-600">
                  ₹{myBalance.toFixed(2)}
                </span>
              </span>
            ) : (
              <span>
                You owe{" "}
                <span className="font-bold text-red-600">
                  ₹{Math.abs(myBalance).toFixed(2)}
                </span>
              </span>
            )
          ) : null}
        </div>

        <button
          onClick={() => setSimplify((s) => !s)}
          className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
        >
          {simplify ? "Show Raw" : "Simplify"}
        </button>
      </div> */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm sub-heading">
          {currentUserId ? (
            myBalance >= 0 ? (
              <span>
                you are owed{" "}
                <strong className="text-positive">
                  ₹{myBalance.toFixed(2)}
                </strong>
              </span>
            ) : (
              <span>
                you owe{" "}
                <strong className="text-negative">
                  ₹{Math.abs(myBalance).toFixed(2)}
                </strong>
              </span>
            )
          ) : null}
        </div>

        {/* <button
          onClick={() => setSimplify((s) => !s)}
          className="px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-sm"
        >
          {simplify ? "Show Raw" : "Simplify"}
        </button> */}
        <button
          onClick={() => setSimplify((prev) => !prev)}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 ease-in-out cursor-pointer
          ${simplify ? "simplify-btn text-white" : "muted shadow-2xl border"}
        `}
        >
          <PiCirclesThreeLight size={16} />
          <span className="mb-[2px]">Simplify Debts</span>
        </button>
      </div>

      {/* Balances */}
      {/* <div className="mb-4">
        <div className="text-sm font-medium mb-2">Balances</div>
        {data.balances && data.balances.length > 0 ? (
          <ul className="space-y-2">
            {data.balances.map((b) => {
              const isCurrentUser = b.userId === user?.id;
              return (
                <li
                  key={b.userId}
                  className={`flex items-center justify-between ${
                    isCurrentUser ? "" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
                      {b.name
                        ? b.name.charAt(0).toUpperCase()
                        : b.userId.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">
                        {isCurrentUser ? "You" : b.name ?? b.userId}
                      </div>
                    </div>
                  </div>
                  <div
                    className={
                      b.balance >= 0 ? "text-positive" : "text-negative"
                    }
                  >
                    {b.balance >= 0
                      ? `+₹${b.balance.toFixed(2)}`
                      : `-₹${Math.abs(b.balance).toFixed(2)}`}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-sm text-gray-500">No balances yet.</div>
        )}
      </div> */}

      <div className="mx-auto rounded-lg shadow-sm">
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center justify-between w-full p-4 text-left rounded cursor-pointer"
          aria-expanded={isOpen}
          aria-controls="balances-content"
        >
          <div className="text-md font-semibold text-primary">Balances</div>
          <ChevronIcon isOpen={isOpen} />
        </button>

        <div
          id="balances-content"
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isOpen ? "max-h-screen" : "max-h-0"
          }`}
        >
          <div className="p-4">
            {data.balances && data.balances.length > 0 ? (
              <ul className="space-y-3">
                {data.balances.map((b) => {
                  const isCurrentUser = b.userId === user?.id;
                  return (
                    <li
                      key={b.userId}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full profile-image flex items-center justify-center text-sm font-bold">
                          {b.name
                            ? b.name.charAt(0).toUpperCase()
                            : b.userId.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium sub-heading">
                            {isCurrentUser ? "You" : b.name ?? b.userId}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`font-semibold ${
                          b.balance >= 0 ? "text-positive" : "text-negative"
                        }`}
                      >
                        {b.balance >= 0
                          ? `+₹${b.balance.toFixed(2)}`
                          : `-₹${Math.abs(b.balance).toFixed(2)}`}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="text-sm text-gray-500">No balances yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Accordian */}
      {/* <div className="space-y-4">
        {Object.keys(byReceiver).length === 0 ? (
          <div className="text-sm text-gray-500">No settlements to show 🎉</div>
        ) : (
          Object.entries(byReceiver).map(([toId, block]) => (
            <details
              key={toId}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-3"
            >
              <summary className="cursor-pointer font-semibold text-gray-800 dark:text-gray-100">
                {block.receiverName ?? toId} should receive{" "}
                <span className="text-green-600 font-bold">
                  ₹{block.total.toFixed(2)}
                </span>
              </summary>

              <ul className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                {block.details.map((d, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between py-1"
                  >
                    <div>{d.fromName ?? d.fromId} owes</div>
                    <div className="font-semibold">₹{d.amount.toFixed(2)}</div>
                  </li>
                ))}
              </ul>
            </details>
          ))
        )}
      </div> */}

      {/* Accordions per member (receiver/payer) */}
      {/* <div className="space-y-3">
        {members.map((m) => {
          const block = byReceiver[m.userId];
          const total = block ? block.total : 0;
          const details = block ? block.details : [];
          return (
            <SettlementAccordion
              key={m.userId}
              member={{ userId: m.userId, name: m.name }}
              total={total}
              details={details}
              currentUserId={currentUserId}
            />
          );
        })}
      </div> */}
      <div>
        {/* <button
          onClick={() => setSimplify((s) => !s)}
          className="px-3 py-1 bg-blue-600 text-white rounded"
        >
          {simplify ? "Show Raw Debts" : "Simplify Debts"}
        </button> */}

        <div className="space-y-2 mt-4">
          {balances?.map((m) => (
            <SettlementAccordion
              key={m.userId}
              member={m}
              settlements={settlementsToUse || []} // <-- now respects toggle
            />
          ))}
        </div>
      </div>

      {/* <div>
        <div className="text-sm font-medium mb-2">Who pays whom</div>
        {data.settlements && data.settlements.length > 0 ? (
          <ul className="space-y-2">
            {data.settlements.map((s, idx) => (
              <li key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm text-[var(--text)]">
                    {s.fromName
                      ? s.fromName.charAt(0).toUpperCase()
                      : s.fromId.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-sm">
                    <div className="font-medium">{s.fromName ?? s.fromId}</div>
                    <div className="text-xs text-gray-500">pays</div>
                  </div>
                  <div className="mx-2">→</div>
                  <div className="text-sm">
                    <div className="font-medium">{s.toName ?? s.toId}</div>
                    <div className="text-xs text-gray-500">receives</div>
                  </div>
                </div>

                <div className="font-semibold">₹{s.amount.toFixed(2)}</div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-sm text-gray-500">No settlements suggested.</div>
        )}
      </div> */}
    </div>
  );
}
