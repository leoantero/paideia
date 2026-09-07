import { createClient } from "@/src/lib/supabase/server";
import {
  getLinkedChildren,
  getMasteryBySubject,
} from "@/src/features/user-profiles/parent-profile-service";
import { PainelView } from "@/src/ui/parent/PainelView";

export default async function ParentDashboardPage() {
  const supabase = await createClient();

  const children = await getLinkedChildren(supabase);
  const masteryByChild = await getMasteryBySubject(
    supabase,
    children.map((c) => c.id)
  );

  return <PainelView children={children} masteryByChild={masteryByChild} />;
}
