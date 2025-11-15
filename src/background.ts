/// <reference types="chrome" />

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

// Open side panel when extension icon is clicked
// Only set up onClicked if action API is available and no default_popup is set
if (typeof chrome !== 'undefined' && chrome.action && typeof chrome.action.onClicked !== 'undefined') {
  chrome.action.onClicked.addListener((tab) => {
    try {
      if (chrome.sidePanel && typeof chrome.sidePanel.open === 'function') {
        chrome.sidePanel.open({ windowId: tab.windowId });
      }
    } catch (error) {
      console.error('Error opening side panel:', error);
    }
  });
} else {
  console.log('chrome.action.onClicked is not available (this is normal if default_popup is set)');
}

// Set side panel when extension is installed or enabled
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setOptions) {
    chrome.sidePanel.setOptions({
      path: "sidepanel.html",
      enabled: true,
    });
  }
});

// Listen for messages from popup/sidepanel
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
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
    // This is the preferred method for Manifest V3
    if (chrome.tabCapture && typeof chrome.tabCapture.getMediaStreamId === 'function') {
      try {
        streamId = await new Promise<string>((resolve, reject) => {
          chrome.tabCapture.getMediaStreamId(
            {
              targetTabId: tabId,
            },
            (streamId) => {
              if (chrome.runtime.lastError) {
                const errorMsg = chrome.runtime.lastError.message;
                console.error('getMediaStreamId error:', errorMsg);
                reject(new Error(errorMsg || 'Failed to get stream ID'));
              } else if (!streamId) {
                reject(new Error('Failed to get stream ID'));
              } else {
                console.log('Successfully got stream ID via getMediaStreamId:', streamId);
                resolve(streamId);
              }
            }
          );
        });
      } catch (error: any) {
        console.log('getMediaStreamId failed:', error?.message || error);
        // Continue to fallback method if available
      }
    } else {
      console.warn('chrome.tabCapture.getMediaStreamId is not available');
    }

    // Fallback: Use capture method only if getMediaStreamId is not available
    // Note: In Manifest V3, capture() may not be available, so we rely on getMediaStreamId
    if (!streamId && chrome.tabCapture && typeof chrome.tabCapture.capture === 'function') {
      console.log('Using capture method, switching to tab:', tabId);
      
      try {
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
      } catch (captureError: any) {
        console.error('Capture method failed:', captureError);
        throw new Error(`Failed to capture audio: ${captureError.message || 'Unknown error'}`);
      }
    }
    
    if (!streamId) {
      throw new Error('Failed to get stream ID. getMediaStreamId is required for Manifest V3.');
    }

    currentStreamId = streamId;
    currentTabId = tabId;

    console.log('Audio capture started for tab:', tabId, 'Stream ID:', streamId);
    
    // Return the streamId so the popup/sidepanel can use it
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
