/**
 * CareerLens AI - Background Service Worker
 * Communicates with CareerLens local backend (default: http://localhost:8000)
 */

const DEFAULT_API_BASE = 'http://localhost:8000';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CLIP_JOB') {
    handleClipJob(request.data)
      .then((res) => sendResponse(res))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep message channel open for async response
  }
});

async function handleClipJob(jobData) {
  try {
    // Get stored auth token or fallback to demo
    const storage = await chrome.storage.local.get(['careerlens_token', 'careerlens_api_url']);
    const token = storage.careerlens_token || '';
    const baseUrl = storage.careerlens_api_url || DEFAULT_API_BASE;

    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}/api/applications/extension/clip`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(jobData)
    });

    if (!response.ok) {
      const errText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errText}` };
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error in handleClipJob:', error);
    return { success: false, error: error.message };
  }
}
