export type UserLite = {
  id?: string;
  name?: string;
  email?: string;
  userId?: string;
};
export type GroupRef = { id: string; name?: string } | null;

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

export type Member = {
  id: string;
  userId: string;
  user?: { name?: string; email?: string };
};

export type Group = {
  id: string;
  name: string;
  members?: Member[];
};

export type MemberFromApi = {
  id: string;
  userId: string;
  user?: { name?: string; email?: string };
};
