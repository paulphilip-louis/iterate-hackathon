{
  /* Home page (after the form is complete) */
}
import { FormData } from "@/types/index";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TranscriptTab from "@/components/tabs/TranscriptTab";
import HomeTab from "@/components/tabs/HomeTab";
import { TodosTab } from "../tabs/TodosTab";

export function Home({ formData: _formData }: { formData: FormData }) {
  return (
    <div className="flex h-screen flex-col">
      <Tabs defaultValue="Home" className="flex flex-col h-full w-full">
        <div className="flex justify-center p-2">
          <TabsList className="w-fit">
            <TabsTrigger value="Home">Home</TabsTrigger>
            <TabsTrigger value="Transcript">Transcript</TabsTrigger>
            <TabsTrigger value="Todos">Todos</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="Home" className="flex-1 overflow-hidden min-h-0">
          <HomeTab />
        </TabsContent>
        <TabsContent
          value="Transcript"
          className="flex-1 overflow-hidden min-h-0"
        >
          <TranscriptTab />
        </TabsContent>
        <TabsContent value="Todos" className="flex-1 overflow-hidden min-h-0">
          <TodosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Home;
