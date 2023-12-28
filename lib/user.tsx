import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "app/api/auth/[...nextauth]/authOptions";

export async function getUserId(): Promise<number> {
  const session = await getServerSession(authOptions);
  const userId = +session?.user?.id;
  if (!userId) {
    return redirect("/api/auth/signin");
  }
  return userId;
}
