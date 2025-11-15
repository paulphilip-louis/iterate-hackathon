import { Separator } from "@/components/ui/separator";

interface TODO {
  id: string;
  message: string;
}

export function TodosTab() {

  
  return (
    <div className="flex flex-col gap-4 h-full w-full p-4 overflow-hidden">
      <h1 className="text-2xl font-bold text-center mb-4">Todos</h1>
      <Separator className="mb-3" />
    </div>
  );
}
