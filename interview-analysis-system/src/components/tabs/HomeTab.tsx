import { Separator } from "@/components/ui/separator";

export function HomeTab() {
  return (
    <div className="flex flex-col gap-4 h-full w-full p-4 overflow-hidden">
      {/* TODO Card */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4 min-h-0 flex flex-col">
        <h2 className="text-lg font-semibold mb-3">TODO</h2>
        <Separator className="mb-3" />
        <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
          {/* TODO items will go here */}
        </div>
      </div>

      {/* Suggested Questions Card */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4 min-h-0 flex flex-col">
        <h2 className="text-lg font-semibold mb-3">Suggested Questions</h2>
        <Separator className="mb-3" />
        <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
          {/* Suggested questions will go here */}
        </div>
      </div>

      {/* Flags Card */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4 min-h-0 flex flex-col">
        <h2 className="text-lg font-semibold mb-3">Flags</h2>
        <Separator className="mb-3" />
        <div className="space-y-2 overflow-y-auto flex-1 min-h-0">
          {/* Flags will go here */}
        </div>
      </div>
    </div>
  );
}

export default HomeTab;
