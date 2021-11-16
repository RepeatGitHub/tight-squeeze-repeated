import "bootstrap";
import kaboom, {AreaComp, CircleComp, ColorComp, GameObj, OriginComp, PosComp, SpriteComp} from "kaboom";

const kbm = kaboom({
    width: 1000,
    height: 1000,
    background: [0, 0, 0],
    font: "sinko"
});

const levelSizeInput: HTMLSelectElement = document.querySelector("#level-size");
const addSwitchButton: HTMLButtonElement = document.querySelector("#add-switch");
const removeSwitchButton: HTMLButtonElement = document.querySelector("#remove-switch");
const addWallButton: HTMLButtonElement = document.querySelector("#add-wall");
const addSwitchWallButton: HTMLButtonElement = document.querySelector("#add-wall-switch");
const removeWallButton: HTMLButtonElement = document.querySelector("#remove-wall");

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
    let testButton: HTMLButtonElement = document.querySelector("#test");
    if (editing) {
        testButton.innerText = "Edit Level";
        document.querySelectorAll("#editor-buttons button:not(#test), #level-size").forEach((e: HTMLButtonElement | HTMLSelectElement) => e.disabled = true);
        go("test");
    } else {
        testButton.innerText = "Test Level";
        document.querySelectorAll("#editor-buttons button:not(#test), #level-size").forEach((e: HTMLButtonElement | HTMLSelectElement) => e.disabled = false);
        go("edit");
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

    // Add block
    const block = add([
        sprite("block", {width: cellSize * 5, height: cellSize * 5}),
        area({width: cellSize * 5 - 2, height: cellSize * 5 - 2}),
        solid(),
        pos(currentLevelData.blockX * cellSize + 1, currentLevelData.blockY * cellSize + 1),
        "block"
    ]);

    // Add player
    const player = add([
        sprite("player", {width: cellSize, height: cellSize, }),
        area({width: cellSize - 2, height: cellSize - 2}),
        solid(),
        pos(currentLevelData.playerX * cellSize + 1, currentLevelData.playerY * cellSize + 1),
        "player"
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
            color(0, 255, 0)
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

let addingWall = false;
let removingWall = false;
let wallType = 0;
let state = 0;
let point1: GameObj<PosComp|CircleComp|OriginComp|ColorComp>, point2: GameObj<PosComp|CircleComp|OriginComp|ColorComp>;

function disableButtons() {
    addWallButton.disabled = true;
    addSwitchWallButton.disabled = true;
    removeWallButton.disabled = true;
    addSwitchButton.disabled = true;
    removeSwitchButton.disabled = true;
    levelSizeInput.disabled = true;
}

function enableButtons() {
    addWallButton.disabled = false;
    addSwitchWallButton.disabled = false;
    levelSizeInput.disabled = false;
}

scene("edit", async() => {
    const cellSize = 1000 / currentLevelData.size;
    let switchObj;

    levelSizeInput.value = currentLevelData.size.toString();

    // Add grid
    for (let i = 0; i < currentLevelData.size; i++) {
        for (let j = 0; j < currentLevelData.size; j++) {
            add([
                "grid",
                rect(cellSize, cellSize),
                sprite(`grid`, {width: cellSize, height: cellSize, quad: quad(i % 4 * 0.25, j % 4 * 0.25, 0.25, 0.25)}),
                pos(i * cellSize, j * cellSize),
                outline(5, rgb(0, 0, 0))
            ]);
        }
    }

    // Add goal
    const goal = add([
        pos(currentLevelData.goalX * cellSize, currentLevelData.goalY * cellSize),
        area({width: cellSize * 5, height: cellSize * 5}),
        rect(cellSize * 5, cellSize * 5),
        color(0, 0, 0),
        opacity(0.6),
        "goal"
    ]);

    // Add block
    const block = add([
        sprite("block", {width: cellSize * 5, height: cellSize * 5}),
        area({width: cellSize * 5 - 2, height: cellSize * 5 - 2}),
        pos(currentLevelData.blockX * cellSize + 1, currentLevelData.blockY * cellSize + 1),
        "block"
    ]);

    // Add player
    const player = add([
        sprite("player", {width: cellSize, height: cellSize, }),
        area({width: cellSize - 2, height: cellSize - 2}),
        pos(currentLevelData.playerX * cellSize + 1, currentLevelData.playerY * cellSize + 1),
        "player"
    ]);

    // Add switch
    const hasSwitch = typeof currentLevelData.switchX === "number" && typeof currentLevelData.switchY === "number";
    if (hasSwitch) {
        switchObj = add([
            sprite("switch", {width: cellSize, height: cellSize}),
            pos(currentLevelData.switchX * cellSize, currentLevelData.switchY * cellSize),
            area({width: cellSize, height: cellSize}),
            "switch"
        ]);
    }
    addSwitchButton.disabled = hasSwitch;
    removeSwitchButton.disabled = !hasSwitch;

    // Add walls
    for (let i = 0; i < currentLevelData.walls.length; i++) {
        let wall = currentLevelData.walls[i];
        add([
            rect(wall.dir === "vertical" ? 6 : wall.length * cellSize, wall.dir === "vertical" ? wall.length * cellSize : 6),
            area({width: wall.dir === "vertical" ? cellSize / 2 : wall.length * cellSize, height: wall.dir === "vertical" ? wall.length * cellSize : cellSize / 2}),
            pos(wall.x * cellSize, wall.y * cellSize),
            color(0, 255, 0),
            kbm.origin(wall.dir === "vertical" ? "top" : "left"),
            "wall",
            {wall}
        ])
    }
    for (let i = 0; i < currentLevelData.switchWalls.length; i++) {
        let wall = currentLevelData.switchWalls[i];
        add([
            rect(wall.dir === "vertical" ? 6 : wall.length * cellSize, wall.dir === "vertical" ? wall.length * cellSize : 6),
            area({width: wall.dir === "vertical" ? cellSize / 2 : wall.length * cellSize, height: wall.dir === "vertical" ? wall.length * cellSize : cellSize / 2}),
            pos(wall.x * cellSize, wall.y * cellSize),
            color(0, 0, 255),
            kbm.origin(wall.dir === "vertical" ? "top" : "left"),
            "switchWall",
            {wall}
        ]);
    }

    removeWallButton.disabled = currentLevelData.walls.length + currentLevelData.switchWalls.length === 0;

    let moving: string = null, offset = vec2(0, 0);

    action(() => {
        if (moving) {
            // @ts-ignore
            const obj: GameObj<PosComp> = get(moving)[0];
            if (!mouseIsDown()) {
                if (moving === "player" || moving === "block") {
                    let checkPos = obj.pos.add(cellSize / 2 - 1, cellSize / 2 - 1);
                    obj.moveTo(checkPos.x - (checkPos.x % cellSize) + 1, checkPos.y - (checkPos.y % cellSize) + 1);
                    if (obj.pos.x / cellSize > currentLevelData.size - (moving === "block" ? 5 : 1)) obj.pos.x = (currentLevelData.size - (moving === "block" ? 5 : 1)) * cellSize;
                    if (obj.pos.y / cellSize > currentLevelData.size - (moving === "block" ? 5 : 1)) obj.pos.y = (currentLevelData.size - (moving === "block" ? 5 : 1)) * cellSize;
                    currentLevelData[moving + "X"] = (obj.pos.x - 1) / cellSize;
                    currentLevelData[moving + "Y"] = (obj.pos.y - 1) / cellSize;
                } else if (moving === "goal" || moving === "switch") {
                    let checkPos = obj.pos.add(cellSize / 2, cellSize / 2);
                    obj.moveTo(checkPos.sub(checkPos.x % cellSize, checkPos.y % cellSize));
                    if (obj.pos.x / cellSize > currentLevelData.size - (moving === "goal" ? 5 : 1)) obj.pos.x = (currentLevelData.size - (moving === "goal" ? 5 : 1)) * cellSize;
                    if (obj.pos.y / cellSize > currentLevelData.size - (moving === "goal" ? 5 : 1)) obj.pos.y = (currentLevelData.size - (moving === "goal" ? 5 : 1)) * cellSize;
                    currentLevelData[moving + "X"] = obj.pos.x / cellSize;
                    currentLevelData[moving + "Y"] = obj.pos.y / cellSize;
                }
                moving = null;
            } else {
                get(moving)[0].pos = mouse.sub(offset);
            }
        }
        if (!moving && mouseIsDown()) {
            if (switchObj && switchObj.hasPoint(mouse)) {
                moving = "switch";
                offset = mouse.sub(switchObj.pos);
            } else if (player.hasPoint(mouse)) {
                moving = "player";
                offset = mouse.sub(player.pos);
            } else if (block.hasPoint(mouse)) {
                moving = "block";
                offset = mouse.sub(block.pos);
            } else if (goal.hasPoint(mouse)) {
                moving = "goal";
                offset = mouse.sub(goal.pos);
            }
        }
        if (removingWall) {
            // @ts-ignore
            let walls: GameObj<AreaComp|ColorComp| { wall: WallInitInfo }>[] = get("wall");
            walls.forEach(wall => wall.color = rgb(0, 255, 0));
            // @ts-ignore
            let switchWalls: GameObj<AreaComp|ColorComp| { wall: WallInitInfo }>[] = get("switchWall");
            switchWalls.forEach(wall => wall.color = rgb(0, 0, 255));
            let wall = walls.find((wall: GameObj<AreaComp>) => wall.hasPoint(mouse)) || switchWalls.find((wall: GameObj<AreaComp>) => wall.hasPoint(mouse));
            if (wall) {
                wall.color = rgb(255, 0, 0);
                if (mouseIsClicked()) {
                    removingWall = false;
                    if (currentLevelData.walls.indexOf(wall.wall) > -1) currentLevelData.walls.splice(currentLevelData.walls.indexOf(wall.wall), 1);
                    if (currentLevelData.switchWalls.indexOf(wall.wall) > -1) currentLevelData.switchWalls.splice(currentLevelData.switchWalls.indexOf(wall.wall), 1);
                    enableButtons();
                    go("edit");
                }
            }
        }
    });
    onDraw(() => {
        if (addingWall) {
            if (mouseIsClicked()) {
                state++;
                if (state >= 2) {
                    if (point1.pos.x !== point2.pos.x || point1.pos.y !== point2.pos.y) {
                        let dir: "vertical" | "horizontal" = point1.pos.x === point2.pos.x ? "vertical" : "horizontal";
                        let points = dir === "vertical" ? (point1.pos.y < point2.pos.y ? [point1, point2] : [point2, point1]) : (point1.pos.x < point2.pos.x ? [point1, point2] : [point2, point1]);
                        currentLevelData[wallType === 0 ? "walls" : "switchWalls"].push({
                            x: points[0].pos.x / cellSize,
                            y: points[0].pos.y / cellSize,
                            dir,
                            length: (dir === "vertical" ? points[1].pos.y - points[0].pos.y : points[1].pos.x - points[0].pos.x) / cellSize
                        });
                    }
                    point1.destroy();
                    point2.destroy();
                    addingWall = false;
                    enableButtons();
                    go("edit");
                }
            } else if (state == 0) {
                point1.moveTo(Math.round(mouse.x / cellSize) * cellSize, Math.round(mouse.y / cellSize) * cellSize);
            } else if (state == 1) {
                point2.hidden = false;
                point2.moveTo(Math.round(mouse.x / cellSize) * cellSize, Math.round(mouse.y / cellSize) * cellSize);
                if (Math.abs(point1.pos.x - point2.pos.x) >= Math.abs(point1.pos.y - point2.pos.y)) {
                    point2.pos.y = point1.pos.y;
                } else {
                    point2.pos.x = point1.pos.x;
                }
                drawLine({
                    p1: point1.pos,
                    p2: point2.pos,
                    width: 5,
                    color: rgb(0, wallType === 0 ? 255 : 0, wallType === 0 ? 0 : 255)
                });
            }
        }
    });
});

addWallButton.addEventListener("click", () => {
    disableButtons();
    const cellSize = 1000 / currentLevelData.size;
    point1 = add([
        circle(cellSize / 4),
        kbm.origin("center"),
        pos(),
        color(0, 255, 0)
    ]);
    point2 = add([
        circle(cellSize / 4),
        kbm.origin("center"),
        pos(),
        color(0, 255, 0)
    ]);
    point2.hidden = true;
    state = 0;
    wallType = 0;
    addingWall = true;
});

addSwitchWallButton.addEventListener("click", () => {
    disableButtons();
    const cellSize = 1000 / currentLevelData.size;
    point1 = add([
        circle(cellSize / 4),
        kbm.origin("center"),
        pos(),
        color(0, 0, 255)
    ]);
    point2 = add([
        circle(cellSize / 4),
        kbm.origin("center"),
        pos(),
        color(0, 0, 255)
    ]);
    point2.hidden = true;
    state = 0;
    wallType = 1;
    addingWall = true;
});

removeWallButton.addEventListener("click", () => {
   disableButtons();
   removingWall = true;
});

go("edit");

document.querySelector("#test").addEventListener("click", () => {
    transition();
});

const fileInput: HTMLInputElement = document.querySelector("#level-file");
fileInput.addEventListener("change", () => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
        if (typeof reader.result === "string") {
            currentLevelData = JSON.parse(reader.result);
        }
       go("edit");
    });
    reader.readAsText(fileInput.files[0], "utf-8");
    fileInput.value = null;
});

levelSizeInput.addEventListener("change", () => {
    currentLevelData.size = parseInt(levelSizeInput.value);
    go("edit");
});

addSwitchButton.addEventListener("click", async () => {
    disableButtons();
    const cellSize = 1000 / currentLevelData.size;
    let tempSwitch = add([
        sprite("switch", {width: cellSize, height: cellSize}),
        pos(),
        kbm.origin("center")
    ]);
    const interval = setInterval(() => {
        if (mouseIsDown()) {
            clearInterval(interval);
            currentLevelData.switchX = Math.floor(tempSwitch.pos.x / cellSize);
            currentLevelData.switchY = Math.floor(tempSwitch.pos.y / cellSize);
            tempSwitch.destroy();
            enableButtons();
            go("edit");
        } else {
            tempSwitch.pos = mouse;
        }
    }, 0);
});

removeSwitchButton.addEventListener("click", () => {
    delete currentLevelData.switchX;
    delete currentLevelData.switchY;
    go("edit");
});

setInterval(() => {
    let downloadElement: HTMLAnchorElement = document.querySelector("#download");
    downloadElement.href = `data:application/json;charset=utf-8;base64,${encodeURIComponent(btoa(JSON.stringify(currentLevelData)))}`;
}, 0);