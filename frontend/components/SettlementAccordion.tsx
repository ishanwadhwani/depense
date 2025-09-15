"use client";

import { useState } from "react";

type Settlement = {
  fromId: string;
  fromName?: string;
  toId: string;
  toName?: string;
  amount: number; // always a number
};

type MemberBalance = {
  userId: string;
  name?: string;
  balance: number;
};

type Props = {
  member: MemberBalance;
  settlements: Settlement[]; // force non-optional
};

export default function SettlementAccordion({ member, settlements }: Props) {
  const [open, setOpen] = useState(false);

  const net = member.balance ?? 0;

  // collect all settlements involving this member
  const details = (settlements || []).filter(
    (d) => d.fromId === member.userId || d.toId === member.userId
  );

  return (
    <details
      open={open}
      onToggle={() => setOpen(!open)}
      className="bg-white dark:bg-gray-800 rounded-lg shadow p-3"
    >
      <summary className="cursor-pointer font-semibold text-gray-800 dark:text-gray-100 flex justify-between">
        <span>{member.name ?? member.userId}</span>
        <span
          className={
            net >= 0
              ? "text-positive"
              : "text-negative"
          }
        >
          {net >= 0
            ? `should receive ₹${net.toFixed(2)}`
            : `owes ₹${Math.abs(net).toFixed(2)}`}
        </span>
      </summary>

      <ul className="mt-2 space-y-2 text-gray-600 dark:text-gray-300">
        {details.length === 0 ? (
          <li className="text-sm text-gray-400">No transactions.</li>
        ) : (
          details.map((d, i) => {
            const owes = d.fromName || d.fromId;
            const receives = d.toName || d.toId;

            return (
              <li
                key={i}
                className="flex justify-between items-center text-sm"
              >
                <span>
                  {owes} owes {receives}
                </span>
                <span className="font-semibold">
                  ₹{(d.amount ?? 0).toFixed(2)}
                </span>
              </li>
            );
          })
        )}
      </ul>
    </details>
  );
}
