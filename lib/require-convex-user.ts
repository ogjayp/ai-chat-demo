import { auth } from "@clerk/nextjs/server";

export async function requireConvexUser() {
  const { userId, getToken } = await auth();
  if (!userId) {
    return {
      ok: false as const,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const token = await getToken({ template: "convex" });
  if (!token) {
    return {
      ok: false as const,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true as const, userId, token };
}
