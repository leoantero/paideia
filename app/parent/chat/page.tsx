import { createClient } from "@/src/lib/supabase/server";
import { getLinkedChildren } from "@/src/features/user-profiles/parent-profile-service";
import { ConselheiroChat } from "@/src/ui/parent/ConselheiroChat";

export default async function ParentChatPage() {
  const supabase = await createClient();
  const children = await getLinkedChildren(supabase);

  return <ConselheiroChat children={children} />;
}
