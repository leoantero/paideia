import { createClient } from "@/src/lib/supabase/server";
import { getGestorScope } from "@/src/features/user-profiles/gestor-service";
import { InsightsChat } from "@/src/ui/gestor/InsightsChat";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const supabase = await createClient();
  const scope = await getGestorScope(supabase);

  return (
    <InsightsChat
      scopeLabel={scope.schoolName ?? scope.organizationName ?? "Sua unidade"}
    />
  );
}
