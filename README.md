# Kitsune Comics

A deliberately tiny independent comic website with two simple publishing paths:

1. A private mobile web uploader that requires no account or CMS login.
2. An optional email bot that accepts comic attachments and replies with a private preview.

Both routes save the comic as a draft first. Kitsune reviews the private preview and then publishes it. No Twilio, paid messaging gateway, social-media account, or conventional administration panel is involved.

## Stack

- Cloudflare Pages for the public website and private uploader
- Cloudflare Pages Functions for the comic and uploader APIs
- Cloudflare D1 for comic metadata
- Cloudflare R2 for comic images
- An optional Cloudflare Email Worker for email publishing

## Publishing

### Web

Open the private bookmarked URL, choose comic pages, enter the title and caption, and tap **Make private preview**. After reviewing it, tap **Publish it**.

### Email

Send a new email to the configured publishing address:

- Subject: comic title
- Message body: caption
- Attachments: comic pages in reading order

The bot replies with a private preview. Reply `PUBLISH` to put it online.

Read [`SETUP.md`](SETUP.md) for the Cloudflare configuration.
