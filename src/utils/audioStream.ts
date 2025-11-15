// Audio streaming utility - sends audio to backend WebSocket
// Backend simply logs received audio data

const BACKEND_WS_URL = import.meta.env.VITE_BACKEND_WS_URL || 'ws://localhost:3001/ws/audio';

export class AudioStream {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStreamSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private isConnected: boolean = false;
  private onStatusUpdate?: (status: string) => void;

  constructor(onStatusUpdate?: (status: string) => void) {
    this.onStatusUpdate = onStatusUpdate;
  }

  /**
   * Connect to backend WebSocket and start streaming audio
   */
  async connect(stream: MediaStream): Promise<void> {
    if (this.isConnected) {
      throw new Error('Already connected');
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(BACKEND_WS_URL);

        this.ws.onopen = () => {
          console.log('✅ Connected to backend audio receiver');
          this.isConnected = true;
          this.onStatusUpdate?.('Connected to server');
          this.setupAudioStreaming(stream);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            if (typeof event.data === 'string') {
              const data = JSON.parse(event.data);
              
              if (data.type === 'connected') {
                console.log('Backend message:', data.message);
                this.onStatusUpdate?.('Connected to server');
              } else if (data.type === 'ack') {
                // Acknowledgment from server - audio chunk received
                console.log(`✅ Server acknowledged audio chunk #${data.chunkNumber}`);
              }
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.onStatusUpdate?.('Connection error');
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = () => {
          console.log('WebSocket closed');
          this.isConnected = false;
          this.onStatusUpdate?.('Disconnected');
          this.cleanup();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Setup audio streaming from MediaStream to WebSocket
   */
  private setupAudioStreaming(stream: MediaStream): void {
    try {
      // Create AudioContext
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      
      // Create source from stream
      this.mediaStreamSource = this.audioContext.createMediaStreamSource(stream);
      
      // Create script processor for audio chunks
      const bufferSize = 4096;
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      this.processor.onaudioprocess = (event) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          return;
        }

        const inputData = event.inputBuffer.getChannelData(0);
        
        // Convert Float32Array to Int16Array (PCM format)
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Clamp and convert to 16-bit PCM
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Send audio data to backend
        // Send as JSON with base64 encoded audio
        const base64Audio = this.arrayBufferToBase64(pcmData.buffer);
        
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'audio',
            audio: base64Audio,
          }));
        }
      };

      // Connect audio nodes
      this.mediaStreamSource.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      // Send configuration after connection is established
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: 'config',
            config: {
              sample_rate: 16000,
              chunk_size: [250, 500, 750],
            },
          }));
          this.onStatusUpdate?.('Streaming audio...');
        }
      }, 100);
    } catch (error) {
      console.error('Error setting up audio streaming:', error);
      throw error;
    }
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.cleanup();
    this.isConnected = false;
    this.onStatusUpdate?.('Disconnected');
  }

  /**
   * Cleanup audio resources
   */
  private cleanup(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.mediaStreamSource) {
      this.mediaStreamSource.disconnect();
      this.mediaStreamSource = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }
}

