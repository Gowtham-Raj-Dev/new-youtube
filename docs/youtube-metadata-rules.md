# Moolai Illa Machan — YouTube metadata rules

Every Short's title, description and keywords must pass these checks, or YouTube rejects the whole upload.
The code enforces them, so follow these rules whenever you write tags by hand or change the tag builders.

## Keywords (tags) — the "invalid video keywords" error

**What happened (Oct 2026):** a Friends & Life Short ("Switch on pannen… aanaa charge eravae illa!") was rejected with
`The request metadata specifies invalid video keywords.` The app showed **471 / 500**, so it looked fine.

**Why:** YouTube counts keywords differently from a plain join:

| Rule | Example | YouTube counts |
|---|---|---|
| Each tag's letters | `machan` | 6 |
| **+2 for quotes if the tag has a space** | `tamil comedy` → `"tamil comedy"` | 12 + 2 = **14** |
| +1 comma between tags | | 1 each |

Almost every tag we use has a space ("tamil comedy shorts", "machan comedy"…), so 25 tags add about 50 hidden characters.
471 by our old count was about **520** by YouTube's count, which is over the 500 limit, so YouTube rejected it.

**The rules now:**
- Count with `youtubeTagChars()` from `@shortflow/shared` ([packages/shared/src/format.ts](../packages/shared/src/format.ts)), never `tags.join(",").length`.
- Generated tags fill up to **450** (`YOUTUBE_TAG_CHARS_SAFE`), leaving 50 spare under YouTube's 500.
- At most **30 tags**, each at most 100 characters.
- No `<`, `>`, `,` or `"` inside a tag, and no leading `#`. Hashtags belong in the title and description, not the tags.
- No duplicate tags (case doesn't matter).
- Build tag lists with `fitYoutubeTags(tags, YOUTUBE_TAG_CHARS_SAFE)`: it cleans them, keeps the order and drops the ones that don't fit.

**Where it's enforced:**
- [functions/src/auto/bank.ts](../functions/src/auto/bank.ts): both tag builders use `fitYoutubeTags(…, 450)`.
- [functions/src/youtube/upload.ts](../functions/src/youtube/upload.ts): every upload runs the tags through `fitYoutubeTags` again (500 limit) as a last guard, so a hand-edited or older Short can't be rejected for this.
- The Short editor and Settings counters in the web app use the same count, so **x / 500** in the app matches YouTube.

## Title

- At most **100 characters**. The hook titles are filled to 90–99.
- No `<` or `>`.

## Description

- At most **5000 characters**.
- At most **15 hashtags across the title and description together**. With more, YouTube ignores all of them.

## Checking before you add a day's Shorts

`npm run add-to-app -- <day>` (no `--go`) prints each Short's tag count *as YouTube counts it*. Every one should be 450 or under.

## Fixing Shorts already in the app

Shorts added before this fix keep their old, too-long tags until they're trimmed. To trim them, run this from `functions/`:

```
npx esbuild scripts/fix-tags.ts --bundle --platform=node --target=node22 --format=cjs --outfile=.local/fix-tags.js --log-level=warning --external:firebase-admin --alias:@shortflow/shared=../packages/shared/src/index.ts
node .local/fix-tags.js         # shows each Short's count
node .local/fix-tags.js --go    # saves the trimmed tags
```

It only touches Moolai Illa Machan Shorts that aren't on YouTube yet. It keeps the first tags (the joke's own search words) and drops the generic ones at the end.
On 18 Oct 2026 it trimmed all 11 Shorts in the app: they had been 525–551 by YouTube's count, and are now 442–450.

## If YouTube rejects a Short again

1. Read the red message in the Short details panel. It is YouTube's own reason.
2. Keywords: remove a few long multi-word tags until the counter is well under 500, then queue it again.
   The upload guard trims them anyway, so simply re-queueing works too.
3. Any new kind of rejection: add the rule to this file and enforce it in `upload.ts`, so it can't happen twice.
