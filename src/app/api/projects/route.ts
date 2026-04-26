import { NextResponse } from "next/server";
import { auth } from "@/server/better-auth/config";
import { headers } from "next/headers";
import { db } from "@/server/db";

export async function POST() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await db.project.create({
    data: {
      userId: session.user.id,
    },
    select: { id: true, name: true },
  });

  return NextResponse.json({ project });
}
