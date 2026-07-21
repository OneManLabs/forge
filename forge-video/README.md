# Forge demo video

This Remotion project makes a 65-second Forge demo video. The video shows a user who makes a RockStack landing page from one prompt.

The video shows these operations:

1. Enter a prompt.
2. Make four variations.
3. Select one variation.
4. Convert and lock the design.
5. Change the design controls.
6. Show the final page.

## Start Remotion Studio

Run these commands from the `forge-video` directory:

```bash
npm install
npm start
```

Remotion Studio shows a timeline and a live preview. Save a source file to update the preview.

## Make output files

```bash
npm run render
npm run render:4k
npm run still:poster
```

The commands make these files:

- `out/forge-demo-1080p.mp4`
- `out/forge-demo-4k.mp4`
- `out/poster.png`

The first render downloads a Chromium headless shell. Thus, the first render can take more time.

To render one section, use a frame range:

```bash
npx remotion render ForgeVideo out/intro.mp4 --frames=0-239
npx remotion render ForgeVideo out/variations.mp4 --frames=600-1139
```

## Source layout

```text
src/Root.tsx         Composition data
src/Video.tsx        Scene sequence
src/constants.ts     Times, colors, and product data
src/helpers.ts       Animation helper functions
src/scenes           Video scenes
src/components       Forge interface and animation components
```

## Change the video

To change the product, edit `PROMPT_TEXT`, `PRODUCT_NAMES`, and `VARIATIONS` in `src/constants.ts`.

To change the colors or final text, edit `COLORS` and `src/scenes/FinalReveal.tsx`.

To change a font, edit the font imports in `src/Video.tsx`.

To increase the typing speed, decrease `typingDuration` in `src/scenes/PromptScene.tsx`.

To use 60 frames per second, set `FPS` to `60`. Then, multiply each `DURATIONS` value by two.

## Timing

All times are in `src/constants.ts`. `Video.tsx` uses these values to set the start of each scene.

Frame numbers in a scene are relative to the start of that scene.

## Problems

If the Chromium download fails, run this command:

```bash
npx remotion browser download
```

If a font is incorrect, start Remotion Studio once. Let the font download complete before you render.

The video has no audio.
