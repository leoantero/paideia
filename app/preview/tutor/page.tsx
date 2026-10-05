import { TutorScreen } from "@/src/ui/student/TutorScreen";

export default function PreviewTutor() {
  return (
    <div className="flex h-[calc(100dvh-12.5rem)] min-h-[420px] flex-col overflow-hidden rounded-3xl border border-line bg-surface">
      <TutorScreen
        firstName="Ana"
        conversations={[]}
        endpoint="/preview/api/chat"
      />
    </div>
  );
}
