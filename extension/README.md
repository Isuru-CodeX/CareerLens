# CareerLens AI - Chrome & Edge Browser Extension (Manifest V3)

Automated job clipping and in-page vector alignment scoring for **LinkedIn**, **Indeed**, **Glassdoor**, and **Wellfound**.

## Key Capabilities
- **In-Page Floating Match Badge**: Automatically detects active job postings and calculates vector match alignment against your uploaded resumes.
- **1-Click Application Clipping**: Directly creates both a tracked `Application` in your Kanban pipeline and a cached `JobDescription` record in the CareerLens database.
- **Cross-Platform Extraction**: Custom DOM scrapers for LinkedIn (`job-details-jobs-unified-top-card`), Indeed (`jobsearch-JobInfoHeader`), Glassdoor, and Wellfound.

## How to Install & Load (Developer Mode)

1. Open **Google Chrome** or **Microsoft Edge**.
2. Navigate to `chrome://extensions` (or `edge://extensions`).
3. Toggle on **Developer mode** in the top-right corner.
4. Click **Load unpacked**.
5. Select this folder: `CareerLens/extension`.
6. Pin the CareerLens AI extension to your browser toolbar.
7. Open any job posting on LinkedIn or Indeed — the floating badge appears automatically with 1-click clipping!
