// Utility functions for audio capture

export interface AudioCaptureState {
  stream: MediaStream | null;
  audioContext: AudioContext | null;
  analyser: AnalyserNode | null;
}

let captureState: AudioCaptureState = {
  stream: null,
  audioContext: null,
  analyser: null,
};

export async function getAudioStream(streamId: string): Promise<MediaStream> {
  try {
    console.log('Getting audio stream with streamId:', streamId);
    
    // In Chrome extensions, getUserMedia with chromeMediaSource should work
    // but the constraint format is specific
    const constraints: any = {
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId,
        },
      } as any,
      video: false,
    };

    let stream: MediaStream;
    
    // Try modern getUserMedia first
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (error: any) {
        console.error('getUserMedia failed:', error);
        // Try with webkit prefix as fallback
        if ((navigator as any).webkitGetUserMedia) {
          return new Promise((resolve, reject) => {
            (navigator as any).webkitGetUserMedia(
              constraints,
              resolve,
              reject
            );
          });
        }
        throw error;
      }
    } else if ((navigator as any).webkitGetUserMedia) {
      // Fallback to webkit prefix
      return new Promise((resolve, reject) => {
        (navigator as any).webkitGetUserMedia(
          constraints,
          resolve,
          reject
        );
      });
    } else {
      throw new Error('getUserMedia is not supported in this context');
    }

    captureState.stream = stream;

    // Create AudioContext for processing
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    captureState.audioContext = audioContext;
    captureState.analyser = analyser;

    // Handle track ending
    stream.getAudioTracks().forEach((track) => {
      track.onended = () => {
        stopAudioCapture();
      };
    });

    return stream;
  } catch (error) {
    console.error('Error getting audio stream:', error);
    throw error;
  }
}

export function stopAudioCapture() {
  if (captureState.stream) {
    captureState.stream.getTracks().forEach((track) => {
      track.stop();
    });
    captureState.stream = null;
  }

  if (captureState.audioContext) {
    if (captureState.audioContext.state !== 'closed') {
      captureState.audioContext.close();
    }
    captureState.audioContext = null;
  }

  captureState.analyser = null;
}

export function getCaptureState(): AudioCaptureState {
  return { ...captureState };
}

export function getAudioLevel(): number {
  if (!captureState.analyser) {
    return 0;
  }

  const bufferLength = captureState.analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  captureState.analyser.getByteFrequencyData(dataArray);

  // Calculate average volume
  let sum = 0;
  for (let i = 0; i < bufferLength; i++) {
    sum += dataArray[i];
  }
  return sum / bufferLength;
}

