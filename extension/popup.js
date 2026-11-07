/**
 * CareerLens AI - Extension Popup Controller
 * Connects to background worker & content script to display active job & clip.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('conn-status');
  const titleEl = document.getElementById('detected-title');
  const companyEl = document.getElementById('detected-company');
  const clipBtn = document.getElementById('clip-action-btn');

  let activeJobData = null;

  // 1. Health check local CareerLens API
  try {
    const res = await fetch('http://localhost:8000/api/health', { method: 'GET' });
    if (res.ok) {
      statusBadge.textContent = 'Connected';
      statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
      statusBadge.style.color = '#34d399';
    } else {
      statusBadge.textContent = 'API Error';
      statusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
      statusBadge.style.color = '#f87171';
    }
  } catch (_e) {
    statusBadge.textContent = 'Local Standby';
    statusBadge.style.background = 'rgba(245, 158, 11, 0.2)';
    statusBadge.style.color = '#fbbf24';
  }

  // 2. Query active tab for detected job posting
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'GET_JOB_DATA' }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success || !response.data) {
          // Fallback parsing from tab title / URL
          if (tab.url && (tab.url.includes('linkedin.com') || tab.url.includes('indeed.com') || tab.url.includes('glassdoor.com') || tab.url.includes('wellfound.com'))) {
            titleEl.textContent = tab.title || 'Job Posting Detected';
            companyEl.textContent = new URL(tab.url).hostname;
            activeJobData = {
              title: tab.title || 'Target Role',
              company: new URL(tab.url).hostname,
              source_url: tab.url,
              platform: 'Web Extension',
              stage: 'interested'
            };
          } else {
            titleEl.textContent = 'No Job Detected';
            companyEl.textContent = 'Navigate to LinkedIn, Indeed, or Glassdoor job';
            clipBtn.disabled = true;
            clipBtn.style.opacity = '0.5';
          }
          return;
        }

        const data = response.data;
        activeJobData = data;
        titleEl.textContent = data.title || 'Target Role';
        companyEl.textContent = `${data.company || 'Hiring Company'} • ${data.platform || 'Job Board'}`;
      });
    }
  } catch (err) {
    console.error('Popup init failed:', err);
  }

  // 3. Handle Clip Action
  clipBtn.addEventListener('click', async () => {
    if (!activeJobData) return;

    clipBtn.disabled = true;
    const originalText = clipBtn.innerHTML;
    clipBtn.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="animate-spin" style="animation: spin 1s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-linecap="round"></circle>
      </svg>
      <span>Clipping to Pipeline...</span>
    `;

    chrome.runtime.sendMessage({ action: 'CLIP_JOB', data: activeJobData }, (response) => {
      if (response && response.success) {
        clipBtn.className = 'clip-btn success';
        clipBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>✓ Clipped (${response.match_score || 85}% Match)</span>
        `;
        setTimeout(() => {
          window.close();
        }, 1500);
      } else {
        clipBtn.style.background = '#dc2626';
        clipBtn.innerHTML = `<span>Error: ${response?.error || 'Check Backend'}</span>`;
        setTimeout(() => {
          clipBtn.className = 'clip-btn';
          clipBtn.style.background = '';
          clipBtn.disabled = false;
          clipBtn.innerHTML = originalText;
        }, 3000);
      }
    });
  });
});
