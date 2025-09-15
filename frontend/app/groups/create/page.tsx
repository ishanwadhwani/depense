"use client";

import { useForm, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiTrash2 } from "react-icons/fi";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ToastProvider";

type MemberField = {
  userId: string;
  name: string;
};

type FormValues = {
  name: string;
  members: MemberField[];
};

export default function CreateGroupPage() {
  const { token } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [searchEmail, setSearchEmail] = useState("");
  const [foundUser, setFoundUser] = useState<{
    id: string;
    name: string;
    email: string;
  } | null>(null);
  const [searching, setSearching] = useState(false);

  const { register, control, handleSubmit } = useForm<FormValues>({
    defaultValues: { name: "", members: [] },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "members",
  });

  const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const handleSearch = async () => {
    setFoundUser(null);
    if (!searchEmail) return;
    try {
      const res = await fetch(
        `${API}/users?email=${encodeURIComponent(searchEmail)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Not found");
      }
      const user = await res.json();
      setFoundUser(user);
    } catch (err: unknown) {
      setFoundUser(null);
      if (err instanceof Error) {
        setServerError(err.message || "Search failed");
      } else {
        setServerError("Search failed");
      }
    }
  };

  const addFoundUserToList = () => {
    if (!foundUser) return;

    if (fields.some((f) => f.userId === foundUser.id)) {
      setServerError("User already added");
      return;
    }
    append({ userId: foundUser.id, name: foundUser.name });
    setFoundUser(null);
    setSearchEmail("");
  };

  const onSubmit = async (data: FormValues) => {
    setServerError(null);
    const memberIds = data.members.map((m) => m.userId).filter(Boolean);
    try {
      const res = await fetch(`${API}/groups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name,
          members: memberIds,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to create group");
      }

      router.push(`/group/${result.id}`);
      toast.push({ 
        type: "success",
        title: "Created",
        message: "Group created successfully 🎉" 
      });
    } catch (err: unknown) {
      console.error(err);
      // if (err instanceof Error) {
      //   setServerError(err.message || "Server error");
      // } else {
      //   setServerError("Server error");
      // }
      toast.push({ 
        type: "error",
        title: "Error",
        message: "Could not create group. Please try again later."
      });
    } finally {
      setSearching(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Create Group</h1>
        </div>

        {serverError && <p className="text-red-500 mb-3">{serverError}</p>}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Group Name</label>
            <input
              {...register("name", { required: true })}
              className="w-full border rounded p-2"
              placeholder="e.g. Weekend Trip"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Add members by email
            </label>
            <div className="flex gap-2">
              <input
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Search by email"
                className="flex-1 border p-2 rounded"
              />
              <button
                type="button"
                onClick={handleSearch}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
                disabled={searching}
              >
                {searching ? "Searching..." : "Search"}
              </button>
            </div>

            {foundUser && (
              <div className="mt-2 p-2 border rounded flex justify-between items-center">
                <div>
                  <div className="font-medium">{foundUser.name}</div>
                  <div className="text-sm text-gray-600">{foundUser.email}</div>
                </div>
                <button
                  type="button"
                  onClick={addFoundUserToList}
                  className="bg-green-600 text-white px-3 py-1 rounded"
                >
                  Add
                </button>
              </div>
            )}
          </div>
          <label className="block text-sm font-medium mb-1">
            Members to add
          </label>
          {fields.length === 0 ? (
            <div>
              <p className="text-xs text-gray-500">
                Add members using search above.
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className="relative bg-gray-100 px-4 py-2 rounded-full flex items-center pr-10 gap-1"
                >
                  <span className="font-medium">{field.name}</span>
                  <button
                    type="button"
                    onClick={() => remove(idx)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 text-red-600 hover:text-red-800 p-1"
                    aria-label={`Remove ${field.name}`}
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-900 mt-2">
            Note: the group creator (you) will be added automatically.
          </p>
          <div>
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
            >
              Create Group
            </button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}
