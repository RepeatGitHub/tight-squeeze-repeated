import "bootstrap";
import kaboom, {AreaComp, ColorComp, OutlineComp, PosComp, RectComp, SpriteComp} from "kaboom";

kaboom({
    width: 1000,
    height: 1000,
    background: [0, 0, 0],
    font: "sinko"
});

let mouse = vec2();
let editing = true;

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

let currentLevelData: LevelInitInfo = {
    playerX: 0,
    playerY: 0,
    blockX: 3,
    blockY: 3,
    goalX: 5,
    goalY: 5,
    walls: [],
    switchWalls: [],
    size: 10
};

function transition() {
    if (editing) {
        go("test");
        document.querySelector("#test").innerText = "Edit Level";
        document.querySelectorAll("#editor-buttons button:not(#test)").forEach(e => e.disabled = true);
    } else {
        go("edit");
        document.querySelector("#test").innerText = "Test Level";
        document.querySelectorAll("#editor-buttons button:not(#test)").forEach(e => e.disabled = false);
    }
    editing = !editing;
}

scene("test", () => {
    const cellSize = 1000 / currentLevelData.size;
    let switchObj;
    let hasWon = false;
    let moving = false;

    // Add grid
    for (let i = 0; i < currentLevelData.size; i++) {
        for (let j = 0; j < currentLevelData.size; j++) {
            let grid: (SpriteComp|PosComp|ColorComp|string)[] = [
                sprite(`grid`, {width: cellSize, height: cellSize, quad: quad(i % 4 * 0.25, j % 4 * 0.25, 0.25, 0.25)}),
                pos(i * cellSize, j * cellSize),
                "grid"
            ];
            if (i >= currentLevelData.goalX && i <= currentLevelData.goalX + 4 && j >= currentLevelData.goalY && j <= currentLevelData.goalY + 4) grid.push(color(100, 100, 100));
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
        pos(currentLevelData.goalX * cellSize, currentLevelData.goalY * cellSize),
        area({width: cellSize * 5, height: cellSize * 5}),
        "goal"
    ]);

    // Add switch
    if (typeof currentLevelData.switchX === "number" && typeof currentLevelData.switchY === "number") {
        switchObj = add([
            sprite("switch", {width: cellSize, height: cellSize}),
            pos(currentLevelData.switchX * cellSize, currentLevelData.switchY * cellSize),
            area({width: cellSize, height: cellSize})
        ])
    }

    // Add player
    const player = add([
        sprite("player", {width: cellSize, height: cellSize, }),
        area({width: cellSize - 2, height: cellSize - 2}),
        solid(),
        pos(currentLevelData.playerX * cellSize + 1, currentLevelData.playerY * cellSize + 1),
        "player"
    ]);

    // Add block
    const block = add([
        sprite("block", {width: cellSize * 5, height: cellSize * 5}),
        area({width: cellSize * 5 - 2, height: cellSize * 5 - 2}),
        solid(),
        pos(currentLevelData.blockX * cellSize + 1, currentLevelData.blockY * cellSize + 1),
        "block"
    ]);

    // Add walls
    for (let i = 0; i < currentLevelData.walls.length; i++) {
        let wall = currentLevelData.walls[i];
        add([
            pos(wall.dir === "vertical" ? wall.x * cellSize - 1 : wall.x * cellSize, wall.dir === "vertical" ? wall.y * cellSize : wall.y * cellSize - 1),
            area({width: wall.dir === "vertical" ? 2 : wall.length * cellSize, height: wall.dir === "vertical" ? wall.length * cellSize : 2}),
            solid()
        ]);
        add([
            rect(wall.dir === "vertical" ? 6 : wall.length * cellSize, wall.dir === "vertical" ? wall.length * cellSize : 6),
            pos(wall.dir === "vertical" ? wall.x * cellSize - 3 : wall.x * cellSize, wall.dir === "vertical" ? wall.y * cellSize : wall.y * cellSize - 3),
            color(255, 0, 0)
        ])
    }
    for (let i = 0; i < currentLevelData.switchWalls.length; i++) {
        let wall = currentLevelData.switchWalls[i];
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

    // Reset on "R"
    keyPress("r", async () => {
        if (hasWon) return;
        go("test");
    });

    if (switchObj) switchObj.collides("block", () => {
        play("switch");
    })

    action(async () => {
        if (goal.pos.x === block.pos.x - 1 && goal.pos.y === block.pos.y - 1 && !hasWon) {
            hasWon = true;
            every("grid", i => i.color = {r: 255, g: 255, b: 0});
            play("finish");
            await wait(3);
            transition();
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
});

scene("edit", async() => {
    const cellSize = 1000 / currentLevelData.size;
    let switchObj;

    // Add grid
    for (let i = 0; i < currentLevelData.size; i++) {
        for (let j = 0; j < currentLevelData.size; j++) {
            let grid: (AreaComp|OutlineComp|RectComp|SpriteComp|PosComp|ColorComp|string)[] = [
                "grid",
                rect(cellSize, cellSize),
                sprite(`grid`, {width: cellSize, height: cellSize, quad: quad(i % 4 * 0.25, j % 4 * 0.25, 0.25, 0.25)}),
                pos(i * cellSize, j * cellSize),
                outline(5, {r: 0, g: 0, b: 0})
            ];
            if (i >= currentLevelData.goalX && i <= currentLevelData.goalX + 4 && j >= currentLevelData.goalY && j <= currentLevelData.goalY + 4) grid.push(color(100, 100, 100));
            add(grid);
        }
    }

    // Add goal
    const goal = add([
        pos(currentLevelData.goalX * cellSize, currentLevelData.goalY * cellSize),
        area({width: cellSize * 5, height: cellSize * 5}),
        "goal"
    ]);

    // Add switch
    if (typeof currentLevelData.switchX === "number" && typeof currentLevelData.switchY === "number") {
        switchObj = add([
            sprite("switch", {width: cellSize, height: cellSize}),
            pos(currentLevelData.switchX * cellSize, currentLevelData.switchY * cellSize),
            area({width: cellSize, height: cellSize})
        ]);
    }

    // Add player
    const player = add([
        sprite("player", {width: cellSize, height: cellSize, }),
        area({width: cellSize - 2, height: cellSize - 2}),
        pos(currentLevelData.playerX * cellSize + 1, currentLevelData.playerY * cellSize + 1)
    ]);

    // Add block
    const block = add([
        sprite("block", {width: cellSize * 5, height: cellSize * 5}),
        area({width: cellSize * 5 - 2, height: cellSize * 5 - 2}),
        pos(currentLevelData.blockX * cellSize + 1, currentLevelData.blockY * cellSize + 1)
    ]);

    // Add walls
    for (let i = 0; i < currentLevelData.walls.length; i++) {
        let wall = currentLevelData.walls[i];
        add([
            rect(wall.dir === "vertical" ? 6 : wall.length * cellSize, wall.dir === "vertical" ? wall.length * cellSize : 6),
            area({width: wall.dir === "vertical" ? 6 : wall.length * cellSize, height: wall.dir === "vertical" ? wall.length * cellSize : 6}),
            pos(wall.dir === "vertical" ? wall.x * cellSize - 3 : wall.x * cellSize, wall.dir === "vertical" ? wall.y * cellSize : wall.y * cellSize - 3),
            color(255, 0, 0)
        ])
    }
    for (let i = 0; i < currentLevelData.switchWalls.length; i++) {
        let wall = currentLevelData.switchWalls[i];
        add([
            rect(wall.dir === "vertical" ? 6 : wall.length * cellSize, wall.dir === "vertical" ? wall.length * cellSize : 6),
            area({width: wall.dir === "vertical" ? 6 : wall.length * cellSize, height: wall.dir === "vertical" ? wall.length * cellSize : 6}),
            pos(wall.dir === "vertical" ? wall.x * cellSize - 3 : wall.x * cellSize, wall.dir === "vertical" ? wall.y * cellSize : wall.y * cellSize - 3),
            color(0, 0, 255)
        ]);
    }
});

go("edit");

document.querySelector("#test").addEventListener("click", () => {
    transition();
});

const fileInput: HTMLInputElement = document.querySelector("#level-file");

document.querySelector("#open").addEventListener("click", () => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
       currentLevelData = JSON.parse(reader.result);
       go("edit");
    });
    reader.readAsText(fileInput.files[0], "utf-8");
    fileInput.value = null;
});

document.querySelector("#cancel").addEventListener("click", () => {
    fileInput.value = null;
})

setInterval(() => {
    document.querySelector("#download").href = `data:application/json;charset=utf-8;base64,${btoa(JSON.stringify(currentLevelData))}`;
}, 0);