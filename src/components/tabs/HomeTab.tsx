export function HomeTab() {
  return (
    <div className="flex flex-col gap-4 h-screen w-full p-4 overflow-y-auto">
      {/* TODO Card */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4 min-h-0">
        <h2 className="text-lg font-semibold mb-3">TODO</h2>
        <div className="space-y-2 overflow-y-auto h-full">
          {/* TODO items will go here */}
        </div>
      </div>

      {/* Suggested Questions Card */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4 min-h-0">
        <h2 className="text-lg font-semibold mb-3">Suggested Questions</h2>
        <div className="space-y-2 overflow-y-auto h-full">
          {/* Suggested questions will go here */}
        </div>
      </div>

      {/* Flags Card */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4 min-h-0">
        <h2 className="text-lg font-semibold mb-3">Flags</h2>
        <div className="space-y-2 overflow-y-auto h-full">
          {/* Flags will go here */}
        </div>
      </div>
    </div>
  );
}

export default HomeTab;
