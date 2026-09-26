import { brick } from "./brick";
import { g2048 } from "./g2048";
import type { Game } from "./game";
import { pong } from "./pong";
import { snake } from "./snake";
import { tetris } from "./tetris";

export { events, type Button, type Game, type Ui } from "./game";

// The Games menu, in order.
export const GAMES: Game[] = [snake, tetris, brick, pong, g2048];
export const gameById = (id: string) => GAMES.find((g) => g.id === id)!;
