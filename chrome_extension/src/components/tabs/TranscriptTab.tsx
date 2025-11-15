import { Separator } from "@radix-ui/react-separator";

export function TranscriptTab() {
  return (
    <div className="flex flex-col gap-4 h-full w-full p-4 overflow-hidden">
      <h1 className="text-2xl font-bold text-center mb-4">Transcript</h1>
      <Separator className="mb-3" />
    </div>
  );
}

export default TranscriptTab;
