# Country Rush LIVE — TikTok Race Demo

A vertical 9:16 interactive country horse race prepared for TikTok LIVE Studio.

## Demo controls
- Click a country to select it and trigger demo boosts.
- Repeated clicks cycle through Rose (+2m), Gift (+5m), Rocket (+12m), Crown (+25m).
- Random Gift picks a random country and gift.
- First country to 100m wins.
- Next Race starts a fresh round.

## Deploy on Vercel
This is a static site. Upload this folder to a GitHub repo and import it into Vercel, or run `vercel` in the folder.

## Next integration step
Replace the demo click handler with incoming TikTok LIVE gift events from a small event listener/backend. Map each gift/viewer/team to `addGift(countryId, giftType)`.
