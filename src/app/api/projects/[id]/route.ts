import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/server/better-auth/config";
import { headers } from "next/headers";
import { db } from "@/server/db";
import type { Prisma } from "@prisma/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db.project.findUnique({
    where: { id, userId: session.user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

   const body = (await req.json()) as {
    name?: string;
    nodesJson?: Prisma.InputJsonValue;
    edgesJson?: Prisma.InputJsonValue;
    viewportJson?: Prisma.InputJsonValue;
  };


  const project = await db.project.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.nodesJson !== undefined && { nodesJson: body.nodesJson }),
      ...(body.edgesJson !== undefined && { edgesJson: body.edgesJson }),
      ...(body.viewportJson !== undefined && { viewportJson: body.viewportJson }),
    },
    select: { id: true, updatedAt: true },
  });

  return NextResponse.json({ project });
}

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const existing = await db.project.findUnique({
    where: { id, userId: session.user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  await db.project.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
