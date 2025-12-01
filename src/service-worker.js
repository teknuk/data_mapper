chrome.runtime.onInstalled.addListener(() => {
  console.log('Teknuk DataMapper installed');
});

// Click on extension icon → toggle panel on active tab
chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { type: 'TN_DATAMAPPER_TOGGLE_PANEL' });
});

// Forward popup → content-script messages to active tab when needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target === 'content-script') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab?.id) {
        // chrome.tabs.sendMessage(tab.id, message, sendResponse);
        chrome.tabs.sendMessage(tab.id, message);
      }
    });
    // keep channel open for async sendResponse
    sendResponse({ ok: true }); // ALWAYS respond to avoid port closing error
    return true;
  }

  // Extraction result from content script → just relay to all extension views
  if (message?.type === 'TN_DATAMAPPER_EXTRACTION_RESULT') {
    chrome.runtime.sendMessage(message);
    sendResponse({ ok: true });
    return true;
  }

  if (message?.type === "TN_DATAMAPPER_DOWNLOAD") {
    chrome.downloads.download({ url: message.url, filename: message.filename, saveAs: true });
    // Keep port open
    return false;
  }

  return false;
});
