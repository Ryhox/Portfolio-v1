# ryhox — portfolio

Next.js 16 + React Three Fiber + GSAP ScrollTrigger + Lenis.

```bash
npm install
npm run dev
```

## Where things live

- `src/content.ts` — all copy: statement, projects (videos and posters in `public/work/`), abilities, socials.
- `src/links.ts` — every outbound URL.
- `src/playlist.ts` — the songs on the ryPod (Apple Music IDs; previews, covers and links are looked up from Apple).
- `src/components/Motion.tsx` — DOM scroll choreography (word reveal, pinned constellation stage, horizontal gallery, "Say hi").
- `src/components/three/` — the main 3D layer: hero lettering, bubbles, charms, the About night sky (`AboutSky.tsx`, figures in `constellations.ts`), holographic materials.
- `src/components/stage/` — the cat and the bubble garden (a second canvas above the page).
- `src/components/IPod.tsx` + `src/components/ipod/` — the ryPod, a working iPod Classic in the bottom-right corner:
  - `IPodModel.tsx` (the 3D model, its live screen, the click wheel), `screen.ts` (what the screen draws), `os.ts` (menus and what every control does), `player.ts` (Apple Music previews), `clicker.ts`, `games/` (Snake, Tetris, Brick, Pong, 2048).
- `src/app/legal`, `src/app/privacy` — legal notice + credits, and the privacy policy (fill in the hosting provider).

## Asset scripts

- `npm run cat` — strips the Sketchfab trio down to one cat (`public/models/cat.glb`).
- `npm run ipod -- path/to/ipod_classic.glb` — bakes `public/models/ipod.glb` from the Sketchfab download (drops the pictured screen and the glass pass, 1K WebP textures).

## Credits

- "Chonky Cat Trio" by Kanna-Nakajima, CC BY 4.0.
- "iPod Classic" by Timothy Ahene, CC BY 4.0.

Both are credited in the footer and on `/legal`. iPod is a trademark of Apple Inc.; the ryPod is a fan-made toy.
