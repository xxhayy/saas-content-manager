import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/server/better-auth/config";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { after } from "next/server";
import { submitProjectTask } from "@/server/kie-ai";
import { getTemplateById, buildTemplatePrompt } from "@/lib/project-templates";
import { getSpatialSceneById, buildSpatialPrompt } from "@/lib/spatial-scenes";

type RouteContext = { params: Promise<{ id: string }> };

type GenerateBody =
  | {
      mode: "template";
      templateId: string;
      slotConnections: Record<string, string>;
      promptModifier?: string;
      aspectRatio: string;
      model: string;
      variationCount: number;
      seed?: number;
      outputNodeId: string;
    }
  | {
      mode: "freeform";
      prompt: string;
      imageInputs: string[];
      aspectRatio: string;
      model: string;
      variationCount: number;
      seed?: number;
      outputNodeId: string;
    }
  | {
      mode: "spatial";
      sceneId: string;
      // Merged effectiveConnections from the Spatial Node (directSlotPicks + edge slotConnections)
      effectiveConnections: Record<string, string>; // element.id → asset image URL
      aspectRatio: string;
      model: string;
      variationCount: number;
      seed?: number;
      outputNodeId: string;
    };


    export async function POST(req: NextRequest, { params }: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: projectId } = await params;

  const existing = await db.project.findUnique({
    where: { id: projectId, userId: session.user.id },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const body = (await req.json()) as GenerateBody;

  const variationCount = Math.min(Math.max(body.variationCount ?? 1, 1), 4);

  let finalPrompt: string;
  let finalImageInputs: string[];

  if (body.mode === "template") {
    const template = getTemplateById(body.templateId);
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 400 });
    }
    const built = buildTemplatePrompt(template, body.slotConnections, body.promptModifier);
    finalPrompt = built.prompt;
    finalImageInputs = built.imageInputs;
  } else if (body.mode === "spatial") {
    const scene = getSpatialSceneById(body.sceneId);
    if (!scene) {
      return NextResponse.json({ error: "Spatial scene not found" }, { status: 400 });
    }
    const built = buildSpatialPrompt(scene, body.effectiveConnections);
    finalPrompt = built.prompt;
    finalImageInputs = built.imageInputs;
  } else {
    // freeform — prompt and imageInputs provided directly by the client
    finalPrompt = body.prompt;
    finalImageInputs = body.imageInputs;
  }
  const generations = await db.$transaction(
    Array.from({ length: variationCount }, (_, i) =>
      db.projectGeneration.create({
        data: {
          projectId,
          outputNodeId: body.outputNodeId,
          prompt: finalPrompt,
          aspectRatio: body.aspectRatio,
          model: body.model,
          variationIndex: i,
          seed: body.seed,
          inputImages: finalImageInputs,
          status: "PENDING",
        },
        select: { id: true },
      }),
    ),
  );

  const generationIds = generations.map((g) => g.id);

  after(async () => {
    await Promise.all(
      generations.map((g) =>
        submitProjectTask({
          prompt: finalPrompt,
          imageInputs: finalImageInputs,
          aspectRatio: body.aspectRatio,
          model: body.model,
          seed: body.seed,
          generationId: g.id,
          projectId,
        }).then((kieTaskId) => {
          if (kieTaskId) {
            return db.projectGeneration.update({
              where: { id: g.id },
              data: { kieTaskId, status: "PROCESSING" },
            });
          }
        }).catch((err) => {
          console.error(`[Generate] Failed to submit generation ${g.id}:`, err);
          return db.projectGeneration.update({
            where: { id: g.id },
            data: { status: "FAILED", kieError: String(err) },
          });
        }),
      ),
    );
  });

  return NextResponse.json({ generationIds });
}
