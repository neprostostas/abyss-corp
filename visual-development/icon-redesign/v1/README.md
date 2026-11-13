# Abyss Corp icon proposals v1 — awaiting user approval

Review gallery: http://127.0.0.1:5174/visual-development/icon-redesign/v1/index.html
Overview sheet: overview.html

48 unique proposals were generated individually with the built-in image_gen tool. Each PNG retains the generated alpha channel and original resolution. No production SVG, React icon component, prototype icon binding, account branding or game asset was replaced.

## Coverage

- All 32 identifiers in src/ui/components/GameIcon.tsx.
- Four additional ResourceGlyph resources: gold, pearl, titanium alloy and luminous core. The crystal resource shares the `crystal` proposal.
- Ten login providers from ProviderIcon.tsx: Google, Facebook, Discord, GitHub, Twitch, X, Telegram, Steam, LinkedIn and Microsoft/Azure.
- Email badge from ProviderBadge.tsx.
- Abyss submarine brand mark (the duplicated prototype SVG is the same logical asset).
- The four machine portraits map to mining / transport / processing / storage proposals. This is an icon redesign, not a redesign of every equipment upgrade model or complete SVG scene illustration.

Original source icons were exported into originals/ for side-by-side review. Background illustrations, atmosphere, timeline charts and outpost SVG art are not interface icons and are outside this set. Existing raster avatars were not altered.

## Generation

Built-in tool, one request per asset, genuine transparent-background mode. The original style-reference.png supplies the cream/golden yellow/deep teal/turquoise material language. The generated coin is the secondary family consistency reference. Per-asset exact prompts are saved as <id>.prompt.txt. Provider prompts prioritize recognizable native brand shapes/colors over the game's palette; these are artistic proposals and should be reviewed alongside their originals.

Style specification: simple readable manufactured silhouettes, soft bevels, a consistent three-quarter view and upper-left soft light, satin enamel, restrained highlights, minimal detail and no scenery, pedestals, decorative bubbles, extra text or watermarks.

## Review workflow

index.html offers family/search filters, dark/light/checkerboard backgrounds, original SVGs and new previews at 24/32/48px. Likes, revision requests and notes persist only in localStorage under abyss.icon-review.v1; the export button saves a review JSON file. No review selection automatically changes the game. User confirmation precedes any replacement work.

After approval, integration should map each old identifier to the accepted asset, normalize optical size where needed, optimize delivery sizes, preserve accessible labels and recheck actual button sizes and contrast. Functional controls such as close/check/pause require especially careful small-size review.

Run `python3 visual-development/icon-redesign/v1/validate.py` to inspect files and transparency without modifying pixels; qa.json contains the resulting inventory.
