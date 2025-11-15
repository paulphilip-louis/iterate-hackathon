import { useState, useEffect } from "react";

export function useGoogleMeet() {
  const [isOnGoogleMeet, setIsOnGoogleMeet] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTabUrl, setCurrentTabUrl] = useState<string>("");

  useEffect(() => {
    const checkGoogleMeet = async () => {
      try {
        // Get the current active tab
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });

        if (tab?.url) {
          // Check if URL is a Google Meet URL
          const isMeet = tab.url.includes("meet.google.com");
          setIsOnGoogleMeet(isMeet);
          setCurrentTabUrl(tab.url);
        }
        setLoading(false);
      } catch (error) {
        console.error("Error checking Google Meet:", error);
        setLoading(false);
      }
    };

    // Check once when side panel opens
    checkGoogleMeet();
  }, []);

  return { isOnGoogleMeet, loading, currentTabUrl: currentTabUrl };
}

