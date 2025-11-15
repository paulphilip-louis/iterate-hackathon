// Background service worker for audio capture

let currentStreamId: string | null = null;
let currentTabId: number | null = null;

// Log that the background script is loaded
console.log('Background service worker loaded');

// Keep service worker alive with periodic activity
// This prevents the service worker from being terminated
setInterval(() => {
  // Just keep the service worker alive
  console.log('Service worker keep-alive');
}, 20000); // Every 20 seconds

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request.action);
  
  if (request.action === 'startCapture') {
    startCapture(request.tabId)
      .then((streamId) => sendResponse({ success: true, streamId }))
      .catch((error) => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }

  if (request.action === 'stopCapture') {
    stopCapture();
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'getCaptureStatus') {
    sendResponse({ 
      isCapturing: currentStreamId !== null,
      tabId: currentTabId 
    });
    return true;
  }

  if (request.action === 'getTabs') {
    try {
      chrome.tabs.query({}, (tabs) => {
        if (chrome.runtime.lastError) {
          console.error('Error querying tabs:', chrome.runtime.lastError);
          sendResponse({ tabs: [], error: chrome.runtime.lastError.message });
          return;
        }
        
        try {
          const videoCallTabs = tabs.filter(tab => 
            tab.url && (
              tab.url.includes('meet.google.com') ||
              tab.url.includes('teams.microsoft.com') ||
              tab.url.includes('zoom.us') ||
              tab.url.includes('webex.com') ||
              tab.url.includes('whereby.com')
            )
          );
          console.log('Found video call tabs:', videoCallTabs.length);
          sendResponse({ tabs: videoCallTabs });
        } catch (filterError) {
          console.error('Error filtering tabs:', filterError);
          sendResponse({ tabs: [], error: 'Error filtering tabs' });
        }
      });
    } catch (error: any) {
      console.error('Error in getTabs handler:', error);
      sendResponse({ tabs: [], error: error.message || 'Unknown error' });
    }
    return true; // Keep the message channel open
  }
});

async function startCapture(tabId: number) {
  // Stop any existing capture
  if (currentStreamId) {
    stopCapture();
  }

  try {
    // Try to use getMediaStreamId for specific tab (preferred method)
    // If that's not available, fall back to switching to the tab and using capture
    let streamId: string | null = null;

    // First, try getMediaStreamId if available (for specific tab capture)
    if (chrome.tabCapture.getMediaStreamId) {
      try {
        streamId = await new Promise<string>((resolve, reject) => {
          chrome.tabCapture.getMediaStreamId(
            {
              targetTabId: tabId,
            },
            (streamId) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else if (!streamId) {
                reject(new Error('Failed to get stream ID'));
              } else {
                resolve(streamId);
              }
            }
          );
        });
      } catch (error) {
        console.log('getMediaStreamId failed, trying capture method:', error);
      }
    }

    // Fallback: Use capture method (requires tab to be active)
    if (!streamId) {
      console.log('Using capture method, switching to tab:', tabId);
      
      // Get current active tab to restore later if needed
      const currentTabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const previousActiveTab = currentTabs[0]?.id;
      
      // Switch to the target tab first
      await chrome.tabs.update(tabId, { active: true });
      
      // Wait a bit longer to ensure tab is fully active and rendering
      await new Promise(resolve => setTimeout(resolve, 300));

      streamId = await new Promise<string>((resolve, reject) => {
        chrome.tabCapture.capture(
          {
            audio: true,
            video: false,
          },
          (capturedStreamId) => {
            if (chrome.runtime.lastError) {
              const errorMsg = chrome.runtime.lastError.message;
              console.error('tabCapture.capture error:', errorMsg);
              reject(new Error(errorMsg || 'Unknown error during capture'));
            } else if (!capturedStreamId) {
              reject(new Error('Failed to get stream ID. The tab may not be playing audio, or it may be a system tab that cannot be captured.'));
            } else {
              console.log('Successfully captured stream:', capturedStreamId);
              resolve(capturedStreamId);
            }
          }
        );
      });
      
      // Optionally restore previous active tab (commented out to keep focus on captured tab)
      // if (previousActiveTab && previousActiveTab !== tabId) {
      //   chrome.tabs.update(previousActiveTab, { active: true });
      // }
    }

    currentStreamId = streamId;
    currentTabId = tabId;

    console.log('Audio capture started for tab:', tabId, 'Stream ID:', streamId);
    
    // Return the streamId so the popup can use it
    return streamId;
  } catch (error: any) {
    console.error('Error starting capture:', error);
    throw error;
  }
}

function stopCapture() {
  // Note: Chrome doesn't provide a direct API to stop tab capture
  // The stream will stop when the tab is closed or the extension is disabled
  // We can track the state here though
  currentStreamId = null;
  currentTabId = null;
  console.log('Audio capture stopped');
}

