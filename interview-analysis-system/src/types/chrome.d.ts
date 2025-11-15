// Chrome extension types
/// <reference types="chrome" />

// Extend Chrome types if needed
declare namespace chrome {
  namespace tabCapture {
    interface CaptureOptions {
      audio?: boolean;
      video?: boolean;
    }
    
    interface GetMediaStreamIdOptions {
      targetTabId?: number;
    }
    
    function capture(
      options: CaptureOptions,
      callback: (streamId: string | null) => void
    ): void;
    
    function getMediaStreamId?(
      options: GetMediaStreamIdOptions | null,
      callback: (streamId: string | null) => void
    ): void;
  }
}
