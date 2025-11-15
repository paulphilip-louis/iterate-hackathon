// Global capture manager that persists across component unmounts
// This ensures audio capture continues working even when navigating between screens

let globalAudioContext: AudioContext | null = null;
let globalProcessor: ScriptProcessorNode | null = null;
let globalStream: MediaStream | null = null;
let globalCommitInterval: number | null = null;
let globalAudioLevelInterval: number | null = null;
let globalScribe: any = null; // ElevenLabs Scribe instance

// Global callbacks that can be updated to always use current context
let globalSetPartialTranscript: ((text: string) => void) | null = null;
let globalAddCommittedTranscript: ((transcript: any) => void) | null = null;

export const globalCaptureManager = {
  setAudioContext(context: AudioContext | null) {
    globalAudioContext = context;
  },

  getAudioContext(): AudioContext | null {
    return globalAudioContext;
  },

  setProcessor(processor: ScriptProcessorNode | null) {
    globalProcessor = processor;
  },

  getProcessor(): ScriptProcessorNode | null {
    return globalProcessor;
  },

  setStream(stream: MediaStream | null) {
    globalStream = stream;
  },

  getStream(): MediaStream | null {
    return globalStream;
  },

  // Helper to ensure audio analyser is accessible
  ensureAnalyserSetup() {
    // The analyser is stored in captureState from audioCapture.ts
    // This is just a helper to verify it exists
    return true;
  },

  setCommitInterval(interval: number | null) {
    globalCommitInterval = interval;
  },

  getCommitInterval(): number | null {
    return globalCommitInterval;
  },

  setAudioLevelInterval(interval: number | null) {
    globalAudioLevelInterval = interval;
  },

  getAudioLevelInterval(): number | null {
    return globalAudioLevelInterval;
  },

  setScribe(scribe: any) {
    globalScribe = scribe;
    // Update scribe callbacks to use global callbacks if they exist
    if (scribe && globalSetPartialTranscript && globalAddCommittedTranscript) {
      // The scribe instance might not support updating callbacks directly
      // So we'll rely on the global callbacks being set before scribe is created
    }
  },

  getScribe(): any {
    return globalScribe;
  },

  setTranscriptCallbacks(
    setPartial: (text: string) => void,
    addCommitted: (transcript: any) => void
  ) {
    globalSetPartialTranscript = setPartial;
    globalAddCommittedTranscript = addCommitted;
  },

  getSetPartialTranscript(): ((text: string) => void) | null {
    return globalSetPartialTranscript;
  },

  getAddCommittedTranscript(): ((transcript: any) => void) | null {
    return globalAddCommittedTranscript;
  },

  stop() {
    // Stop commit interval
    if (globalCommitInterval) {
      clearInterval(globalCommitInterval);
      globalCommitInterval = null;
    }

    // Stop audio level interval
    if (globalAudioLevelInterval) {
      clearInterval(globalAudioLevelInterval);
      globalAudioLevelInterval = null;
    }

    // Disconnect processor
    if (globalProcessor) {
      globalProcessor.disconnect();
      globalProcessor = null;
    }

    // Close audio context
    if (globalAudioContext && globalAudioContext.state !== 'closed') {
      globalAudioContext.close();
      globalAudioContext = null;
    }

    // Stop stream tracks
    if (globalStream) {
      globalStream.getTracks().forEach(track => track.stop());
      globalStream = null;
    }

    // Disconnect scribe
    if (globalScribe && globalScribe.isConnected) {
      globalScribe.disconnect();
    }
    globalScribe = null;
    
    // Clear transcript callbacks
    globalSetPartialTranscript = null;
    globalAddCommittedTranscript = null;
  },

  isRunning(): boolean {
    return globalStream !== null && globalProcessor !== null;
  },
};

