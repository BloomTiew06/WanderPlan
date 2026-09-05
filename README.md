# WanderPlan

A group travel planner: pick dates everyone can actually do, build a day-by-day
itinerary from what the group wants, keep the budget honest, and come home with
a recap and a suitcase covered in stickers from the places you actually went.

Built for the CodeNection "Planning an Escape" brief.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # domain-logic tests
npm run build    # typecheck + production build
```

No API keys are needed. Every external integration has a working local fallback,
so the whole flow runs offline — see [Integrations](#integrations).

---

## What it does

The app follows one trip from "we should go somewhere" to the recap afterwards.

### 1. Setup — dates that work for everyone

- **Best time to visit.** Before anyone picks dates, a month-by-month strip
  rates the destination on weather, crowds and price, grouped into seasons.
  You start from a good window instead of accidentally booking monsoon season.
- **Invite and a deadline.** The organizer shares a link or a six-character
  code and sets a `respondBy` timestamp. It's shown on the join screen and the
  waiting screen, with a countdown, so nobody has to guess how long they have.
- **Availability.** Each member taps or drags across days on a calendar that
  highlights the recommended season. Reminders go to whoever hasn't responded.
- **Overlap.** At the deadline the app locks in what's been submitted and finds
  the window the group shares. If there's no full overlap it shows the best
  partial one and names who'd miss which days. **Non-responders are excluded
  from the intersection rather than treated as unavailable**, so one slow friend
  can't stall the trip. If the only overlap falls outside the good season, that's
  a soft warning — never a block.
- **Preference quiz.** Budget, pace, interest tags, and up to three must-dos.

### 2. Planning

- **Itinerary.** Day-by-day cards with times, costs, categories and travel legs
  between stops. Swap a single activity for three nearby alternatives,
  regenerate a whole day, or drag to reorder. Must-dos are forced in and badged
  with the name of whoever asked for them.
- **Group snapshot and voting.** Aggregated preferences, with genuine splits
  surfaced as vote cards instead of being averaged away.
- **Weighted votes with a tie-breaker.** Each vote carries a weight of
  `1 + costShare + organizerBonus`, shown openly with the arithmetic in a
  tooltip. A vote that stays split gets flagged, and the group assigns a
  tie-breaker — chosen or random, logged either way. The tie-breaker's call
  writes through the same resolution path as a normal weighted win.
- **Build from saved posts.** Paste Instagram, TikTok, RedNote or YouTube links;
  the app extracts places, geocodes them, and clusters them by distance into
  feasible days, flagging pairs that are hours apart. Anything already on the
  itinerary is skipped.

### 3. Bookings and money

- **Stays & flights.** Search for the confirmed dates, or **import a booking**
  you made elsewhere: paste the confirmation and it's parsed into a locked
  itinerary card plus a budget line, visible to the whole group.
- **Budget.** Six categories, each auto-tagged by source, with optional caps and
  warnings as you approach them. A donut by category and a day-by-day bar-plus-
  running-total chart.
- **Who owes who.** Net balances simplified to the fewest transfers.
- **Rides.** A "Get there" button on every travel leg, with a curated
  local-driver fallback where ride-hailing doesn't reach.

### 4. During the trip

- **Check in** at an activity to drop a pin on your map and unlock stickers.
- **Something changed** reworks only the rest of the affected day, keeping the
  budget, the preferences, and anything booked.
- **Check-in snapshots** send a photo and a status line pulled from today's
  itinerary to a family contact — one-way, no account needed on their end. Go
  quiet for longer than your threshold and it nudges you, then them.
- **Language.** Per-user UI localisation, on-demand translation of activity
  names and addresses, a phrasebook with audio, and a sign/menu translator.

### 5. Afterwards

- **Recap.** A story-style slideshow of the shared album plus the trip's stats,
  reorderable and trimmable, shareable as a public link.
- **My Map.** Pins and shaded countries across every trip, with stats.
- **Passport.** A luggage mascot whose shell fills with landmark and food
  stickers earned by checking in. Drag them around, pin a favourite, browse the
  locked ones as silhouettes in the sticker book, and unlock Group Trunk tiers
  for travelling with the same crew repeatedly.

---

## How it's built

```
src/
  domain/        Pure logic, unit-tested. No React, no I/O.
    availability.ts   Group date overlap, best-partial fallback, season check
    voting.ts         Weight formula, weighted tally, stuck detection
    budget.ts         Category subtotals, caps, debt simplification
    geo.ts            Haversine, travel legs, day ordering, clustering
    preferences.ts    Group snapshot, conflict detection
    stickers.ts       Unlock rules from Visit records
    dates.ts          UTC-stable date helpers
  services/      Adapters to the outside world, each with a local fallback
    ai.ts             Itinerary, swap, regenerate, replan, booking parse, social extract
    travel.ts         Flights, stays, rides, flight status, geocoding
    translate.ts      Text and sign translation, speech playback
    notify.ts         Push / SMS / email outbox
  data/          Curated destinations, POIs, dishes, sticker catalog
  store/         App state, persisted to localStorage
  screens/       One file per screen
  components/    Shared UI, calendar, suitcase, map
  theme.js       The palette — the single source of colour
```

### Colour

`src/theme.js` is the only place a colour is defined. It's plain JS rather than
TypeScript so `tailwind.config.js` (loaded by PostCSS in Node) and the app's
TypeScript modules can both import it — charts, SVG and inline styles can't use
Tailwind classes, so without one shared module the palette drifts.

The theme is blue and green over warm earth neutrals: deep sea and pine for the
chrome, sage and stone for surfaces, terracotta and ochre where a warm accent
earns its place.

The six budget-category hues are a **validated categorical palette**. They pass a
lightness band, a chroma floor, adjacent-pair colour-vision-deficiency separation
(protan, deutan, tritan) and a normal-vision separation floor against the page
surface. The order matters — the checks are on adjacent pairs, which is exactly
what sits side by side in the donut and the stacked budget bar. Re-run the
validator before reordering or restyling them.

The interesting logic lives in `domain/` as plain functions so it can be tested
without a browser. 105 tests cover the parts that are easy to get subtly wrong:
date intersection, weighted tallies, debt netting, clustering, and the planner's
constraints.

```bash
npm test
```

### Integrations

Every service checks for a configured endpoint and falls back to a local
implementation if there isn't one, so nothing on the demo path depends on an API
key arriving in time. Copy `.env.example` to `.env` to point at real ones.

| Feature | Live | Fallback |
| --- | --- | --- |
| Itinerary, replan, booking parse, social extract | `VITE_AI_ENDPOINT` | Deterministic local planner |
| Flights, stays, rides | `VITE_AMADEUS_ENDPOINT` | Seeded sample pricing |
| Translation | `VITE_TRANSLATE_ENDPOINT` | Offline glossary + phrasebook |
| SMS / email / push | Twilio, SendGrid | In-app outbox on the Check-ins tab |
| Maps | Maps SDK | Local geocoding + SVG projection |

The endpoints are expected to be **your own server-side proxies**. A `VITE_`
variable is inlined into the browser bundle, so a provider key placed in one is
public. `services/ai.ts` documents the prompt and the JSON schema each call
expects, and the local fallback returns the same shape — swapping one for the
other changes nothing downstream.

### Demo controls

Profile has a simulated clock (`+1 day`, `+1 week`) so a trip can be walked
forward without waiting, and a reset that restores the starting data. State is
per-browser in `localStorage`; nothing leaves the device.

Three destinations ship with curated data — Kota Kinabalu, Tokyo and Penang —
each with month-by-month seasonal profiles, places, regional dishes, and the
stickers derived from them. Adding a destination to `data/destinations.ts` gets
its stickers, phrasebook hooks and planner coverage for free.

---

## Known limits

- Group sync is local rather than a real-time backend. The waiting screen,
  voting and availability all read the same store; switching "who you are" on a
  screen stands in for a second person on a second device.
- Social extraction resolves pasted links against the destination's own place
  data. Live Instagram and TikTok access needs platform approval well beyond a
  hackathon timeline, which is why pasted links are the supported route.
- Recap video export is stubbed; the public link renders the same recap
  read-only in a browser.
- The world map is an equirectangular SVG with bounding-box country shading,
  not a tiled map.
