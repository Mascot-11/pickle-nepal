import { redirect } from "next/navigation";
import { destroySession } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

/**
 * POST-only logout endpoint. The session row and cookie are both cleared, so
 * a stolen cookie value is useless after logout.
 */
export async function POST() {
  await destroySession();
  revalidatePath("/", "layout");
  redirect("/");
}