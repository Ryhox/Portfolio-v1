# ryhox: portfolio

Next.js 16 + React Three Fiber + GSAP ScrollTrigger + Lenis.

```bash
npm install
npm run dev
```

## Where things live

- `src/content.ts`: all copy: statement, projects (videos and posters in `public/work/`), abilities, quotes.
- `src/links.ts`: every outbound URL.
- `src/playlist.ts`: the ryPod's playlists (Apple Music IDs; previews, covers and links are looked up from Apple).
- `src/components/Motion.tsx`: the scroll choreography (statement, tech stack rows, the sideways gallery, "Say hi").
- `src/components/three/`: the sky behind the page, one fullscreen shader (`Backdrop.tsx`: clouds, the tech stack's Liquid Glass, the hill at the end).
- `src/components/CloudPass.tsx`: the flight through the clouds between About and the work.
- `src/components/SmoothScroll.tsx`: Lenis, in-page links, and keeping your place when the window is resized.
- `src/components/IPod.tsx` + `src/components/ipod/`: the ryPod, a working iPod Classic in the bottom-right corner:
  - `IPodModel.tsx` (the 3D model, its live screen, the click wheel), `screen.ts` (what the screen draws), `os.ts` (menus and what every control does), `player.ts` (Apple Music previews), `clicker.ts` (the sounds), `games/` (Snake, Tetris, Brick, Pong, 2048).
- `src/components/MiniPlayer.tsx`, `TabTitle.tsx`: the now-playing capsule, and the tab's title.
- `src/lib/theme.ts`: day and night (and the tab icon, `public/icons/`).
- `src/app/legal`, `src/app/privacy`: legal notice and credits, and the privacy policy.

## Asset scripts

- `npm run ipod -- path/to/ipod_classic.glb`: bakes `public/models/ipod.glb` from the Sketchfab download (drops the pictured screen and the glass pass, 1K WebP textures).

## Credits

- "iPod Classic" by Timothy Ahene, CC BY 4.0.

Credited in the footer and on `/legal`. iPod is a trademark of Apple Inc.; the ryPod is a fan-made toy.
