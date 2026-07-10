# Setup

The code is ready for Cloudflare Pages. The remaining work is connecting storage, secrets, and a texting number.

## 1. Cloudflare Pages build settings

In the existing Pages project, use:

- Production branch: `main`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `.`

The Pages Functions live in the repository's `functions/` directory.

## 2. Create the D1 database

In Cloudflare:

1. Open **Workers & Pages**.
2. Open **D1 SQL Database** and create a database named `kitsune-comics`.
3. Open its console and run the complete contents of `schema.sql`.
4. Open the Kitsune Pages project.
5. Go to **Settings > Bindings**.
6. Add a **D1 database binding** named exactly `DB`.
7. Select `kitsune-comics`.

Add the binding to both Production and Preview if previews should work from pull requests.

## 3. Create the R2 bucket

1. Open **R2 Object Storage**.
2. Create a bucket named `kitsune-comic-images`.
3. In the Pages project, go to **Settings > Bindings**.
4. Add an **R2 bucket binding** named exactly `MEDIA`.
5. Select `kitsune-comic-images`.

The bucket does not need to be public. Images are served through `/api?action=media`.

## 4. Add environment variables and secrets

In **Pages project > Settings > Variables and Secrets**, add:

| Name | Type | Value |
| --- | --- | --- |
| `ALLOWED_PHONE` | Secret | Kitsune's phone in E.164 format, such as `+13605551234` |
| `TWILIO_ACCOUNT_SID` | Secret | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | Secret | Twilio auth token |
| `PUBLIC_SITE_URL` | Variable | Final site origin, such as `https://kitsune-comics.pages.dev` |

Do not put these values in GitHub.

Redeploy the project after adding bindings or secrets.

## 5. Buy or connect a Twilio number

The number must support SMS and MMS in the country where Kitsune will send messages.

In the Twilio phone-number settings, set the incoming message webhook to:

`https://YOUR-SITE-DOMAIN/api/twilio/incoming`

Use:

- Method: `POST`
- A message comes in: Webhook
- Content type: Twilio's default form-encoded request

The webhook verifies Twilio's request signature and then checks that the sender matches `ALLOWED_PHONE`.

## 6. Test the public API

Open:

- `/api?action=health`
- `/api?action=list`

The health response should report that D1 and R2 are configured. It intentionally does not reveal secret values.

## 7. Test the texting workflow

From Kitsune's approved phone number:

1. Text one comic page.
2. Text additional pages, if any.
3. Text the title on the first line and the caption on later lines.
4. Text `DONE` for a preview link.
5. Text `PUBLISH`.

Available commands:

- `DONE`
- `PUBLISH`
- `CHANGE`
- `CANCEL`
- `UNDO`
- `HELP`

## Notes

MMS providers and carriers may resize large images. The system stores whatever Twilio delivers. For unusually large or print-quality source files, a later version can add email ingestion without changing Kitsune's normal texting workflow.
