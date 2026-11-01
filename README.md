# Business HQ — Firebase dashboard (v1)

Mobile-first dashboard for 5 businesses: home overview, agent approval queue, FBA triage from CSV, daily log, and an 8 AM daily report pushed to your phone.

## What's inside
| Screen | What it does |
|---|---|
| Home | One card per business with today's key number, pending approvals, latest report |
| Approvals | Items your agents send; edit, approve or reject. The decision is posted back to the agent |
| FBA | Upload Amazon CSVs → each product gets one next action (Selling / ACoS high / Fix listing / No traffic / Exit candidate) |
| Log | Daily numbers for AI agents, digital products, goat farm, hardware shop |
| Reports | Daily report history + "Enable alerts" for push notifications |

## One-time setup (≈20 min)

1. **Install tools** (needs Node 20+):
   ```
   npm install -g firebase-tools
   firebase login
   ```
2. **Firebase console** (your existing Blaze project):
   - Authentication → Sign-in method → enable **Google**
   - Firestore Database → create (if not already), production mode
   - Project settings → Your apps → add a **Web app** → copy the config
   - Project settings → Cloud Messaging → Web Push certificates → **Generate key pair** → copy it
3. **Fill in your details** in the project folder:
   - Copy `.env.example` to `.env.local` and paste the web config, VAPID key and your email
   - Copy `functions/.env.example` to `functions/.env` and put your email
   - `firestore.rules`: replace `your.email@gmail.com` with your email
   - `.firebaserc`: replace `YOUR_PROJECT_ID`
4. **Create the agent key** (any long random string; your agents send it):
   ```
   firebase functions:secrets:set AGENT_API_KEY
   ```
5. **Install, build, deploy:**
   ```
   npm install
   cd functions && npm install && cd ..
   npm run build
   firebase deploy
   ```
6. Open the Hosting URL on your phone → sign in → **Add to Home Screen** → Reports → **Enable alerts**.
   (iPhone only allows notifications for apps added to the Home Screen.)

To test locally first: `npm run dev`.

## Connecting agents to the approval queue
```
POST https://asia-south1-<PROJECT_ID>.cloudfunctions.net/submitApproval
Header: x-api-key: <AGENT_API_KEY>
Body (JSON):
{
  "agent": "Content agent",
  "type": "linkedin_post",
  "title": "Post: 3 ways clinics lose leads",
  "content": "…full draft…",
  "callbackUrl": "https://your-n8n/webhook/approved",   // optional
  "meta": { "anything": "you want back" }               // optional
}
```
When you approve/reject, the callback receives `{ id, decision, content, meta }`. `content` includes your edits. In n8n: an HTTP Request node to submit, and a Webhook node as the callback that continues the workflow only when `decision == "approved"`.

## FBA CSVs
- **Business Report:** Seller Central → Reports → Business Reports → *Detailed Page Sales and Traffic by Child Item*. Pick the last 30 days.
- **Ads (optional):** Advertising console → Reports → Sponsored Products → *Advertised product*, summary for the same 30 days.

Upload both. Rules: sales + ACoS > 40% → ACoS high; 50+ sessions/clicks and no sales → Fix listing; less traffic → No traffic; no sales 30+ days after first upload → Exit candidate. Tune these in `src/lib/fba.js`.

## Changing what you track
Edit fields in `src/lib/businesses.js`. If you rename fields, update the matching lines in `functions/index.js` (daily report).

## Data (Firestore)
`entries/{date}_{biz}` · `fba_products/{asin}` · `fba_uploads` · `approvals` · `reports/{date}` · `settings/push`

## Next (v2)
Competitor tracking per ASIN, giving your parents their own login for farm/shop entry, charts over time.
