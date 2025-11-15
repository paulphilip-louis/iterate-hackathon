{
  /* Home page (after the form is complete) */
}
import { FormData } from "@/types/index";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TranscriptTab from "@/TranscriptTab";
import HomeTab from "@/components/tabs/HomeTab";

export function Home({ formData: _formData }: { formData: FormData }) {
  // formData available for future use

  return (
    <div className="flex w-full h-screen flex-col">
      <Tabs defaultValue="Home" className="flex flex-col h-full">
        <TabsList className="w-full">
          <TabsTrigger value="Home">Home</TabsTrigger>
          <TabsTrigger value="Transcript">Transcript</TabsTrigger>
        </TabsList>
        <TabsContent value="Home" className="flex-1 overflow-hidden">
          <HomeTab />
        </TabsContent>
        <TabsContent value="Transcript" className="flex-1 overflow-hidden">
          <TranscriptTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Home;
