import { FormData } from "@/types/index";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TranscriptTab from "@/components/tabs/TranscriptTab";
import HomeTab from "@/components/tabs/HomeTab";
import { TodosTab } from "../tabs/TodosTab";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAudioCapture } from "@/hooks/useAudioCapture";

interface HomeProps {
  formData: FormData;
  onStopCapture?: () => void;
}

export function Home({ formData: _formData, onStopCapture }: HomeProps) {
  const { isCapturing, loading, stopCapture } = useAudioCapture();

  const handleStop = async () => {
    await stopCapture();
    if (onStopCapture) {
      onStopCapture();
    }
  };

  return (
    <div className="min-h-0 h-full w-full flex flex-col bg-gradient-to-br from-neutral-50 to-neutral-200 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="min-h-0 flex-1 w-full mx-auto flex flex-col"
      >
        <div className="min-h-0 flex justify-center p-2">
          <Tabs defaultValue="Home" className="flex flex-col w-full">
            <div className="min-h-0 flex items-center justify-center gap-3 mb-2">
              <TabsList className="w-fit rounded-lg bg-white/50 backdrop-blur p-1 shadow-sm">
                <TabsTrigger value="Home">Main</TabsTrigger>
                <TabsTrigger value="Transcript">Transcript</TabsTrigger>
                <TabsTrigger value="Todos">Todos</TabsTrigger>
              </TabsList>
              {isCapturing && (
                <Button
                  onClick={handleStop}
                  disabled={loading}
                  variant="destructive"
                  size="sm"
                >
                  {loading ? "Stopping..." : "Stop Capture"}
                </Button>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="flex-1 overflow-hidden min-h-0 mt-2"
            >
              <TabsContent value="Home" className="h-full">
                <HomeTab />
              </TabsContent>
              <TabsContent value="Transcript" className="h-full">
                <TranscriptTab />
              </TabsContent>
              <TabsContent value="Todos" className="h-full">
                <TodosTab />
              </TabsContent>
            </motion.div>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
}

export default Home;
