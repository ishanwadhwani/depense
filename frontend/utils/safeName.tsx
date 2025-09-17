import { UserLite } from "@/utils/types";

export function safeName(
  user?: Partial<UserLite> | { userId?: string } | null
): string {
  if (!user) return "Someone";
  return (
    (user as UserLite).name ??
    (user as UserLite).email ??
    (user as UserLite).id ??
    (user as { userId?: string }).userId ??
    "Someone"
  );
}
