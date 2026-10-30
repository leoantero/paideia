import { TutorScreen } from "@/src/ui/student/TutorScreen";

export default async function PreviewTutor({
  searchParams,
}: PageProps<"/preview/tutor">) {
  const { q } = await searchParams;
  return (
    <div className="-mb-6 flex h-[calc(100dvh-156px)] min-h-[420px] flex-col">
      <TutorScreen
        firstName="Ana"
        conversations={[]}
        endpoint="/preview/api/chat"
        initialQuestion={typeof q === "string" ? q : undefined}
      />
    </div>
  );
}
