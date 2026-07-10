# Kitsune Comics

A deliberately tiny comic website with an SMS/MMS publishing workflow.

Kitsune does not need a CMS account, an app, or a dashboard. She texts comic pages to a dedicated number, sends a title and caption, previews the draft, and replies `PUBLISH`.

## Stack

- Cloudflare Pages for the public website
- One Cloudflare Pages `_worker.js` for routing, the API, and the incoming-message webhook
- Cloudflare D1 for comic metadata
- Cloudflare R2 for comic images
- Twilio for the dedicated SMS/MMS number

Read [`SETUP.md`](SETUP.md) for the remaining Cloudflare and Twilio setup.
