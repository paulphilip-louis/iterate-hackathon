import { useState } from "react";
import type { Tab } from "@/types";

export function useTabs() {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [selectedTabId, setSelectedTabId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTabs = async () => {
    try {
      if (!chrome.runtime || !chrome.runtime.sendMessage) {
        setError("Error: Chrome extension API not available");
        return;
      }

      const response = await chrome.runtime.sendMessage({ action: "getTabs" });
      
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message || 'Unknown error';
        setError(`Error: ${errorMsg}. Please reload the extension.`);
        return;
      }
      
      if (!response) {
        setError("Error: No response from background script. Please reload the extension.");
        return;
      }

      if (response.error) {
        setError(`Error: ${response.error}`);
        setTabs([]);
        return;
      }

      if (response && response.tabs !== undefined) {
        setTabs(response.tabs);
        if (response.tabs.length > 0 && !selectedTabId) {
          setSelectedTabId(response.tabs[0].id || null);
        }
        setError(null);
      } else {
        setTabs([]);
        if (!response) {
          setError("Error: No response from background script");
        }
      }
    } catch (err: any) {
      console.error("Error loading tabs:", err);
      setError(`Error loading tabs: ${err.message || 'Unknown error'}`);
      setTabs([]);
    }
  };

  const getTabName = (tab: Tab): string => {
    if (tab.title) {
      return tab.title.length > 40 ? tab.title.substring(0, 40) + "..." : tab.title;
    }
    if (tab.url) {
      try {
        const url = new URL(tab.url);
        return url.hostname;
      } catch {
        return "Unknown";
      }
    }
    return "Unknown Tab";
  };

  return {
    tabs,
    selectedTabId,
    setSelectedTabId,
    error,
    loadTabs,
    getTabName,
  };
}

