chrome.runtime.onInstalled.addListener(() => {
  console.log('DataMapper installed');
});

// Click on extension icon → toggle panel on active tab
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'DATAMAPPER_TOGGLE_PANEL' });
});

// Forward popup → content-script messages to active tab when needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target === 'content-script') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, message, sendResponse);
      }
    });
    // keep channel open for async sendResponse
    return true;
  }

  // Extraction result from content script → just relay to all extension views
  if (message?.type === 'DATAMAPPER_EXTRACTION_RESULT') {
    chrome.runtime.sendMessage(message);
  }

  return false;
});
