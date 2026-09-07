import { createClient } from "@/src/lib/supabase/server";
import {
  getClassHeatmap,
  getTeacherClasses,
} from "@/src/features/user-profiles/teacher-profile-service";
import { TurmaHeatmap } from "@/src/ui/teacher/TurmaHeatmap";

export default async function TeacherTurmaPage() {
  const supabase = await createClient();
  const classes = await getTeacherClasses(supabase);

  const heatmapByClass = new Map(
    await Promise.all(
      classes.map(
        async (c) => [c.id, await getClassHeatmap(supabase, c.id)] as const
      )
    )
  );

  return <TurmaHeatmap classes={classes} heatmapByClass={heatmapByClass} />;
}
