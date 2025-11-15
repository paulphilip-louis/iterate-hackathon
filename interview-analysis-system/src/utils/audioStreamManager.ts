// Global audio stream manager that persists across component unmounts
import { AudioStream } from "./audioStream";

let globalAudioStream: AudioStream | null = null;
let globalAudioLevelInterval: number | null = null;

export const audioStreamManager = {
  setAudioStream(stream: AudioStream | null) {
    globalAudioStream = stream;
  },

  getAudioStream(): AudioStream | null {
    return globalAudioStream;
  },

  disconnect() {
    if (globalAudioStream) {
      globalAudioStream.disconnect();
      globalAudioStream = null;
    }
    if (globalAudioLevelInterval) {
      clearInterval(globalAudioLevelInterval);
      globalAudioLevelInterval = null;
    }
  },

  setAudioLevelInterval(interval: number | null) {
    if (globalAudioLevelInterval) {
      clearInterval(globalAudioLevelInterval);
    }
    globalAudioLevelInterval = interval;
  },

  clearAudioLevelInterval() {
    if (globalAudioLevelInterval) {
      clearInterval(globalAudioLevelInterval);
      globalAudioLevelInterval = null;
    }
  },
};
