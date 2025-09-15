"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";

type UserLite = { id: string; name?: string; email?: string };

type Member = {
  id: string;
  userId: string;
  user?: { name?: string; email?: string };
};

type ExpenseCreated = {
  id: string;
  description: string;
  amount: number;
  createdAt: string;
  group?: { id: string; name?: string } | null;
  paidBy?: UserLite | null;
  expenseShare?: Array<{ id: string; userId: string; amount: number }>;
};

type Props = {
  groupId: string;
  onCreated?: (e: ExpenseCreated) => void;
  close: () => void;
};

export default function GroupAddExpense({ groupId, onCreated, close }: Props) {
  const { token, user } = useAuth();
  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const [members, setMembers] = useState<Member[]>([]);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [payerId, setPayerId] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    fetch(`${API}/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load group (${r.status})`);
        const data = await r.json();
        if (!mounted) return;

        type MemberFromApi = {
          id: string;
          userId: string;
          user?: { name?: string; email?: string };
        };

        const m: Member[] = (data.members || []).map((mm: MemberFromApi) => ({
          id: mm.id,
          userId: mm.userId,
          user: mm.user
            ? { name: mm.user.name, email: mm.user.email }
            : undefined,
        }));

        setMembers(m);

        const map: Record<string, string> = {};
        m.forEach((mem) => {
          map[mem.userId] = "";
        });
        setCustomShares(map);

        const currentUserId = (user && (user as UserLite).id) ?? null;
        const found = m.find((x) => x.userId === currentUserId);
        setPayerId(found ? found.userId : m[0]?.userId);
      })
      .catch((err) => {
        console.error("Failed to fetch group members", err);
      });

    return () => {
      mounted = false;
    };
  }, [API, groupId, token, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amt = Number(amount);
    if (!desc.trim()) {
      setError("Description required");
      return;
    }
    if (!isFinite(amt) || amt <= 0) {
      setError("Valid amount required");
      return;
    }
    if (members.length === 0) {
      setError("Group has no members");
      return;
    }

    let shares: Array<{ userId: string; amount: number }>;
    if (splitMode === "equal") {
      const per = Math.round((amt / members.length) * 100) / 100;
      shares = members.map((m) => ({ userId: m.userId, amount: per }));
      const sum = shares.reduce((s, x) => s + x.amount, 0);
      const diff = Math.round((amt - sum) * 100) / 100;
      if (Math.abs(diff) > 0.001)
        shares[0].amount = Math.round((shares[0].amount + diff) * 100) / 100;
    } else {
      shares = members.map((m) => ({
        userId: m.userId,
        amount: Number(customShares[m.userId] || 0),
      }));
      const total = shares.reduce((s, x) => s + x.amount, 0);
      if (Math.abs(total - amt) > 0.01)
        return setError("Custom shares must add up to amount");
    }

    setSubmitting(true);
    try {
      const body: {
        description: string;
        amount: number;
        groupId: string;
        shares: Array<{ userId: string; amount: number }>;
        paidById?: string;
      } = {
        description: desc.trim(),
        amount: Math.round(amt * 100) / 100,
        groupId,
        shares,
      };
      if (payerId) body.paidById = payerId;

      const res = await fetch(`${API}/expenses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);

        throw new Error(
          payload?.error || `Failed to create group expense (${res.status})`
        );
      }

      const created = await res.json();
      if (onCreated) onCreated(created);
      close();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("GroupAddExpense error:", msg);
      setError(msg || "Failed to add group expense");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="relative bg-[var(--card-bg)] rounded p-6 w-full max-w-lg z-10 text-[var(--text)]">
        <h3 className="text-lg font-semibold mb-3">Add Group Expense</h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          {error && <div className="text-sm text-red-600">{error}</div>}

          <div>
            <label className="block text-sm mb-1">Description</label>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Amount</label>
            <input
              value={amount}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              step="0.01"
              className="w-full border p-2 rounded"
            />
          </div>

          <div className="grid grid-cols-2">
            {/* Paid By */}
            <div className="flex items-center justify-center gap-2">
              <label className="">Paid by </label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="border p-[6px] rounded"
              >
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user?.name ?? m.user?.email ?? m.userId}
                  </option>
                ))}
              </select>
            </div>

            {/* Split */}
            <div className="flex items-center justify-center gap-2 -ml-12">
              <label className="">and split</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSplitMode("equal")}
                  className={`p-1 rounded border ${
                    splitMode === "equal"
                      ? "bg-[var(--primary)]"
                      : "bg-gray-100"
                  }`}
                >
                  Equally
                </button>
                <span className="mt-1">or</span>
                <button
                  type="button"
                  onClick={() => setSplitMode("custom")}
                  className={`p-1 rounded border ${
                    splitMode === "custom"
                      ? "bg-[var(--primary)]"
                      : "bg-gray-100"
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>
          </div>

          {splitMode === "custom" && (
            <div>
              <label className="block text-sm mb-1 mt-2">Custom shares</label>
              <div className="space-y-2 mt-2 max-h-48 overflow-auto scrollbar-hide">
                {members.map((m) => (
                  <div key={m.userId} className="space-y-3 mr-2 flex items-center gap-2">
                    <div className="flex-1 items-center justify-center">
                      {m.user?.name ?? m.user?.email ?? m.userId}
                    </div>
                    <span>₹</span>
                    <input
                      value={customShares[m.userId] ?? ""}
                      onChange={(e) =>
                        setCustomShares((s) => ({
                          ...s,
                          [m.userId]: e.target.value,
                        }))
                      }
                      type="number"
                      className="w-32 border p-1 rounded"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-8">
            <button
              type="button"
              onClick={close}
              className="px-3 py-1 rounded border"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary px-4 py-1"
            >
              {submitting ? "Adding..." : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}




// list1
// 1) we have to create toast for success and error  messages
// 2) we will remove arrow from "Who pays whom" then we will make a accordian - Expand and Collapse, the header or the front part will contain "User1 gets back rs(rupees sign) 'Total amount' (this will be from all the members of the group)" and when expended it shows (if one or more user then "user2 owes (total amount) to  user1" and below it "user3 owes (total amount) to user1" and so on.
// 3) why we didnt added edit feature to any create expense or create group and other places where it is needed.
// 4) make a sensible, accessible to all pages of our application and aesthetic
// 5) If someone owes someone less than 1 rs we can ignore that and give zero left.
// 6) explain why only group maker can delete an expense, imagine if I make a group and I make mistake either I should have that edit option which I mentioned before or I should have delete rights so think and add that task on point 6
// 7) Every necessary changes in UI of groups page
// 8) Create one option to delete groups or an option to leave a group. Only group owner can delete (there will always be a risk that if there are no expenses of group leader they may delete it but there can always be other expenses of other users) and if we create a group leave option (there will always be the risk/caution that if leader leaves the group then who will be able to delete any expense)
// 9) changing theme names to icons (small UI changes)
// 10) We need to add a button to simplify debts remember we discussed this feature, we have not added it yet
// 11) /groups/create this page is so blend no icons no proper UI implementation nothing so we need to work on this really hard.
// 12) /groups/create on this page only if I just name the group and press enter or create group button it just creates a group with logged in user (feature we added that logged in user should automatically the part of group) which is not usable I guess because only with owner what will be the use. So I am thinking to again give a edit option if by chance a user creates a group with himself then they can add later any member. I mean dont just take this example in general it should be a feature for example i made a group with 3 friends then I again needed to add 2 more friends, right now we do not any options.
// 13) on expenses page when we open modal to create expense why its UI so bad its translucent input fields do not match to theme and text is all dark in dark mode.
// 14) logic on create expense modal is all wrong when you create an expense from there for a group. What it is doing is that suppose there is a group name test and there are three members a (owner of group), b, c. b owes to a 100, b owes to c 100. Now when we add expense from expense modal on expense page so it does add an expense to other users, here just need you to check my logic before giving answers or solutions. 
// 10) We need to add a button to simplify debts remember we discussed this feature, we have not added it yet
// 11) /groups/create this page is so blend no icons no proper UI implementation nothing so we need to work on this really hard.
// 12) /groups/create on this page only if I just name the group and press enter or create group button it just creates a group with logged in user (feature we added that logged in user should automatically the part of group) which is not usable I guess because only with owner what will be the use. So I am thinking to again give a edit option if by chance a user creates a group with himself then they can add later any member. I mean dont just take this example in general it should be a feature for example i made a group with 3 friends then I again needed to add 2 more friends, right now we do not any options.
// 13) on expenses page when we open modal to create expense why its UI so bad its translucent input fields do not match to theme and text is all dark in dark mode.
// 14) logic on create expense modal is all wrong when you create an expense from there for a group. What it is doing is that suppose there is a group name test and there are three members a (owner of group), b, c. b owes to a 100, b owes to c 100. Now when we add expense from expense modal on expense page so it does add an expense to other users, here just need you to check my logic before giving answers or solutions. 
// 15) adding project to github
// 16) hosting the application
// 17) name, logo and more ideas
// 18) we also need a feature to record payments made by one user to another user for example if I paid 100 for my friend A and he pays me back the amount now we have to record this payment made by A to me. This will be done manually as we do in splitwise and maybe after sometime add a payment gateway to payment and record directly from there. User have to come to website and we will provide an option "settle up" => "record payment" => "payment made to user" then we will settle that payment automatically on groups/:id page, expenses page and wherever  needed so add those places in the list as well.
// 19) i need ideas to handle personal expenses page. What if a user makes 10s of expenses daily it will be a long list very soon. we have to handle this somehow, my ideas make record of pages as per date so it wont be cluttered at one place and obviously open to other better ideas.
// 20) implementation this idea(if we get users we will do this) - We will give users only 50 expenses to add per month and then we will make them pay to add more expenses per month like a subscription model. Same for groups we will limit them to total of 10 groups maybe less until they pay a small amount.


// Caught one more glitch or whatever add this in task list we will do it later assign it priority and return me the list with remaining task only but do this after completing the accordian code and whatever we discussed above. So if a paid for b 200 and afterwards b pays for a 200 then balances equal each other (perfectly fine) but the error comes in expenseList it is removing the expenses as balance gets cleared automatically. I think we should keep the list of expenses no matter if balances are settled or not, so we have to correct this. 
// One more task we will reduce the size how each expense looks in expenseList we will make each expense clickable which then shows all the details related to it.
// In balances it is not following the rule of if balance < 1 ignore it.

// If b makes a expense record which involes only a and not c but the shares are equal then right not we do not handle this logic, on click equally/equal shares we need to add an option/tab like feature in custom shares modal only if a user clicks on equal shares a modal opens (default equally) with two options/tabs above which says equally and custom (on custom default if user presses custom shares option). In equally you get to select which users to put in equal share and custom shares work same but a small twig (If b is not involved in an expense and the expense is between a and c, if a is creating that expense then they have to write 0 in b to not involve him. And in expense list we see b as 0 which is not right. We can implement a logic if unequal/custom shares and a user's share is 0 then we can show 'not involved').