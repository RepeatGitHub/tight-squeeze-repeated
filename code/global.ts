import {AreaComp, ColorComp, GameObj, PosComp, SolidComp, SpriteComp, Vec2} from "kaboom";

export default class Global {
    static init(mouse: Vec2) {
        addEventListener("mousemove", e => {
            mouse.x = Math.floor((e.x - canvas.getBoundingClientRect().x) / canvas.getBoundingClientRect().width * 1000);
            mouse.y = Math.floor((e.y - canvas.getBoundingClientRect().y) / canvas.getBoundingClientRect().height * 1000);
        });

        loadSound("music", "sounds/music.mp3").catch(console.error);
        loadSound("finish", "sounds/finish.wav").catch(console.error);
        loadSound("switch", "sounds/switch.wav").catch(console.error);
        loadSound("move", "sounds/move.wav").catch(console.error);

        loadSprite("player", "sprites/player.png").catch(console.error);
        loadSprite("block", "sprites/block.png").catch(console.error);
        loadSprite("grid", "sprites/grid.png").catch(console.error);
        loadSprite("switch", "sprites/switch.png").catch(console.error);
    }
}

export class Level {
    hasWon: boolean;

    constructor(options: LevelInitInfo, onComplete: () => void, onReset: () => void) {
        const cellSize = Math.floor(2000 / options.size) / 2;
        this.hasWon = false;
        let moving = false;

        // Add grid
        for (let i = 0; i < options.size; i++) {
            for (let j = 0; j < options.size; j++) {
                let grid: (SpriteComp|PosComp|ColorComp|string)[] = [
                    sprite(`grid`, {width: cellSize, height: cellSize, quad: quad(i % 4 * 0.25, j % 4 * 0.25, 0.25, 0.25)}),
                    pos(i * cellSize, j * cellSize),
                    "grid"
                ];
                if (i >= options.goalX && i <= options.goalX + 4 && j >= options.goalY && j <= options.goalY + 4) grid.push(color(100, 100, 100));
                add(grid);
            }
        }

        // Add edges
        add([
            pos(0, 0),
            area({width: 1, height: 1000}),
            solid()
        ]);
        add([
            pos(999, 0),
            area({width: 1, height: 1000}),
            solid()
        ]);
        add([
            pos(0, 0),
            area({width: 1000, height: 1}),
            solid()
        ]);
        add([
            pos(0, 999),
            area({width: 1000, height: 1}),
            solid()
        ]);

        // Add goal
        const goal = add([
            pos(options.goalX * cellSize, options.goalY * cellSize),
            area({width: cellSize * 5, height: cellSize * 5}),
            "goal"
        ]);

        // Add switches
        for (let i = 0; i < options.switches.length; i++) {
            add([
                sprite("switch", {width: cellSize, height: cellSize}),
                pos(options.switches[i].x * cellSize, options.switches[i].y * cellSize),
                area({width: cellSize, height: cellSize}),
                "switch"
            ]);
        }

        // Add block
        const block = add([
            sprite("block", {width: cellSize * 5, height: cellSize * 5}),
            area({width: cellSize * 5 - 2, height: cellSize * 5 - 2}),
            solid(),
            pos(options.blockX * cellSize + 1, options.blockY * cellSize + 1),
            "block"
        ]);

        // Add player
        const player = add([
            sprite("player", {width: cellSize, height: cellSize, }),
            area({width: cellSize - 2, height: cellSize - 2}),
            solid(),
            pos(options.playerX * cellSize + 1, options.playerY * cellSize + 1),
            "player"
        ]);

        // Add walls
        for (let i = 0; i < options.walls.length; i++) {
            let wall = options.walls[i];
            add([
                pos(wall.x * cellSize - 1, wall.y * cellSize - 1),
                area({width: wall.dir === "vertical" ? 2 : wall.length * cellSize + 2, height: wall.dir === "vertical" ? wall.length * cellSize + 2 : 2}),
                solid(),
                "wallCollision"
            ]);
            add([
                rect(wall.dir === "vertical" ? 6 : wall.length * cellSize, wall.dir === "vertical" ? wall.length * cellSize : 6),
                pos(wall.dir === "vertical" ? wall.x * cellSize - 3 : wall.x * cellSize, wall.dir === "vertical" ? wall.y * cellSize : wall.y * cellSize - 3),
                color(0, 255, 0)
            ])
        }
        for (let i = 0; i < options.switchWalls.length; i++) {
            let wall = options.switchWalls[i];
            add([
                pos(wall.x * cellSize - 1, wall.y * cellSize - 1),
                area({width: wall.dir === "vertical" ? 2 : wall.length * cellSize + 2, height: wall.dir === "vertical" ? wall.length * cellSize + 2 : 2}),
                solid(),
                color(0, 0, 255),
                "switchWallCollision"
            ]);
            add([
                rect(wall.dir === "vertical" ? 6 : wall.length * cellSize, wall.dir === "vertical" ? wall.length * cellSize : 6),
                pos(wall.dir === "vertical" ? wall.x * cellSize - 3 : wall.x * cellSize, wall.dir === "vertical" ? wall.y * cellSize : wall.y * cellSize - 3),
                color(0, 0, 255),
                opacity(1),
                "switchWallModel"
            ]);
        }

        function wallAt(x: number, y: number): boolean {
            // @ts-ignore
            let walls: GameObj<AreaComp | SolidComp>[] = get("wallCollision").concat(get("switchWallCollision"));
            for (let wall of walls) {
                if (wall.hasPoint(vec2(x, y)) && wall.solid) return true;
            }
            return false;
        }

        // Directional movement
        keyPress(["left", "a"], async () => {
            if (this.hasWon || moving) return;
            moving = true;
            let sound = play("move");
            for (let i = 0; i < 4; i++) {
                if (player.pos.x === block.pos.x + cellSize * 5 && player.pos.y === block.pos.y + cellSize * 2 && !wallAt(player.pos.x - 1, player.pos.y)) block.moveBy(cellSize / -4, 0);
                player.moveBy(cellSize / -4, 0);
                await wait(0);
            }
            player.pos.x++;
            if (player.pos.x % cellSize !== 1) player.pos.x = player.pos.x - player.pos.x % cellSize + 1;
            sound.stop();
            moving = false;
        });

        keyPress(["right", "d"], async () => {
            if (this.hasWon || moving) return;
            moving = true;
            let sound = play("move");
            for (let i = 0; i < 4; i++) {
                if (player.pos.x === block.pos.x - cellSize && player.pos.y === block.pos.y + cellSize * 2 && !wallAt(player.pos.x + cellSize - 1, player.pos.y)) block.moveBy(cellSize / 4, 0);
                player.moveBy(cellSize / 4, 0);
                await wait(0);
            }
            if (player.pos.x % cellSize !== 1) player.pos.x = player.pos.x - player.pos.x % cellSize + 1;
            sound.stop();
            moving = false;
        });

        keyPress(["up", "w"], async () => {
            if (this.hasWon || moving) return;
            moving = true;
            let sound = play("move");
            for (let i = 0; i < 4; i++) {
                if (player.pos.x === block.pos.x + cellSize * 2 && player.pos.y === block.pos.y + cellSize * 5 && !wallAt(player.pos.x, player.pos.y - 1)) block.moveBy(0, cellSize / -4);
                player.moveBy(0, cellSize / -4);
                await wait(0);
            }
            player.pos.y++;
            if (player.pos.y % cellSize !== 1) player.pos.y = player.pos.y - player.pos.y % cellSize + 1;
            sound.stop();
            moving = false;
        });

        keyPress(["down", "s"], async () => {
            if (this.hasWon || moving) return;
            moving = true;
            let sound = play("move");
            for (let i = 0; i < 4; i++) {
                if (player.pos.x === block.pos.x + cellSize * 2 && player.pos.y === block.pos.y - cellSize && !wallAt(player.pos.x, player.pos.y + cellSize - 1)) block.moveBy(0, cellSize / 4);
                player.moveBy(0, cellSize / 4);
                await wait(0);
            }
            if (player.pos.y % cellSize !== 1) player.pos.y = player.pos.y - player.pos.y % cellSize + 1;
            sound.stop();
            moving = false;
        });

        // Reset on "R"
        keyPress("r", async () => {
            onReset();
        });

        block.collides("switch", () => {
            play("switch");
        })

        action(async () => {
            if (goal.pos.x === block.pos.x - 1 && goal.pos.y === block.pos.y - 1 && !this.hasWon) {
                this.hasWon = true;
                every("grid", i => i.color = {r: 255, g: 255, b: 0});
                play("finish");
                await wait(3);
                onComplete();
                this.hasWon = false;
            }
            if (get("switch").find((switchObj: GameObj<AreaComp>) => switchObj.isTouching(block))) {
                every("switchWallCollision", i => i.solid = false);
                every("switchWallModel", i => i.opacity = 0.5);
            } else {
                every("switchWallCollision", i => i.solid = true);
                every("switchWallModel", i => i.opacity = 1);
            }
        })
    }
}

export type WallInitInfo = {
    x: number,
    y: number,
    dir: string,
    length: number
}

export type SwitchInitInfo = {
    x: number,
    y: number
}

export type LevelInitInfo = {
    playerX: number,
    playerY: number,
    blockX: number,
    blockY: number,
    goalX: number,
    goalY: number,
    walls: WallInitInfo[],
    switchWalls: WallInitInfo[],
    switches: SwitchInitInfo[],
    size: number
}