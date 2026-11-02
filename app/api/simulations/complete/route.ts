import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStudentApi } from "@/src/core/auth/require-student-api";
import { findSimulation } from "@/src/features/simulations/catalog";

const bodySchema = z.object({ simulationId: z.string().min(1).max(64) });

/** O aluno completou os desafios: recompensa uma vez (complete_simulation, 0026). */
export async function POST(request: Request) {
  const auth = await requireStudentApi();
  if ("error" in auth) return auth.error;

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success || !findSimulation(body.data.simulationId)) {
    return NextResponse.json({ error: "Unknown simulation." }, { status: 400 });
  }

  const { data, error } = await auth.supabase.rpc("complete_simulation", {
    p_simulation_id: body.data.simulationId,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 409 });
  }
  return NextResponse.json(data);
}
