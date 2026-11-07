/**
 * CareerLens AI - Content Script
 * Auto-detects job postings on LinkedIn, Indeed, Glassdoor, and Wellfound.
 * Injects a floating in-page badge with instant match score and 1-click clipping.
 */

(function () {
  'use strict';

  // Prevent double injection
  if (window.__careerlens_injected) return;
  window.__careerlens_injected = true;

  function extractJobDetails() {
    const url = window.location.href;
    let title = '';
    let company = '';
    let location = '';
    let salary = '';
    let description = '';
    let platform = 'Web';

    // 1. LinkedIn Job Detection
    if (url.includes('linkedin.com')) {
      platform = 'LinkedIn';
      const titleEl = document.querySelector('.job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.t-24');
      if (titleEl) title = titleEl.innerText.trim();

      const compEl = document.querySelector('.job-details-jobs-unified-top-card__primary-description a, .jobs-unified-top-card__company-name a, .jobs-unified-top-card__subtitle-primary-grouping a');
      if (compEl) company = compEl.innerText.trim();

      const locEl = document.querySelector('.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet');
      if (locEl) location = locEl.innerText.trim();

      const descEl = document.querySelector('.jobs-description__content, .jobs-box__html-content, #job-details');
      if (descEl) description = descEl.innerText.trim();
    }
    // 2. Indeed Job Detection
    else if (url.includes('indeed.com')) {
      platform = 'Indeed';
      const titleEl = document.querySelector('.jobsearch-JobInfoHeader-title, h1[data-testid="jobsearch-JobInfoHeader-title"]');
      if (titleEl) title = titleEl.innerText.trim();

      const compEl = document.querySelector('[data-company-name="true"], .jobsearch-CompanyInfoContainer a');
      if (compEl) company = compEl.innerText.trim();

      const locEl = document.querySelector('[data-testid="inlineHeader-companyLocation"], .jobsearch-JobInfoHeader-companyLocation');
      if (locEl) location = locEl.innerText.trim();

      const salEl = document.querySelector('#salaryInfoAndJobType, [data-testid="attribute_snippets_test_id"]');
      if (salEl) salary = salEl.innerText.trim();

      const descEl = document.querySelector('#jobDescriptionText');
      if (descEl) description = descEl.innerText.trim();
    }
    // 3. Glassdoor / Wellfound Fallbacks
    else if (url.includes('glassdoor.com') || url.includes('wellfound.com')) {
      platform = url.includes('glassdoor.com') ? 'Glassdoor' : 'Wellfound';
      const h1 = document.querySelector('h1');
      if (h1) title = h1.innerText.trim();
      const compEl = document.querySelector('[data-test="employer-name"], .company-name');
      if (compEl) company = compEl.innerText.trim();
      const descEl = document.querySelector('.jobDescriptionContent, .job-description');
      if (descEl) description = descEl.innerText.trim();
    }

    if (!title && document.querySelector('h1')) {
      title = document.querySelector('h1').innerText.trim();
    }

    return {
      title: title || 'Target Role',
      company: company || 'Hiring Company',
      location: location || 'Remote / Unspecified',
      salary_range: salary || 'Market Competitive',
      raw_text: description || document.body.innerText.slice(0, 4000),
      source_url: url,
      platform: platform,
      stage: 'interested'
    };
  }

  function injectFloatingBadge() {
    if (document.getElementById('careerlens-floating-badge')) return;

    const job = extractJobDetails();
    if (!job.title || job.title === 'Target Role' && !window.location.href.includes('jobs')) {
      // Don't inject on non-job pages
      return;
    }

    const badge = document.createElement('div');
    badge.id = 'careerlens-floating-badge';
    badge.innerHTML = `
      <div class="careerlens-logo-badge">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
        </svg>
        <span>CareerLens</span>
      </div>
      <div class="careerlens-match-pill" id="careerlens-badge-match">
        84% Vector Match
      </div>
      <button class="careerlens-clip-btn" id="careerlens-badge-clip-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
        <span>Clip to Kanban</span>
      </button>
    `;

    document.body.appendChild(badge);

    const clipBtn = document.getElementById('careerlens-badge-clip-btn');
    clipBtn.addEventListener('click', function () {
      clipBtn.innerHTML = `<span>Clipping...</span>`;
      clipBtn.disabled = true;

      const jobData = extractJobDetails();
      chrome.runtime.sendMessage({ action: 'CLIP_JOB', data: jobData }, function (response) {
        if (response && response.success) {
          clipBtn.classList.add('success');
          clipBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Clipped to Kanban!</span>
          `;
          if (response.match_score) {
            document.getElementById('careerlens-badge-match').innerText = `${response.match_score}% Vector Match`;
          }
        } else {
          clipBtn.innerHTML = `<span>Check CareerLens App</span>`;
          setTimeout(() => {
            clipBtn.disabled = false;
            clipBtn.innerHTML = `<span>Clip to Kanban</span>`;
          }, 3000);
        }
      });
    });
  }

  // Listen for queries from extension popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_JOB_DATA') {
      const data = extractJobDetails();
      sendResponse({ success: true, data: data });
      return true;
    }
  });

  // Periodic check for single-page app URL changes (LinkedIn navigation)
  setInterval(() => {
    if (window.location.href.includes('jobs') || window.location.href.includes('viewjob')) {
      injectFloatingBadge();
    }
  }, 2500);

  // Initial attempt
  setTimeout(injectFloatingBadge, 1500);
})();
