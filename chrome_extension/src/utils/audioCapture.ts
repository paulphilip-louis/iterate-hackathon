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

export async function requestMicrophonePermission(): Promise<boolean> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia is not supported');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });

    stream.getTracks().forEach(track => track.stop());

    return true;
  } catch (error: any) {
    console.error('Error requesting microphone permission:', error);

    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      throw new Error('Microphone permission denied. Please allow access and try again.');
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      throw new Error('No microphone found. Please connect a microphone and try again.');
    } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      throw new Error('Microphone is being used by another application. Please close it and try again.');
    }

    throw new Error(`Failed to request microphone permission: ${error.message || error.name}`);
  }
}

export async function checkMicrophonePermission(): Promise<'granted' | 'denied' | 'prompt'> {
  try {
    if (navigator.permissions && navigator.permissions.query) {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach(track => track.stop());
      return 'granted';
    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return 'denied';
      }
      return 'prompt';
    }
  } catch (error) {
    return 'prompt';
  }
}

/**
 * Get microphone audio stream
 */
export async function getMicrophoneStream(): Promise<MediaStream> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('getUserMedia is not supported');
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000,
      },
      video: false,
    });

    console.log('✅ Microphone stream obtained');
    return stream;
  } catch (error: any) {
    console.error('Error getting microphone stream:', error);
    throw error;
  }
}

/**
 * Mix two audio streams into one
 */
export function mixAudioStreams(stream1: MediaStream, stream2: MediaStream): MediaStream {
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const destination = audioContext.createMediaStreamDestination();

  // Create sources from both streams
  const source1 = audioContext.createMediaStreamSource(stream1);
  const source2 = audioContext.createMediaStreamSource(stream2);

  // Create gain nodes to control volume (optional, can adjust if needed)
  const gain1 = audioContext.createGain();
  const gain2 = audioContext.createGain();

  // Connect sources through gain nodes to destination
  source1.connect(gain1);
  source2.connect(gain2);
  gain1.connect(destination);
  gain2.connect(destination);

  // Return the mixed stream
  return destination.stream;
}

