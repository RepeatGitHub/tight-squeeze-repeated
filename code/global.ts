import {Vec2} from "kaboom";

class Global {
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

export default Global;