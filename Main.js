// JavaScript source code
var cnv = document.getElementById("canvas");
var ctx = cnv.getContext("2d");

//Frames per second
const FPS = 30;
//rasteroid details
const ROID_NUM = 5; //Starting number of asteroids 
const ROIDS_SPEED = 50;  //Max starting speed in pixels per second
const ROIDS_SIZE = 100; //Stgarting asteroid size in pixels
const ROIDS_VERT = 10; //Vertices of the asteroids
const ROIDS_JAG = 0.4; //jaggedness of the asteroids, 0 = none, 1 = lots.
const ROIDS_PTS_LGE = 20; //points scored for a large asteroid
const ROIDS_PTS_MED = 50;
const ROIDS_PTS_SML = 100;
//Ship details
const SHIP_SIZE = 30; //Ship height in pixels, used to have larger maps
const TURN_SPEED = 360; //turn speed in degress per second
const SHIP_THRUST = 5; //acceleration of the ship in pixels per second per second
const FRICTION = 0.7; //friction coefficient of space, 0 = no frication, 1 = lots.
const SHOW_BOUNDING = false; //show or hide collision bounding
const SHOW_CENTRE_DOT = false; // show or hide ships centre dot
const SHIP_EXPLODE_DUR = 0.6 //Duration of ships explosion in seconds
const SHIP_INVULNERABLE_DUR = 3; //duration of ships invulnerability
const SHIP_BLINK_DUR = 0.1; //time between blinks when ship is invulnerable
//lasers
const LASER_MAX = 10; //maximum number of lasers on screen at one
const LASER_SPD = 500; // speed of lasers in pixels per second
const LASER_DIST = 0.6; //Max distance laser can travel as fraction of screen width
const LASER_EXPLODE_DURATION = 0.1; //duration of lasers explosion in seconds
//Game properties
const TEXT_FADE_TIME = 2.5; // text fade time in seconds
const TEXT_SIZE = 40; //text font height in pixels
const GAME_LIVES = 3;
const SAVE_KEY_SCORE = "highscore"; //save key for local storage of high score
const SOUND_ON = true;
const MUSIC_ON = true;

//setu game loop, will call this function once every 30th of a second.  Fast enough for human eyes.
setInterval(update, 1000 / FPS);

//Setup sound effects
var fxExplode = new Sound("sounds/explode.m4a",1,0.1);
var fxHit = new Sound("sounds/hit.m4a", 5);
var fxLaser = new Sound("sounds/laser.m4a", 5, 0.1);
var fxThrust = new Sound("sounds/thrust.m4a",1,0.25);

// setup the music
var music = new Music("sounds/music-low.m4a", "sounds/music-high.m4a");
var roidsLeft, roidsTotal;

function Sound(src, maxStreams = 1, volume = 1.0) {
    this.streamNum = 0;
    this.streams = [];
    for (var i = 0; i < maxStreams; i++) {
        this.streams.push(new Audio(src));
        this.streams[i].volume = volume;
    }
    this.play = function () {
        /* This will cycle through the sounds to play.
         * if maxstreams is 2, and the stream num is 1 + 1 = 2, then the modulo (remainder) of ividing by 2 is 0, so will play the first track
         * if maxstreams is 2 and the stream num is 0 + 1 = 1, the remainder of modulo by 2 is 1 
         * Hence will play track 1 in the array (which is the second track since arrays start at 0).
         */
        
            this.streamNum = (this.streamNum + 1) % maxStreams;
            //.play is the inbuilt stream function
            this.streams[this.streamNum].play();
        
       
    }
    this.stop = function () {
        this.streams[this.streamNum].pause();
        this.streams[this.streamNum].currentTime = 0;
    }

}

function Music(srcLow, srcHigh) {
    this.soundLow = new Sound(srcLow,1,1);
    this.soundHigh = new Sound(srcHigh,1,1);
    this.low = true;
    this.tempo = 1.0; // seonds per beat
    this.beatTime = 0; //frames left until next beat

    this.play = function () {
        if (this.low) {
            this.soundLow.play()
        } else {
            this.soundHigh.play()
        }
        this.low = !this.low;
    }

    this.tick = function () {
        if (this.beatTime == 0) {
            this.play();
            this.beatTime = Math.ceil(this.tempo * FPS);
        } else {
            this.beatTime--;
        }
    }

    this.setAsteroidRatio = function (ratio) {
        this.tempo = 1.0 - 0.75 * (1.0 - ratio);
    }
}

//Setup the game parameters
var level, roids, ship, text, textAlpha, lives, score, highScore;
newGame();

function newGame() {
    level = 0;
    lives = GAME_LIVES;
    ship = newShip();
    newLevel();
    score = 0;
    //get the high score from local sorage
    var scoreStr = localStorage.getItem(SAVE_KEY_SCORE);
    if (scoreStr == null) {
        highScore = 0;
        
    }
    else {
        
        highScore = parseInt(scoreStr);
   }
}

function newLevel() {
    text = "level " + (level + 1);
    textAlpha = 1.0;
    createAsteroidBelt();
   ;
}

 //object/fancy array
function newShip() {
    return anNewShip = {
        xLocation: cnv.width / 2, //x of ship is centre of ship before divided by 2, Same for y
        yLocation: cnv.height / 2,
        shipRadius: SHIP_SIZE / 2,
        ShipAngle: 90 / 180 * Math.PI, //0=heading right, 90= facing up, 180 = facing left //270 ==facing down 360 will becoming 0.  Need to convert to radians
        rotation: 0,
        thrusting: false,
        thrust: {
            x: 0,
            y: 0
        },
        explodeTime: 0,
        blinkTime: Math.ceil(SHIP_BLINK_DUR * FPS),
        blinkNum: Math.ceil(SHIP_INVULNERABLE_DUR / SHIP_BLINK_DUR),
        canShoot: true,
        laserCount: [],
        dead: false
        
    }

}
var ship = newShip() 

//Setup asteroids details
var roids = [];

createAsteroidBelt();

function keyUp(/**@type {KeyboardEvent} */ ev) {
    if (ship.dead) {
        return;
    }
    switch (ev.keyCode) {
        case 37: //left arrow, convert to radians
            ship.rotation = 0;

            break;
        case 38: //up arrow, stop thrust forwards
            ship.thrusting = false;
            break;
        case 39://right arrow stop rotating right
            ship.rotation = 0;
            break;
        case 32://sapce bar, allow shooting
            ship.canShoot = true;
            break;
    }
}

//setup event handlers
document.addEventListener("keydown", keyDown);
document.addEventListener("keyup", keyUp);

function keyDown(/**@type {KeyboardEvent} */ ev) {
    if (ship.dead) {
        return;
    }
    switch (ev.keyCode) {
        case 37: //left arrow, convert to radians

            ship.rotation = TURN_SPEED / 180 * Math.PI / FPS;

            //console.log("changed rotation is "+ ship.rotation);
            break;
        case 38: //up arrow, thrust forwards
            ship.thrusting = true;
            break;
        case 39://right arrow
            ship.rotation = -TURN_SPEED / 180 * Math.PI / FPS;
            break;
        case 32://spacebar - shoot laser
            shootLaser();
            break;

    }
}

function shootLaser() {
    //Create laser object
    if (ship.canShoot && ship.laserCount.length < LASER_MAX) {
        ship.laserCount.push({ //From nose of ship
            xLocation: ship.xLocation + 4 / 3 * ship.shipRadius * Math.cos(ship.ShipAngle),
            
            yLocation: ship.yLocation - 4 / 3 * ship.shipRadius * Math.sin(ship.ShipAngle),
            xVelocity: LASER_SPD * Math.cos(ship.ShipAngle) / FPS,
            yVelocity: -LASER_SPD * Math.sin(ship.ShipAngle) / FPS,
            laserDist: 0,
            explodeTime: 0
        });
        if (SOUND_ON) { fxLaser.play(); }
    }

    //Prevent further shooting
    ship.canShoot = false;
}

//Functions for asteroids
function createAsteroidBelt() {
    roidsTotal = (ROID_NUM + level) * 7;
    roidsLeft = roidsTotal;
    roids = [];
    for (var i = 0; i < ROID_NUM + level; i++) {
        do {
            var x = Math.floor(Math.random() * cnv.width);
            var y = Math.floor(Math.random() * cnv.height);
        } while (distBetweenPoints(ship.xLocation, ship.yLocation, x, y) < ROIDS_SIZE * 2 + ship.shipRadius);
        roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 2)));
        //Do while will repeat the code if parameter is not met.
    }
}

function distBetweenPoints(x1, y1, x2, y2) {
    //Returns square root of number
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    /* How this works.
     * sqrt obviously finds the square root (the number which multiplied by itself makes the given number. square root of 25 is 5 etc).
     * we need to return a number, because we have to check that said number is less than the roid size (100 pixels) * 2 + the shipradius (15 pixels) which is 100 * 2 + 15 = (215)
     * This gives us a zone around the ship to act as a buffer.
     * The number that we square root from is pow, which is the Base (first number) multiplied the amount of times by itself as the exponent states (second specified number in pow).
     * Starting ship location x and y is the canvas height and width /2 to place the ship in the centre, width is 700 and height is 500, so 350 and 250.
     * Lets say that the location we want to place our object is at 398x and 10y.
     * The calculation is thus.  Math.sqrt of (math.pow 396 - 350 = 46 , 2 (46*46 = 2116) + math.pow( 10 - 250 = -240,2 (-240*-240 = 57600) ) 
     * square root of (2116+57600=59716) = 244.368574, which is greater than the amount specified so should spawn.  This will spawn because although the x is close to the ship, the y value
     * is offsetting it enough to be out of the catchment radius.  If y was closer to the ship at say, 230 then the second math power would be 230-250 = -20,2 (-20*-20= 400)
     * So square root of (2116+400=2516) = 50.1597448, which is less than 215 so wouldn't spawn and the sequence would run again.
     */
}

function explodeShip() {
   /* ctx.strokeStyle = "lime";
    ctx.fillStyle = "lime";
    ctx.beginPath();
    ctx.arc(ship.xLocation, ship.yLocation, ship.shipRadius, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.stroke();*/

    ship.explodeTime = Math.ceil(SHIP_EXPLODE_DUR * FPS);
    if (SOUND_ON) { fxExplode.play() };
}

function gameOver() {
    ship.dead = true;
    text = "Game Over";
    textAlpha = 1;
}

function newAsteroid(x, y, r) {
    var lvlMult = 1 + 0.1 * level;
    var roid = {
        xLocation: x,
        yLocation: y,
        xVelocity: Math.random() * ROIDS_SPEED * lvlMult / FPS * (Math.random() < 0.5 ? 1 : -1),
        yVelocity: Math.random() * ROIDS_SPEED * lvlMult / FPS * (Math.random() < 0.5 ? 1 : -1),
        radius: r,
        angle: Math.random() * Math.PI * 2, //in radians
        vertices: Math.floor(Math.random() * (ROIDS_VERT + 1) + ROIDS_VERT / 2),
        offs: []
    }

    //Create vertex offset array
    for (var i = 0; i < roid.vertices; i++) {
        roid.offs.push(Math.random() * ROIDS_JAG * 2 + 1 - ROIDS_JAG);
        
        //eg 0 * 0.4 * 2 + 1 - 0.4 = 0.6
        // 1 * 0.4 * 2 + 1 - 0.4 = 1.4
        // 0.7785 * 0.4 * 2 + 1 - 0.4 = 1.2228
    }
    return roid;
}

function destroyAsteroid(index) {
    var x = roids[index].xLocation;
    var y = roids[index].yLocation;
    var r = roids[index].radius;

    //Split the asteroid in two if necessary
    if (r == Math.ceil(ROIDS_SIZE / 2)) {
        score += ROIDS_PTS_LGE;
        roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 4)));
        roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 4)));
    }
    else if (r == Math.ceil(ROIDS_SIZE / 4)) {
        score += ROIDS_PTS_MED;
        roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 8)));
        roids.push(newAsteroid(x, y, Math.ceil(ROIDS_SIZE / 8)));
    }
    else {
        score += ROIDS_PTS_SML;
    }

    //check high score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem(SAVE_KEY_SCORE, highScore);
    }
    //destroy original asteroid
    roids.splice(index, 1);
    if (SOUND_ON) { fxHit.play() };

    //calculate ratio of remaining asteroids to determine music tempo
    roidsLeft--;
    music.setAsteroidRatio(roidsLeft == 0 ? 1 : roidsLeft / roidsTotal)

    //Check level is ended when no more asteroids
    if (roids.length == 0) {
        level++;
        newLevel();
    }

}

function drawShip(x, y, a, colour = "white") {
    
    ctx.strokeStyle = colour;
    ctx.lineWidth = SHIP_SIZE / 20; //Outline of ship is a percentage of the ship size
    ctx.beginPath();
    //Cosine represents the horizontal of the ships angle, sin represnts the vertical of the ships angle.  Ship y is minus because negative represnts upwards on the screen
    //Nose of the ship
    ctx.moveTo(
        x + 4 / 3 * ship.shipRadius * Math.cos(a),
        y - 4 / 3 * ship.shipRadius * Math.sin(a)
    );
    //Rear left of the ship
    ctx.lineTo(
        x - ship.shipRadius * (2 / 3 * Math.cos(a) + Math.sin(a)),
        y + ship.shipRadius * (2 / 3 * Math.sin(a) - Math.cos(a))
    );
    //Rear left to right of ship
    ctx.lineTo(
        x - ship.shipRadius * (2 / 3 * Math.cos(a) - Math.sin(a)),
        y + ship.shipRadius * (2 / 3 * Math.sin(a) + Math.cos(a))
    );
    ctx.closePath();
    ctx.stroke();
}


//Update for screen
function update() {
    var blinkOn = ship.blinkNum % 2 == 0;
    var exploding = ship.explodeTime > 0;
    //draw the background (space
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, cnv.width, cnv.height);


    //Tick the music
    if (MUSIC_ON) {
        music.tick();
        
    } 
    


    if (!exploding && !ship.dead) {
        if (blinkOn) {
            drawShip(ship.xLocation, ship.yLocation, ship.ShipAngle);
            
        }
        if (ship.blinkNum > 0) {
            //reduce blink time
            ship.blinkTime--;
            //reduce the blink number
            if (ship.blinkTime == 0) {
                ship.blinkTime = Math.ceil(SHIP_BLINK_DUR * FPS);
                ship.blinkNum--;
            }
        }
    }
    else {
        ctx.fillStyle = "darkred";
        ctx.beginPath();
        ctx.arc(ship.xLocation, ship.yLocation, ship.shipRadius * 1.8, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(ship.xLocation, ship.yLocation, ship.shipRadius * 1.5,0, Math.PI * 2, false);
        ctx.fill();
        ctx.fillStyle = "orange";
        ctx.beginPath();
        ctx.arc(ship.xLocation, ship.yLocation, ship.shipRadius * 1.2, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.fillStyle = "yellow";
        ctx.beginPath();
        ctx.arc(ship.xLocation, ship.yLocation, ship.shipRadius * 0.9,0, Math.PI * 2, false);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(ship.xLocation, ship.yLocation, ship.shipRadius * 0.5, 1.50, Math.PI * 2, false);
        ctx.fill();
    }
   

    //----------------------------Draw asteroids------------------------------
    
    var astX, astY, astRadius, astAngle, astVertices, offs;
    for (var i = 0; i < roids.length; i++) {
        ctx.strokeStyle = "slategrey";
        ctx.lineWidth = SHIP_SIZE / 20;
        //Get current asteroid properties
        astX = roids[i].xLocation;
        astY = roids[i].yLocation;
        astRadius = roids[i].radius;
        astAngle = roids[i].angle;
        astVertices = roids[i].vertices;
        offs = roids[i].offs;
        
        //Draw path
        ctx.beginPath();
        //Moveto is used to move to first x/y location to begin drawing the path
        ctx.moveTo(
            astX + astRadius * offs[0] * Math.cos(astAngle),
            astY + astRadius * offs[0] * Math.sin(astAngle)
            
        );

        
        //Draw polygon
        for (var j = 1; j < astVertices; j++) {
            ctx.lineTo(astX + astRadius * offs[j] * Math.cos(astAngle + j * Math.PI * 2 / astVertices),
                astY + astRadius * offs[j] * Math.sin(astAngle + j * Math.PI * 2 / astVertices));
        };

        ctx.closePath();
        ctx.stroke();
        

    }



   //-----------------------------Move Ship-----------------------------------
    //rotate ship
    //console.log("ship rotiation is" + ship.rotation, " ship angle is " + ship.ShipAngle);
    ship.ShipAngle += ship.rotation;
    //Thrust the ship
    if (!exploding) {

        if (ship.thrusting && !ship.dead) {
            if (SOUND_ON) { fxThrust.play() };
            ship.thrust.x += SHIP_THRUST * Math.cos(ship.ShipAngle) / FPS;
            ship.thrust.y -= SHIP_THRUST * Math.sin(ship.ShipAngle) / FPS;

            //draw thrust flame
            if (blinkOn && !ship.dead) {
                ctx.fillStyle = "red";
                ctx.strokeStyle = "yellow";
                ctx.lineWidth = SHIP_SIZE / 10; //Outline of ship is a percentage of the ship size
                ctx.beginPath();
                //rear left of the flame
                ctx.moveTo(
                    ship.xLocation - ship.shipRadius * (2 / 3 * Math.cos(ship.ShipAngle) + 0.5 * Math.sin(ship.ShipAngle)),
                    ship.yLocation + ship.shipRadius * (2 / 3 * Math.sin(ship.ShipAngle) - 0.5 * Math.cos(ship.ShipAngle))

                );
                //line from rear left to centre
                ctx.lineTo(
                    ship.xLocation - ship.shipRadius * 6 / 3 * Math.cos(ship.ShipAngle),
                    ship.yLocation + ship.shipRadius * 6 / 3 * Math.sin(ship.ShipAngle)
                );
                //line behind ship backwards to side rear ship right.
                ctx.lineTo(
                    ship.xLocation - ship.shipRadius * (2 / 3 * Math.cos(ship.ShipAngle) - 0.5 * Math.sin(ship.ShipAngle)),
                    ship.yLocation + ship.shipRadius * (2 / 3 * Math.sin(ship.ShipAngle) + 0.5 * Math.cos(ship.ShipAngle))
                );
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
            


        } else {
            /*if (ship.thrust.x < 0.01 && ship.thrust.y < 0.01) {
                if (ship.thrust.x !== 0 && ship.thrust.y !== 0) {
                    ship.thrust.x = 0;
                    ship.thrust.y = 0;
                }
                else { }
               
                
            }
            else {
    
                ship.thrust.x -= FRICTION * ship.thrust.x / FPS;
                ship.thrust.y -= FRICTION * ship.thrust.y / FPS;
            }*/
            ship.thrust.x -= FRICTION * ship.thrust.x / FPS;
            ship.thrust.y -= FRICTION * ship.thrust.y / FPS;
            fxThrust.stop();

        }


        // Check for asteroid collisions
        if (ship.blinkNum == 0 && !ship.dead) {
            for (var i = 0; i < roids.length; i++) {
                if (distBetweenPoints(ship.xLocation, ship.yLocation, roids[i].xLocation, roids[i].yLocation) < ship.shipRadius + roids[i].radius) {
                    console.log("ship exploding");
                    explodeShip();
                    destroyAsteroid(i);
                    break;
                }
            }
        }
    }
    else {
        ship.explodeTime--;

        if (ship.explodeTime == 0) {
            lives--;
            if (lives == 0) {
                gameOver();
            }
            else {
                ship = newShip();
            }

        }
    }
        

        //move ship

        //console.log(ship.thrust.x);
        ship.xLocation += ship.thrust.x;
        ship.yLocation += ship.thrust.y;

        //Handle edge of screen
        if (ship.xLocation < 0 - ship.shipRadius) {
            ship.xLocation = cnv.width;
            console.log("ship x less than 0");
        } else if (ship.xLocation > cnv.width + ship.shipRadius) {
            ship.xLocation = 0 - ship.shipRadius;
            console.log("ship greater less than canvas width");
        }

        if (ship.yLocation < 0 - ship.shipRadius) {
            ship.yLocation = cnv.height;
            console.log("ship y less than 0");
        } else if (ship.yLocation > cnv.height + ship.shipRadius) {
            ship.yLocation = 0 - ship.shipRadius;
            console.log("ship x greater than canvas height");
        }

        //Centre dot
        if (SHOW_CENTRE_DOT == true) {
            ctx.fillStyle = "red";
            ctx.fillRect(ship.xLocation - 1, ship.yLocation - 1, 2, 2);

        }

        if (SHOW_BOUNDING) {
            ctx.strokeStyle = "lime";
            ctx.beginPath();
            ctx.arc(ship.xLocation, ship.yLocation, ship.shipRadius, 0, Math.PI * 2, false);
            ctx.stroke();
        }

        //draw lasers
        for (var i = 0; i < ship.laserCount.length; i++) {
            if (ship.laserCount[i].explodeTime == 0) {
                ctx.fillStyle = "salmon";
                ctx.beginPath();
                ctx.arc(ship.laserCount[i].xLocation, ship.laserCount[i].yLocation, SHIP_SIZE / 15, 0, Math.PI * 2, false);
                ctx.fill();
                console.log("updating lasers");
            }
            else {//Draw explosion
                ctx.fillStyle = "orangered";
                ctx.beginPath();
                ctx.arc(ship.laserCount[i].xLocation, ship.laserCount[i].yLocation, ship.shipRadius * 0.75, 0, Math.PI * 2, false);
                ctx.fill();
                ctx.fillStyle = "darkred";
                ctx.beginPath();
                ctx.arc(ship.laserCount[i].xLocation, ship.laserCount[i].yLocation, ship.shipRadius * 0.5, 0, Math.PI * 2, false);
                ctx.fill();
                ctx.fillStyle = "pink";
                ctx.beginPath();
                ctx.arc(ship.laserCount[i].xLocation, ship.laserCount[i].yLocation, ship.shipRadius * 0.25, 0, Math.PI * 2, false);
                ctx.fill();
            }
            
        }

        //draw the game text
        if (textAlpha >= 0) {
            ctx.textAlign = "center";
            ctx.textBasedAlign = "middle";
            ctx.fillStyle = "rgba(255,255,255, " + textAlpha + ")";
            ctx.font = "small-caps" + TEXT_SIZE + "px dejavu sans mono";
            ctx.fillText(text, cnv.width / 2, cnv.height * 0.75);
            textAlpha -= (1.0 / TEXT_FADE_TIME / FPS);
        }
        else if (ship.dead) {
            newGame();
        }

        //draw the lives
        var lifeColour;
        for (var i = 0; i < lives; i++) {
            lifeColour = exploding && i == lives - 1 ? "red" : "white";
            shipsize = SHIP_SIZE;
            drawShip(shipsize + i * shipsize * 1.2, shipsize, 0.5 * Math.PI, lifeColour);
            
            
           
        }

        //draw the score
        ctx.textAlign = "right";
        ctx.textBasedAlign = "middle";
        ctx.fillStyle = "white";
        ctx.font = TEXT_SIZE + "px dejavu sans mono";
        ctx.fillText(score, cnv.width - SHIP_SIZE / 2, SHIP_SIZE);

        //draw the high score
        ctx.textAlign = "center";
        ctx.textBasedAlign = "middle";
        ctx.fillStyle = "white";
        ctx.font = (TEXT_SIZE * 0.5) + "px dejavu sans mono";
        ctx.fillText("High score - " + highScore, cnv.width / 2, SHIP_SIZE);
        
        


        //Detect laser hit on asteroid
        var astX, astY, astr, laserX, laserY;
        for (var i = roids.length - 1; i >= 0; i--) {
            astX = roids[i].xLocation;
            astY = roids[i].yLocation;
            astr = roids[i].radius;
            for (var j = ship.laserCount.length - 1; j >= 0; j--) {
                laserX = ship.laserCount[j].xLocation;
                laserY = ship.laserCount[j].yLocation;
                //detect hits
                if (ship.laserCount[j].explodeTime == 0 && distBetweenPoints(astX, astY, laserX, laserY) < astr) {
                   

                    //remove the destroy asteroid and activate the laser explosion
                    destroyAsteroid(i);
                    ship.laserCount[j].explodeTime = Math.ceil(LASER_EXPLODE_DURATION * FPS);
                    
                    
                    break;
                }
            }

        }
        

    
    //Move lasers
    for (var i = ship.laserCount.length -1; i >= 0; i--) {
        //Check distance travelled
        if (ship.laserCount[i].laserDist > LASER_DIST * cnv.width) {
            ship.laserCount.splice(i, 1);
            continue;
        }

        //handle the explosion
        if (ship.laserCount[i].explodeTime > 0) {
            ship.laserCount[i].explodeTime--;
            //destroy laser after duration is up
            if (ship.laserCount[i].explodeTime == 0) {
                ship.laserCount.splice(i, 1);
                continue;
            }
        }

        else {
            //Move the laser

            ship.laserCount[i].xLocation += ship.laserCount[i].xVelocity;
            ship.laserCount[i].yLocation += ship.laserCount[i].yVelocity;
           
            //calculate distance travelled, a squared + b squared = c squared
            ship.laserCount[i].laserDist += Math.sqrt(Math.pow(ship.laserCount[i].xVelocity, 2) + Math.pow(ship.laserCount[i].yVelocity, 2));
            

            //Handle edge of screen
            if (ship.laserCount[i].xLocation < 0) {
                ship.laserCount[i].xLocation = cnv.width;
            }
            else if (ship.laserCount[i].xLocation > cnv.width) {
                ship.laserCount[i].xLocation = 0;
            }
            if (ship.laserCount[i].yLocation < 0) {
                ship.laserCount[i].yLocation = cnv.height;
            }
            else if (ship.laserCount[i].yLocation > cnv.height) {
                ship.laserCount[i].yLocation = 0;
            }
        }
    }
    //-----------------------------Move asteroids-----------------------------
    for (var i = 0; i < roids.length; i++) {
        roids[i].xLocation += roids[i].xVelocity;
        roids[i].yLocation += roids[i].yVelocity;

        //handle edge of screen
        if (roids[i].xLocation < 0 - roids[i].radius) {
            roids[i].xLocation = cnv.width + roids[i].radius;
        }
        else if (roids[i].xLocation > cnv.width + roids[i].radius) {
            roids[i].xLocation = 0 - roids[i].radius;
        }
        if (roids[i].yLocation < 0 - roids[i].radius) {
            roids[i].yLocation = cnv.height + roids[i].radius;
        }
        else if (roids[i].yLocation > cnv.height + roids[i].radius) {
            roids[i].yLocation = 0 - roids[i].radius;
        }
        if (SHOW_BOUNDING) {
            ctx.strokeStyle = "lime";
            ctx.beginPath();
            ctx.arc(astX, astY, astRadius, 0, Math.PI * 2, false);
            ctx.stroke();
        }
    }
    

}
