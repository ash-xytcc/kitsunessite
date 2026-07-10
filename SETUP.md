# Setup

The public site and private web uploader run on Cloudflare Pages. Email publishing is optional and uses a small Cloudflare Email Worker. There is no Twilio or paid SMS gateway.

## 1. Merge and deploy the Pages site

In the existing Cloudflare Pages project, use:

- Production branch: `main`
- Framework preset: `None`
- Build command: `exit 0`
- Build output directory: `.`

The Pages Functions live in `functions/`.

## 2. Create the D1 database

In Cloudflare:

1. Open **Workers & Pages**.
2. Open **D1 SQL Database** and create `kitsune-comics`.
3. Open its SQL console and run the complete contents of `schema.sql`.
4. Open the Kitsune Pages project.
5. Go to **Settings > Bindings**.
6. Add a D1 database binding named exactly `DB`.
7. Select `kitsune-comics`.

Add the binding to Production and Preview if pull-request previews should also function.

If an older version of this project was already initialized with the Twilio schema, delete that unused test database and create it again before running the new schema. The new schema uses `source_id`, not `source_phone`.

## 3. Create the R2 image bucket

1. Open **R2 Object Storage**.
2. Create `kitsune-comic-images`.
3. In the Pages project, open **Settings > Bindings**.
4. Add an R2 bucket binding named exactly `MEDIA`.
5. Select `kitsune-comic-images`.

The bucket stays private. The public site serves images through `/api?action=media`.

## 4. Configure the private web uploader

In **Pages project > Settings > Variables and Secrets**, add:

| Name | Type | Value |
| --- | --- | --- |
| `PUBLISH_SECRET` | Secret | A long random private key, preferably 32 characters or more |
| `PUBLIC_SITE_URL` | Variable | The final site origin, such as `https://kitsune-comics.pages.dev` |

Do not commit the secret to GitHub.

Redeploy after adding the D1 binding, R2 binding, or variables.

Create Kitsune's private bookmark by adding the secret after `#`:

`https://YOUR-SITE-DOMAIN/publish.html#YOUR-PUBLISH-SECRET`

Open that link once on her phone. The uploader stores the key only in that browser and removes it from the visible address. She can then bookmark the page or add it to her home screen. There is no username, account, or login screen during normal use.

### Web publishing workflow

1. Open the private bookmark.
2. Enter the comic title and optional caption.
3. Choose the comic pages in reading order.
4. Tap **Make private preview**.
5. Open and review the preview.
6. Tap **Publish it**.

The uploader also has an **Unpublish latest comic** button for mistakes.

## 5. Test the Pages side

Open:

- `/api?action=health`
- `/api?action=list`
- `/publish.html`

The health response should show `database`, `media`, `webPublisher`, and `site` as configured. It never exposes the secret values.

## 6. Optional email publishing

Email publishing requires a custom domain using Cloudflare Email Routing. The web uploader works without it and can be launched first.

The email worker is in `email-worker/`. It uses the same D1 database and R2 bucket as the Pages site.

### Deploy the email worker

From a computer with Node.js:

1. Open the `email-worker` folder.
2. Copy `wrangler.example.toml` to `wrangler.toml`.
3. Replace `REPLACE_WITH_D1_DATABASE_ID` with the D1 database ID shown in Cloudflare.
4. Replace `https://YOUR-SITE-DOMAIN` with the live site origin.
5. Run `npm install`.
6. Run `npx wrangler login` if Wrangler is not already connected.
7. Run `npx wrangler secret put ALLOWED_EMAIL` and enter Kitsune's normal email address.
8. Run `npm run deploy`.

`ALLOWED_EMAIL` is the only address permitted to create or publish comics through email.

### Route the publishing address

In Cloudflare Email Routing for the custom domain:

1. Enable Email Routing.
2. Create an address such as `publish@YOUR-DOMAIN`.
3. Route that address to the `kitsune-email-publisher` Worker.

### Email publishing workflow

Kitsune sends a new email:

- **To:** the private publishing address
- **Subject:** comic title
- **Message body:** caption
- **Attachments:** comic pages in reading order

The worker replies with a private preview link. She replies with one of these commands:

- `PUBLISH` to publish the draft
- `CANCEL` to delete the draft
- `UNDO` to take her latest published comic offline
- `HELP` for instructions

Cloudflare only permits an automatic reply when the incoming message satisfies its email-authentication requirements. Normal mail from major providers generally does, but the web uploader remains the dependable fallback.

## Security notes

- Keep the uploader URL and publishing email address private.
- Use a long random `PUBLISH_SECRET`.
- Do not place `PUBLISH_SECRET` or `ALLOWED_EMAIL` in GitHub.
- Only the approved email address is accepted by the email worker.
- Draft links contain long random tokens but should still be treated as private.
- The uploader accepts at most 24 images per comic and 20 MB per image.
