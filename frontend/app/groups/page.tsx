"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import ProtectedRoute from "@/components/ProtectedRoute";

interface Group {
  id: string;
  name: string;
  members?: [];
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:4000/groups", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch groups, try again after sometime.");
        }

        const data = await res.json();
        setGroups(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unknown error occurred.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  return (
    <ProtectedRoute>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl">Your Groups</h1>
          <Link
            href="/groups/create"
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Create Group
          </Link>
        </div>

        {loading && <p>Loading groups...</p>}
        {error && <p className="text-red-500">{error}</p>}

        {!loading && groups.length === 0 && (
          <p className="text-gray-500">You are not part of any groups yet.</p>
        )}

        <ul className="space-y-3">
          {groups.map((g) => (
            <li
              key={g.id}
              className="p-4 bg-white rounded shadow hover:shadow-md"
            >
              <Link href={`/group/${g.id}`} className="block">
                <div className="font-semibold">{g.name}</div>
                <div className="text-sm text-gray-500">
                  {g.members?.length || 0} members
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </ProtectedRoute>
  );
}
