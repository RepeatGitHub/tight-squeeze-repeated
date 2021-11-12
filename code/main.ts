import kaboom, {AreaComp, ColorComp, GameObj, OpacityComp, OriginComp, PosComp, ScaleComp, SpriteComp} from "kaboom";

const kbm = kaboom({
    width: 1000,
    height: 1000,
    background: [255, 255, 255],
    font: "sinko"
});

let level = 1;
let hasWon = false;
let moving = false;
let music;
let mouse = vec2();

onmousemove = e => {
    mouse.x = Math.floor((e.x - canvas.getBoundingClientRect().x) / canvas.getBoundingClientRect().width * 1000);
    mouse.y = Math.floor((e.y - canvas.getBoundingClientRect().y) / canvas.getBoundingClientRect().height * 1000);
};

loadSound("music", "sounds/music.mp3").catch(console.error);
loadSound("finish", "sounds/finish.wav").catch(console.error);
loadSound("switch", "sounds/switch.wav").catch(console.error);
loadSound("move", "sounds/move.wav").catch(console.error);

loadSprite("player", "sprites/player.png").catch(console.error);
loadSprite("block", "sprites/block.png").catch(console.error);
loadSprite("grid", "sprites/grid.png").catch(console.error);
loadSprite("switch", "sprites/switch.png").catch(console.error);

type WallInitInfo = {
    x: number,
    y: number,
    dir: "vertical" | "horizontal",
    length: number
}

type LevelInitInfo = {
    playerX: number,
    playerY: number,
    blockX: number,
    blockY: number,
    goalX: number,
    goalY: number,
    walls: WallInitInfo[],
    switchWalls: WallInitInfo[],
    switchX?: number,
    switchY?: number,
    size: number
}

async function transition(overlay: GameObj<OpacityComp>, fadeIn: boolean, change = 0.1, count = 10, each: (i: number) => void = () => {}) {
    for (let i = 0; i < count; i++) {
        overlay.opacity += (fadeIn ? -1 : 1) * change;
        each(i);
        await wait(0);
    }
}

function createOverlay(defaultOpacity = 1) {
    return add([
        rect(1000, 1000),
        color(0, 0, 0),
        opacity(defaultOpacity),
        z(99)
    ]);
}

async function addLevel(options: LevelInitInfo = {
    playerX: 0,
    playerY: 3,
    blockX: 3,
    blockY: 3,
    goalX: 5,
    goalY: 5,
    walls: [{
        x: 0,
        y: 2,
        dir: "horizontal",
        length: 10
    }],
    switchWalls: [],
    size: 10
}) {
    const cellSize = 1000 / options.size;
    let switchObj;

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

    // Add switch
    if (typeof options.switchX === "number" && typeof options.switchY === "number") {
        switchObj = add([
            sprite("switch", {width: cellSize, height: cellSize}),
            pos(options.switchX * cellSize, options.switchY * cellSize),
            area({width: cellSize, height: cellSize})
        ])
    }

    // Add player
    const player = add([
        sprite("player", {width: cellSize, height: cellSize, }),
        area({width: cellSize - 2, height: cellSize - 2}),
        solid(),
        pos(options.playerX * cellSize + 1, options.playerY * cellSize + 1),
        "player"
    ]);

    // Add block
    const block = add([
        sprite("block", {width: cellSize * 5, height: cellSize * 5}),
        area({width: cellSize * 5 - 2, height: cellSize * 5 - 2}),
        solid(),
        pos(options.blockX * cellSize + 1, options.blockY * cellSize + 1),
        "block"
    ]);

    // Add walls
    for (let i = 0; i < options.walls.length; i++) {
        let wall = options.walls[i];
        add([
            pos(wall.dir === "vertical" ? wall.x * cellSize - 1 : wall.x * cellSize, wall.dir === "vertical" ? wall.y * cellSize : wall.y * cellSize - 1),
            area({width: wall.dir === "vertical" ? 2 : wall.length * cellSize, height: wall.dir === "vertical" ? wall.length * cellSize : 2}),
            solid(),
            color(0, 0, 0)
        ]);
        add([
            rect(wall.dir === "vertical" ? 6 : wall.length * cellSize, wall.dir === "vertical" ? wall.length * cellSize : 6),
            pos(wall.dir === "vertical" ? wall.x * cellSize - 3 : wall.x * cellSize, wall.dir === "vertical" ? wall.y * cellSize : wall.y * cellSize - 3),
            color(0, 0, 0)
        ])
    }
    for (let i = 0; i < options.switchWalls.length; i++) {
        let wall = options.switchWalls[i];
        add([
            pos(wall.dir === "vertical" ? wall.x * cellSize - 1 : wall.x * cellSize, wall.dir === "vertical" ? wall.y * cellSize : wall.y * cellSize - 1),
            area({width: wall.dir === "vertical" ? 2 : wall.length * cellSize, height: wall.dir === "vertical" ? wall.length * cellSize : 2}),
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

    // Directional movement
    keyPress(["left", "a"], async () => {
        if (hasWon || moving) return;
        moving = true;
        let sound = play("move");
        for (let i = 0; i < 4; i++) {
            if (player.pos.x === block.pos.x + cellSize * 5 && player.pos.y === block.pos.y + cellSize * 2 ) block.moveBy(cellSize / -4, 0);
            player.moveBy(cellSize / -4, 0);
            await wait(0);
        }
        player.pos.x++;
        if (player.pos.x % cellSize !== 1) player.pos.x = player.pos.x - player.pos.x % cellSize + 1;
        sound.stop();
        moving = false;
    });

    keyPress(["right", "d"], async () => {
        if (hasWon || moving) return;
        moving = true;
        let sound = play("move");
        for (let i = 0; i < 4; i++) {
            if (player.pos.x === block.pos.x - cellSize && player.pos.y === block.pos.y + cellSize * 2) block.moveBy(cellSize / 4, 0);
            player.moveBy(cellSize / 4, 0);
            await wait(0);
        }
        if (player.pos.x % cellSize !== 1) player.pos.x = player.pos.x - player.pos.x % cellSize + 1;
        sound.stop();
        moving = false;
    });

    keyPress(["up", "w"], async () => {
        if (hasWon || moving) return;
        moving = true;
        let sound = play("move");
        for (let i = 0; i < 4; i++) {
            if (player.pos.x === block.pos.x + cellSize * 2 && player.pos.y === block.pos.y + cellSize * 5) block.moveBy(0, cellSize / -4);
            player.moveBy(0, cellSize / -4);
            await wait(0);
        }
        player.pos.y++;
        if (player.pos.y % cellSize !== 1) player.pos.y = player.pos.y - player.pos.y % cellSize + 1;
        sound.stop();
        moving = false;
    });

    keyPress(["down", "s"], async () => {
        if (hasWon || moving) return;
        moving = true;
        let sound = play("move");
        for (let i = 0; i < 4; i++) {
            if (player.pos.x === block.pos.x + cellSize * 2 && player.pos.y === block.pos.y - cellSize) block.moveBy(0, cellSize / 4);
            player.moveBy(0, cellSize / 4);
            await wait(0);
        }
        if (player.pos.y % cellSize !== 1) player.pos.y = player.pos.y - player.pos.y % cellSize + 1;
        sound.stop();
        moving = false;
    });

    let paused = false;

    // Reset on "R"
    keyPress("r", async () => {
        if (paused) {
            paused = false;
            hasWon = false;
            paused1.opacity = 0;
            paused2.opacity = 0;
            paused3.opacity = 0;
            await transition(overlay, false, 0.05);
            music.stop();
            go(`levelSelect`);
        } else {
            if (hasWon) return;
            await transition(overlay, false);
            go(`level${level}`);
        }
    });

    if (switchObj) switchObj.collides("block", () => {
        play("switch");
    })

    let paused1 = add([
        text("Paused", {size: 100}),
        pos(0,0),
        opacity(0),
        z(100)
    ]);
    paused1.moveTo(500 - paused1.width / 2, 200);

    let paused2 = add([
        text("Press P to Continue", {size: 50}),
        pos(0,0),
        opacity(0),
        z(100)
    ]);
    paused2.moveTo(500 - paused2.width / 2, 500);

    let paused3 = add([
        text("Press R for Level Select", {size: 50}),
        pos(0,0),
        opacity(0),
        z(100)
    ]);
    paused3.moveTo(500 - paused3.width / 2, 525 + paused2.height);

    keyPress("p", async() => {
        if (paused) {
            await transition(overlay, true, 0.1, 5, i => {
                paused1.opacity -= 0.2;
                paused2.opacity -= 0.2;
                paused3.opacity -= 0.2;
                music.volume(0.5 + (i + 1) * 0.1);
            });
            hasWon = false;
            paused = false;
        } else {
            if (hasWon) return;
            paused = true;
            hasWon = true;
            await transition(overlay, false, 0.1, 5, i => {
                paused1.opacity += 0.2;
                paused2.opacity += 0.2;
                paused3.opacity += 0.2;
                music.volume(1 - (i + 1) * 0.1);
            });
        }
    });

    let overlay = createOverlay();

    action(async () => {
        if (goal.pos.x === block.pos.x - 1 && goal.pos.y === block.pos.y - 1 && !hasWon) {
            hasWon = true;
            every("grid", i => i.color = {r: 255, g: 255, b: 0});
            play("finish");
            await wait(3);
            level++;
            await transition(overlay, false);
            go(`level${level}`);
            if (getData("currentLevel", 1) < level) setData("currentLevel", level);
            hasWon = false;
        }
        if (switchObj) {
            if (block.isTouching(switchObj)) {
                every("switchWallCollision", i => i.solid = false);
                every("switchWallModel", i => i.opacity = 0.5);
            } else {
                every("switchWallCollision", i => i.solid = true);
                every("switchWallModel", i => i.opacity = 1);
            }
        }
    })

    await transition(overlay, true);
}

scene("level1", async () => {
    add([
        text("WASD or arrows to move.\nPush the block at the center\nof its sides. \nPress R to reset, P to pause.", {size: 40}),
        pos(20, 15),
        z(98)
    ]);
    await addLevel();
})

scene("level2", async () => {
    add([
        text("Press P to Pause", {size: 40}),
        pos(20, 15),
        z(98)
    ]);
    await addLevel({
        playerX: 0,
        playerY: 2,
        blockX: 3,
        blockY: 3,
        goalX: 5,
        goalY: 5,
        walls: [{
            x: 9,
            y: 2,
            dir: "vertical",
            length: 3
        }, {
            x: 1,
            y: 9,
            dir: "horizontal",
            length: 3
        }, {
            x: 0,
            y: 1,
            dir: "horizontal",
            length: 10
        }, {
            x: 1,
            y: 9,
            dir: "horizontal",
            length: 3
        }],
        switchWalls: [],
        size: 10
    });
});

scene("level3", async () => {
    await addLevel({
        playerX: 0,
        playerY: 4,
        blockX: 1,
        blockY: 1,
        goalX: 5,
        goalY: 5,
        walls: [{
            x: 7,
            y: 5,
            dir: "horizontal",
            length: 3
        }, {
            x: 2,
            y: 0,
            dir: "vertical",
            length: 1
        }, {
            x: 4,
            y: 1,
            dir: "horizontal",
            length: 3
        }],
        switchWalls: [],
        size: 10
    });
});

scene("level4", async () => {
    await addLevel({
        playerX: 0,
        playerY: 4,
        blockX: 1,
        blockY: 1,
        goalX: 10,
        goalY: 1,
        walls: [{
            x: 4,
            y: 0,
            dir: "vertical",
            length: 1
        }, {
            x: 4,
            y: 1,
            dir: "horizontal",
            length: 3
        }, {
            x: 0,
            y: 5,
            dir: "horizontal",
            length: 1
        }, {
            x: 0,
            y: 8,
            dir: "horizontal",
            length: 2
        }, {
            x: 1,
            y: 10,
            dir: "horizontal",
            length: 4
        }, {
            x: 7,
            y: 1,
            dir: "vertical",
            length: 4
        }, {
            x: 10,
            y: 14,
            dir: "vertical",
            length: 2
        }, {
            x: 10,
            y: 4,
            dir: "vertical",
            length: 4
        }],
        switchWalls: [],
        size: 16
    });
});

scene("level5", async () => {
    await addLevel({
        playerX: 15,
        playerY: 14,
        blockX: 10,
        blockY: 10,
        goalX: 1,
        goalY: 11,
        walls: [{
            x: 14,
            y: 8,
            dir: "horizontal",
            length: 2
        }, {
            x: 3,
            y: 7,
            dir: "vertical",
            length: 1
        }, {
            x: 7,
            y: 7,
            dir: "horizontal",
            length: 6
        }, {
            x: 6,
            y: 0,
            dir: "vertical",
            length: 7
        }, {
            x: 6,
            y: 13,
            dir: "vertical",
            length: 3
        }, {
            x: 1,
            y: 0,
            dir: "vertical",
            length: 16
        }, {
            x: 15,
            y: 11,
            dir: "horizontal",
            length: 1
        }, {
            x: 10,
            y: 14,
            dir: "vertical",
            length: 2
        }, {
            x: 11,
            y: 15,
            dir: "vertical",
            length: 1
        }, {
            x: 10,
            y: 15,
            dir: "horizontal",
            length: 1
        }, {
            x: 8,
            y: 14,
            dir: "vertical",
            length: 2
        },  {
            x: 7,
            y: 14,
            dir: "horizontal",
            length: 1
        },  {
            x: 7,
            y: 13,
            dir: "vertical",
            length: 1
        },  {
            x: 9,
            y: 12,
            dir: "vertical",
            length: 4
        }],
        switchWalls: [],
        size: 16
    });
});

scene("level6", async () => {
    add([
        text("The circle is a switch.When\nthe block sits on top of it, \nall blue walls allow you to\nwalk through them.", {size: 40}),
        pos(20, 15),
        z(98)
    ]);
    await addLevel({
        playerX: 0,
        playerY: 3,
        blockX: 3,
        blockY: 3,
        goalX: 4,
        goalY: 2,
        switchX: 8,
        switchY: 5,
        walls: [{
          x: 0,
          y: 2,
          dir: "horizontal",
          length: 10
        }, {
          x: 4,
          y: 2,
          dir: "vertical",
          length: 1
        }],
        switchWalls: [{
          x: 4,
          y: 8,
          dir: "vertical",
          length: 2
        }],
        size: 10
    });
});

scene("level7", async () => {
    await addLevel({
        playerX: 0,
        playerY: 3,
        blockX: 3,
        blockY: 2,
        goalX: 5,
        goalY: 5,
        switchX: 8,
        switchY: 6,
        walls: [{
          x: 3,
          y: 7,
          dir: "horizontal",
          length: 1
        }, {
          x: 3,
          y: 2,
          dir: "horizontal",
          length: 1
        }, {
          x: 2,
          y: 0,
          dir: "vertical",
          length: 6
        }, {
          x: 3,
          y: 5,
          dir: "vertical",
          length: 2
        }, {
          x: 9,
          y: 4,
          dir: "vertical",
          length: 1
        }, {
          x: 3,
          y: 0,
          dir: "vertical",
          length: 4
        }],
        switchWalls: [{
          x: 4,
          y: 7,
          dir: "vertical",
          length: 3
        }],
        size: 10
    });
});

scene("level8", async () => {
    await addLevel({
        playerX: 1,
        playerY: 3,
        blockX: 2,
        blockY: 3,
        goalX: 3,
        goalY: 7,
        switchX: 7,
        switchY: 7,
        walls: [{
          x: 1,
          y: 0,
          dir: "vertical",
          length: 16,
        }, {
          x: 7,
          y: 0,
          dir: "vertical",
          length: 2
        }, {
          x: 10,
          y: 3,
          dir: "horizontal",
          length: 2
        }, {
          x: 12,
          y: 3,
          dir: "vertical",
          length: 2
        }, {
          x: 12,
          y: 5,
          dir: "vertical",
          length: 4
        }, {
          x: 12,
          y: 10,
          dir: "vertical",
          length: 2
        }, {
          x: 8,
          y: 12,
          dir: "horizontal",
          length: 4
        }, {
          x: 4,
          y: 3,
          dir: "horizontal",
          length: 5 
        }],
        switchWalls: [{
          x: 7,
          y: 2,
          dir: "vertical",
          length: 1
        }, {
          x: 6,
          y: 8,
          dir: "vertical",
          length: 4
        }, {
          x: 9,
          y: 3,
          dir: "horizontal",
          length: 1
        }, {
          x: 12,
          y: 9,
          dir: "vertical",
          length: 1
        }, {
          x: 6,
          y: 12,
          dir: "horizontal",
          length: 2
        },],
        size: 16
    });
});

function grid() {
    for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
            add([
                sprite(`grid`, {width: 100, height: 100, quad: quad(i % 4 * 0.25, j % 4 * 0.25, 0.25, 0.25)}),
                pos(i * 100, j * 100),
                "grid"
            ]);
        }
    }
}

scene("level9", () => {
    grid();

    let topText = add([
        text("Thanks for Playing!", {size: 60}),
        pos(0, 0)
    ]);
    topText.moveTo(500 - topText.width / 2, 100);

    let credits = add([
        text("Creative Lead:\nXander Russell\n\nDevelopment Lead:\nMatthew Weir\n\nSound Design:\nAbigail Prowse\n\nArt Lead:\nFaith Yap", {size: 50}),
        pos(0,0)
    ]);
    credits.moveTo(500 - credits.width / 2, 500 - credits.height / 2);

    let bottomText = add([
        text("More levels coming soon!", {size: 50}),
        pos(0,0)
    ]);
    bottomText.moveTo(500 - bottomText.width / 2, 850);

});

scene("welcome", () => {
    grid();

    let box1 = add([
        sprite("block", {width: 300, height: 300}),
        pos(500, 500),
        area({width: 300, height: 300}),
        scale(),
        kbm.origin("center")
    ]);

    let text1 = add([
        text("Play", {size: 60}),
        pos(500, 500),
        scale(),
        kbm.origin("center")
    ]);

    let box2 = add([
        sprite("block", {width: 200, height: 200}),
        pos(175, 500),
        area({width: 200, height: 200}),
        scale(),
        kbm.origin("center")
    ]);

    let text2 = add([
        text("About", {size: 35}),
        pos(175, 500),
        scale(),
        kbm.origin("center")
    ]);

    let box3 = add([
        sprite("block", {width: 200, height: 200}),
        pos(825, 500),
        area({width: 200, height: 200}),
        scale(),
        kbm.origin("center")
    ]);

    let text3 = add([
        text("Level", {size: 35}),
        pos(825, 500),
        scale(),
        kbm.origin(vec2(0, 1))
    ]);
    let text4 = add([
        text("Editor", {size: 35}),
        pos(825, 500),
        scale(),
        kbm.origin(vec2(0, -1))
    ]);

    let text5 = add([
        text("Tight Squeeze", {size: 80}),
        pos(0, 0)
    ]);
    text5.moveTo(500 - (text5.width / 2), 100);

    let overlay = createOverlay(0);

    let clickAction = false;
    action(async () => {
        let hover = false;
        if (box1.hasPoint(mouse)) {
            box1.scaleTo(1.5);
            text1.scaleTo(1.5);
            hover = true;
            if (mouseIsDown() && !clickAction) {
                clickAction = true;
                await transition(overlay, false);
                go("levelSelect");
            }
        } else {
            box1.scaleTo(1);
            text1.scaleTo(1);
        }
        if (box2.hasPoint(mouse)) {
            box2.scaleTo(1.5);
            text2.scaleTo(1.5);
            hover = true;
            if (mouseIsDown() && !clickAction) {
                clickAction = true;
                await transition(overlay, false);
                go("about");
            }
        } else {
            box2.scaleTo(1);
            text2.scaleTo(1);
        }
        if (box3.hasPoint(mouse)) {
            box3.scaleTo(1.5);
            text3.scaleTo(1.5);
            text4.scaleTo(1.5);
            hover = true;
            if (mouseIsDown() && !clickAction) {
                clickAction = true;
                await transition(overlay, false);
                go("levelEditor");
            }
        } else {
            box3.scaleTo(1);
            text3.scaleTo(1);
            text4.scaleTo(1);
        }
        if (hover) {
            cursor("pointer");
        } else {
            cursor("default");
        }
    });
});

scene("levelSelect", async () => {
    let overlay = createOverlay();

    grid();

    let boxHoverFunctions: Map<GameObj<SpriteComp|PosComp|ScaleComp|AreaComp|ColorComp>, () => Promise<void>> = new Map();
    let boxUnHoverFunctions: Map<GameObj<SpriteComp|PosComp|ScaleComp|AreaComp|ColorComp>, () => Promise<void>> = new Map();

    for (let i = 1; i <= 4; i++) {
        for (let j = 1; j <= 2; j++) { // only doing 2 rows for now
            let boxArray: (SpriteComp|PosComp|ScaleComp|AreaComp|ColorComp|OriginComp|string)[] = [
                sprite("block", {width: 100, height: 100}),
                pos(200 * i, 250 * j + 50),
                scale(1),
                kbm.origin("center"),
                area({width: 100, height: 100})
            ];
            if (getData("currentLevel", 1) < i + (j - 1) * 4) {
                boxArray.push(color(50, 50, 50));
            } else {
                boxArray.push("selectBox");
            }
            let box = add(boxArray);
            if (getData("currentLevel", 1) < i + (j - 1) * 4) continue;
            let txt = add([
                text(String(i + (j - 1) * 4), {size: 40}),
                pos(200 * i, 250 * j + 50),
                scale(1),
                kbm.origin("center")
            ]);
            let clicked = false;
            boxHoverFunctions.set(box, async () => {
                box.scaleTo(1.5);
                txt.scaleTo(1.5);
                cursor("pointer");
                if (mouseIsDown() && !clicked) {
                    clicked = true;
                    await transition(overlay, false);
                    music = play("music", {
                        loop: true
                    });
                    cursor("default");
                    level = i + (j - 1) * 4;
                    go(`level${i + (j - 1) * 4}`);
                    clicked = false;
                }
            });
            boxUnHoverFunctions.set(box, async () => {
                box.scaleTo(1);
                txt.scaleTo(1);
            });
        }
    }

    let txt = add([
        text("Select a Level", {size: 75}),
        pos(0,0)
    ]);
    txt.moveTo(500 - txt.width / 2, 85);

    action(() => {
        let hover = false;
        every("selectBox", (box: GameObj<SpriteComp|PosComp|ScaleComp|AreaComp|ColorComp>) => {
            if (box.hasPoint(mouse)) {
                boxHoverFunctions.get(box)();
                hover = true;
            } else {
                boxUnHoverFunctions.get(box)();
            }
        });
        if (!hover) cursor("default");
    });

    await transition(overlay, true);
});

scene("levelEditor", () => {
    createOverlay();
    location.href = "/editor.html";
});

go("welcome");