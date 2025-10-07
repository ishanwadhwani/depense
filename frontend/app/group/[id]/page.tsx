"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { RiBillLine } from "react-icons/ri";

import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Settlements from "@/components/Settlements";
import ExpensesList from "@/components/ExpensesList";
import GroupAddExpense from "@/components/GroupAddExpense";
import RecordPayment from "@/components/RecordPayment";
import { Expense, Member, Group, MemberFromApi } from "@/utils/types";

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params?.id as string | undefined;
  const { token, isReady } = useAuth();

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "expenses" | "settlements" | "settleup"
  >("settlements");
  const [refreshKey, setRefreshKey] = useState(0);

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    if (!isReady) return;

    if (isReady && !token) {
      router.push("/auth/login");
      return;
    }

    if (!groupId) {
      setLoadError("Invalid group id");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let mounted = true;

    const fetchGroupAndExpenses = async () => {
      setLoading(true);
      setLoadError(null);

      try {
        // fetch group (includes members)
        const res = await fetch(`${API}/groups/${groupId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          signal: controller.signal,
        });

        if (res.status === 401) {
          router.push("/auth/login");
          return;
        }

        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(
            payload?.error || `Failed to load group (${res.status})`
          );
        }

        const data = await res.json();
        if (!mounted) return;

        const members: Member[] = (data.members ?? []).map(
          (mm: MemberFromApi) => ({
            id: mm.id,
            userId: mm.userId,
            user: mm.user
              ? { name: mm.user.name, email: mm.user.email }
              : undefined,
          })
        );

        // const loadedGroup: Group = { id: data.id, name: data.name, members };
        setGroup({ id: data.id, name: data.name, members });
        setExpenses(data.expenses ?? []);

        //all user-created expenses and filter by groupId
        // const userExpRes = await fetch(`${API}/expenses`, {
        //   headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        //   signal: controller.signal,
        // });

        // if (userExpRes.ok) {
        //   const expData: Expense[] = await userExpRes.json();
        //   if (!mounted) return;
        //   setExpenses(expData);
        // } else {
        // const allExpenses = (await userExpRes.json()) as Expense[];
        // setExpenses(allExpenses.filter((e) => e.group?.id === groupId));
        //   setExpenses([]);
        // }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        const msg = err instanceof Error ? err.message : "Failed to load group";
        console.error("GroupDetail fetch error:", msg);
        if (mounted) setLoadError(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchGroupAndExpenses();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [groupId, token, isReady, API, router]);

  const handleGroupExpenseCreated = (created: Expense) => {
    setExpenses((prev) => [created, ...prev]);
    setRefreshKey((k) => k + 1);
  };

  const handlePaymentDone = (newPayment?: Expense) => {
    if (newPayment) {
      setExpenses((prev) => [newPayment, ...prev]);
    }
    setRefreshKey((k) => k + 1);
  };

  if (!isReady) {
    return (
      <ProtectedRoute>
        <div className="p-6 text-gray-600">Checking authentication...</div>
      </ProtectedRoute>
    );
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-6 text-gray-600">Loading group...</div>
      </ProtectedRoute>
    );
  }

  if (loadError) {
    return (
      <ProtectedRoute>
        <div className="p-6 text-red-500">Error: {loadError}</div>
      </ProtectedRoute>
    );
  }

  if (!group) {
    return (
      <ProtectedRoute>
        <div className="p-6">Group not found</div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">{group.name}</h1>
            <div className="text-sm muted">
              {(group.members ?? []).length} members
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/groups")}
              className="px-3 py-[6px] rounded border hover:border-gray-500 bg-[var(--card-bg)] text-[var(--text)] cursor-pointer"
            >
              Groups
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 btn-primary cursor-pointer"
            >
              <RiBillLine /> <span className="mb-[2px]">Add Expense</span>
            </button>
          </div>
        </div>

        <div
          className="flex gap-5 border-b border-gray-300 dark:border-gray-700 mb-4
        transition-all duration-700 ease-in-out"
        >
          <button
            className={`pb-2 ${
              activeTab === "settlements"
                ? "border-b-2 border-indigo-500 font-semibold"
                : "text-gray-500 dark:text-gray-400"
            }`}
            onClick={() => setActiveTab("settlements")}
          >
            Settlements
          </button>
          <button
            className={`pb-2 ${
              activeTab === "expenses"
                ? "border-b-2 border-indigo-500 font-semibold"
                : "text-gray-500 dark:text-gray-400"
            }`}
            onClick={() => setActiveTab("expenses")}
          >
            Expenses
          </button>
          <button
            className={`pb-2 ${
              activeTab === "settleup"
                ? "border-b-2 border-indigo-500 font-semibold"
                : "text-gray-500 dark:text-gray-400"
            }`}
            onClick={() => setActiveTab("settleup")}
          >
            Record Payments
          </button>
        </div>

        {activeTab === "expenses" && (
          <div>
            <ExpensesList
              groupId={group.id}
              initialItems={expenses}
              onItemsChange={(it) => {
                setExpenses(it);
                setRefreshKey((k) => k + 1); // keep settlements in sync
              }}
              // refreshKey={refreshKey}
            />
          </div>
        )}

        {activeTab === "settlements" && (
          <div>
            <Settlements groupId={group.id} refreshKey={refreshKey} />
          </div>
        )}

        {activeTab === "settleup" && (
          <div>
            <RecordPayment
              groupId={group.id}
              refreshKey={refreshKey}
              onDone={handlePaymentDone}
            />
          </div>
        )}
      </div>

      {/* // <div className="grid md:grid-cols-2 gap-6">
        //   <div>
        //     <h2 className="text-lg font-semibold mb-3">Settlements</h2>
        //     <Settlements groupId={group.id} refreshKey={settlementRefreshKey} />
        //   </div>

        //   <div className="max-h-[600px] overflow-y-auto scrollbar-hide">
        //     <h2 className="text-lg font-semibold mb-3">Expenses</h2>
        //     <ExpensesList
        //       groupId={group.id}
        //       initialItems={expenses}
        //       onItemsChange={(it) => {
        //         setExpenses(it);
        //         setSettlementRefreshKey((k) => k + 1);
        //       }}
        //     />
        //   </div>
        // </div> */}

      {showAddModal && (
        <GroupAddExpense
          groupId={group.id}
          close={() => setShowAddModal(false)}
          onCreated={handleGroupExpenseCreated}
        />
      )}
    </ProtectedRoute>
  );
}
