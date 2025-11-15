{
  /* Home page (after the form is complete) */
}
import { FormData } from "@/components/IterateForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TodoTab from "@/TodoTab";
import TranscriptTab from "@/TranscriptTab";

export function Home({ formData }: { formData: FormData }) {
  const { companyValues, jobDescription, candidateLinkedInUrl } = formData;

  return (
    <div className="flex w-full h-full items-center justify-center flex-col p-6">
      <Tabs defaultValue="TODO">
        <TabsList className="w-full">
          <TabsTrigger value="TODO">TODO</TabsTrigger>
          <TabsTrigger value="Transcript">Transcript</TabsTrigger>
        </TabsList>
        <TabsContent value="TODO">
          <TodoTab />
        </TabsContent>
        <TabsContent value="Transcript">
          <TranscriptTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Home;
