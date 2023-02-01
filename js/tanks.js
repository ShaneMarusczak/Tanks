(function () {
    ///TODO: add an option on the screen for premade boards, save drawn boards in local storage
    let gameStarted = false;
    let gameOver = false;
    let paused = false;

    let gridBuilt = false;

    let rowsValid = true;
    let colsValid = true;

    let gameSpeed = 150;

    let rows = 30;
    let cols = 30;

    let settingStart = true;
    let settingEnd = false;
    let settingWalls = false;
    let startSet = false;
    let endSet = false;

    let leftMouseButtonOnlyDown = false;

    let startLocated = false;

    let startCell, endCell;

    const gameBoard = [];

    const movementQueue = new Queue();
    const firingQueue = new Queue();

    let lastDirectionMoved;

    const gameBoard_UI = document.getElementById("gameBoard_UI");
    const startButton = document.getElementById("start");

    class GameEvent {
        constructor(type, description) {
            this.type = type;
            this.description = description;
        }
    }

    class Cell {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.neighbors = [];
            this.cardinal_neighbors = [];
            this.wall = false;
            this.path = false;
            this.start_cell = false;
            this.end_cell = false;
            this.distance = 0;
            this.visited = false;
        }

        setNeighbors() {
            const dirs = [-1, 0, 1];
            for (let dir_x of dirs) {
                for (let dir_y of dirs) {
                    if (validPosition(this.x + dir_x, this.y + dir_y)) {
                        if (dir_x === 0 && dir_y === 0) {
                            continue;
                        }
                        let cardinal_direction = getCellConnectionDirection(dir_x, dir_y);
                        if (dir_x === 0 || dir_y === 0) {
                            this.neighbors.push(build_neighbor(this.x + dir_x, this.y + dir_y, 1, cardinal_direction));
                            this.cardinal_neighbors.push(build_neighbor(this.x + dir_x, this.y + dir_y, 1, cardinal_direction));
                        } else {
                            this.neighbors.push(build_neighbor(this.x + dir_x, this.y + dir_y, Math.sqrt(2), cardinal_direction));
                        }
                    }
                }
            }
        }

        getLowestDistanceNeighbor() {
            let low = Infinity;
            let lowCell = null
            for (let n of this.neighbors) {
                let cell = getCell(n.x, n.y);
                if (cell.distance < low && cell.visited && !cell.wall) {
                    low = cell.distance;
                    lowCell = cell;
                }
            }
            return lowCell;
        }

        handleClick(e) {
            if (settingStart && !gameStarted && !settingWalls && e.button === 0) {
                this.start_cell = true;
                getCellElem(this.x, this.y).classList.add("start");
                startCell = this;
                settingStart = false;
                settingEnd = true;
                startSet = true;
                document.getElementById("startMessage").classList.add("hidden");
                document.getElementById("endMessage").classList.remove("hidden");
            } else if (settingEnd && !gameStarted && !settingWalls && e.button === 0) {
                endCell = this;
                this.end_cell = true;
                getCellElem(this.x, this.y).classList.add("end");
                settingEnd = false;
                endSet = true;
                document.getElementById("endMessage").classList.add("hidden");
                document.getElementById("wallMessage").classList.remove("hidden");
                settingWalls = true;
                for (let x = 0; x < cols; x++) {
                    for (let y = 0; y < rows; y++) {
                        getCellElem(x, y).addEventListener("mouseover", onMouseOver);
                    }
                }
            } else if (!settingEnd && !settingStart && settingWalls && !gameStarted && e.button === 2) {
                this.wall = false;
                getCellElem(this.x, this.y).classList.remove("wall");
            }
        }
    }

    function build_neighbor(x, y, connection_cost, direction) {
        return {
            x,
            y,
            connection_cost,
            direction
        };
    }

    const convertToPXs = (num) => num + "px";

    function getCellConnectionDirection(dir_x, dir_y) {
        if (dir_x === 0 && dir_y === -1) {
            return "N";
        } else if (dir_x === 1 && dir_y === -1) {
            return "NE";
        } else if (dir_x === 1 && dir_y === 0) {
            return "E";
        } else if (dir_x === 1 && dir_y === 1) {
            return "SE";
        } else if (dir_x === 0 && dir_y === 1) {
            return "S";
        } else if (dir_x === -1 && dir_y === 1) {
            return "SW";
        } else if (dir_x === -1 && dir_y === 0) {
            return "W";
        } else {
            return "NW";
        }
    }

    function sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    function onMouseOver(e) {
        clearSelection();
        if (leftMouseButtonOnlyDown && !gameStarted && settingWalls) {
            let [x, y] = getXYFromCell(e.target);
            let cell = getCell(x, y);
            if (cell.start_cell || cell.end_cell || cell.wall) {
                return;
            }
            cell.wall = true;
            e.target.classList.add("wall");
        }
    }

    function getCell(x, y) {
        return gameBoard[x][y];
    }

    function getCellId(x, y) {
        return "cell-" + x + "-" + y;
    }

    function getCellElem(x, y) {
        return document.getElementById(getCellId(x, y));
    }

    function getCellElemFromCell(cell) {
        return document.getElementById(getCellId(cell.x, cell.y));
    }

    function validPosition(x, y) {
        return x >= 0 && x < cols && y >= 0 && y < rows;
    }

    function resetSignal(resetEnd = true) {
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                let to_check = getCell(x, y);
                let to_check_elem = getCellElem(x, y);
                to_check.path = false;
                if (to_check.wall) {
                    continue;
                }
                if (resetEnd) {
                    to_check.end_cell = false;
                    to_check_elem.classList.remove("end");
                }
                to_check_elem.classList.remove("path");
                to_check.visited = false;
                to_check.distance = 0;
                to_check_elem.textContent = "";
            }
        }
    }

    function moveEnd(dir) {
        let cell;

        for (let n of endCell.neighbors) {
            if (n.direction === dir) {
                cell = getCell(n.x, n.y);
                break;
            }
        }
        if (typeof cell === "undefined" || cell === null) return;
        if (cell.wall) {
            return;
        } else if (cell.start_cell) {
            gameOverHandler("You ran into the enemy tank");
            return;
        }
        resetSignal();
        cell.end_cell = true;
        getCellElemFromCell(cell).classList.add("end");

        endCell = cell;

        draw_path(endCell);
        if (startLocated) {
            walk_path(startCell);
        }
        lastDirectionMoved = dir;
    }

    function moveCellTowardsMouse() {
        let pathCell;
        for (let n of startCell.neighbors) {
            let cell = getCell(n.x, n.y);
            if (cell.end_cell) {
                gameOverHandler("Enemy crashed into you.");
                return;
            } else if (cell.path) {
                pathCell = cell;
                break;
            }
        }
        startCell.start_cell = false;
        getCellElem(startCell.x, startCell.y).classList.remove("start");

        startCell.path = false;
        pathCell.start_cell = true;

        startCell = pathCell;
        getCellElem(pathCell.x, pathCell.y).classList.add("start");

        resetSignal(false);
        draw_path(endCell);
        if (startLocated) {
            walk_path(startCell);
        }
    }

    function gameOverHandler(message) {
        alert(message);
        gameOver = true;
        document.getElementById("reload").classList.remove("notShown");
    }

    function uiChangesOnStart() {
        startButton.removeEventListener("click", start);
        startButton.disabled = true;
        startButton.blur();
        startButton.classList.add("hidden");
        document.getElementById("wallMessage").classList.add("notShown");
        document.getElementById("pause").classList.remove("hidden");
        document.getElementById("reload").classList.add("notShown");
    }

    function clearSelection() {
        if (window.getSelection) {
            window.getSelection().removeAllRanges();
        } else if (document.selection) {
            document.selection.empty();
        }
    }

    function start() {
        if (!startSet || !endSet || gameStarted) {
            return;
        }

        clearSelection();
        uiChangesOnStart();
        Array.from(document.querySelectorAll(".cell")).forEach(cell_elem => {
            cell_elem.removeEventListener("mouseover", highlightCell);
            cell_elem.removeEventListener("mouselout", highlightCellRevert);
        });

        gameStarted = true;
        settingWalls = false;

        draw_path(endCell);
        disableHover();
        if (startLocated) {
            walk_path(startCell);
            window.focus();
            gameTick();
            eventLoop();

        } else if (!startLocated) {
            document.getElementById("wallMessage").classList.add("hidden");
            document.getElementById("noPathMessage").classList.remove("hidden");
        }
    }

    function disableHover() {
        for (let x = 0; x < cols; x++) {
            for (let y = 0; y < rows; y++) {
                getCellElem(x, y).classList.remove("cell_hover");
            }
        }
    }

    const dxmap = {
        "N": 0,
        "S": 0,
        "E": -1,
        "W": 1,
        "NE": -1,
        "NW": 1,
        "SE": -1,
        "SW": 1
    }

    const dymap = {
        "N": 1,
        "S": -1,
        "E": 0,
        "W": 0,
        "NE": 1,
        "NW": 1,
        "SE": -1,
        "SW": -1
    }

    const anglemap = {
        "N": 0,
        "S": 0,
        "E": 90,
        "W": 90,
        "NE": 45,
        "NW": -45,
        "SE": -45,
        "SW": 45
    }

    const colides = (obj1, obj2) =>
        !(
            obj2.offsetLeft > obj1.offsetWidth + obj1.offsetLeft ||
            obj1.offsetLeft > obj2.offsetWidth + obj2.offsetLeft ||
            obj2.offsetTop > obj1.offsetHeight + obj1.offsetTop ||
            obj1.offsetTop > obj2.offsetHeight + obj2.offsetTop
        );

    function firePlayerLaser() {
        const laser = document.createElement("div");
        laser.classList.add("laser");
        const cellElem = getCellElemFromCell(endCell);
        laser.style.left = convertToPXs(cellElem.offsetLeft - (cellElem.offsetWidth / 2));
        laser.style.top = convertToPXs(cellElem.offsetTop - (cellElem.offsetHeight / 2));
        const dx = dxmap[lastDirectionMoved] * 20;
        const dy = dymap[lastDirectionMoved] * 20;
        const angle = anglemap[lastDirectionMoved];
        laser.style.transform = "rotate(" + angle + "deg)";
        gameBoard_UI.appendChild(laser);
        for (let i = 0; i < 30; i++) {
            sleep(i * 25).then(() => {
                laser.style.top = convertToPXs(
                    cellElem.offsetTop - dy * i
                );
                laser.style.left = convertToPXs(
                    cellElem.offsetLeft - dx * i
                );
            });
        }
        sleep(600).then(() => laser.remove());
    }

    async function eventLoop() {
        while (!gameOver && !paused) {
            const movementEvent = movementQueue.dequeue();
            if (typeof movementEvent !== "undefined" && movementEvent !== null) {
                moveEnd(movementEvent.description);
            };
            const firingEvent = firingQueue.dequeue();
            if (typeof firingEvent !== "undefined" && firingEvent !== null && keyDowns[" "]) {
                firePlayerLaser();
            };
            const pressedEvents = getPressedEvents();
            for (let event of pressedEvents) {
                if (event.type === "move" && checkValidKeyState() && validMove(event.description)) {
                    movementQueue.enqueue(event);
                }
                if (event.type === "fire") {
                    firingQueue.enqueue(event);
                }
            }

            await sleep(100);
        }

    }

    function validMove(dir) {
        let cell;
        for (let n of endCell.neighbors) {
            if (n.direction === dir) {
                cell = getCell(n.x, n.y);
                if (typeof cell === "undefined" || cell === null) return false;
                if (cell.wall) return false;
                return true;
            }
        }
        return false;
    }

    async function gameTick() {
        while (!gameOver && !paused) {
            singleStep();
            await sleep(gameSpeed);
        }

    }

    function singleStep() {
        gameSpeed = Array.from(document.getElementById("difficulty").options).find(
            (d) => d.selected
        ).value;
        moveCellTowardsMouse();
    }

    function walk_path(root) {
        root.path = true;
        if (root.distance === 0) {
            return;
        }
        if (!root.start_cell) {
            getCellElem(root.x, root.y).classList.remove("visited");
            getCellElem(root.x, root.y).classList.add("path");
        }

        walk_path(root.getLowestDistanceNeighbor());

    }

    function draw_path(root) {
        const q = new Queue();
        root.visited = true;
        q.enqueue(root);
        while (!q.isEmpty()) {
            let cell = q.dequeue();
            if (cell.start_cell) {
                return;
            }
            for (let n of cell.neighbors.reverse()) {
                let n_cell = getCell(n.x, n.y);
                if (n.direction === "NE" && checkCorner("N", "E", cell, "NE")) {
                    cell.neighbors.splice(cell.neighbors.indexOf(n), 1);
                    continue;
                } else if (n.direction === "SE" && checkCorner("S", "E", cell, "SE")) {
                    cell.neighbors.splice(cell.neighbors.indexOf(n), 1);
                    continue;
                } else if (n.direction === "SW" && checkCorner("S", "W", cell, "SW")) {
                    cell.neighbors.splice(cell.neighbors.indexOf(n), 1);
                    continue;
                } else if (n.direction === "NW" && checkCorner("N", "W", cell, "NW")) {
                    cell.neighbors.splice(cell.neighbors.indexOf(n), 1);
                    continue;
                }
                if (n_cell.start_cell) {
                    startLocated = true;
                }
                if (n_cell.distance > cell.distance + n.connection_cost && n_cell.visited) {
                    n_cell.distance = cell.distance + n.connection_cost;
                }
                if (!n_cell.visited && !n_cell.wall) {
                    n_cell.visited = true;
                    n_cell.distance = cell.distance + n.connection_cost;
                    let elem = getCellElem(n_cell.x, n_cell.y);
                    if (!n_cell.wall) {
                        q.enqueue(n_cell);
                    }
                }
            }
        }
    }

    function checkCorner(n_1, n_2, c, d) {
        //TODO: I FEEL LIKE THIS CAN BE SIMPLIFIED SOMEHOW, DO THIS TODO LAST
        let cell_1 = null;
        let cell_2 = null;
        let cell_d = null;
        for (let n of c.neighbors) {
            if (n.direction === n_1) {
                cell_1 = getCell(n.x, n.y);
            }
            if (n.direction === n_2) {
                cell_2 = getCell(n.x, n.y);
            }
            if (n.direction === d) {
                cell_d = getCell(n.x, n.y)
            }
        }
        if (cell_1 === null || cell_2 === null || cell_d === null) {
            return false;
        }
        if (cell_1.wall && cell_2.wall) {
            return !cell_d.wall;
        }
        return false;
    }

    function getXYFromCell(cell) {
        return [cell.id.split("-")[1], cell.id.split("-")[2]];
    }

    function buildGrid(e) {
        if (!gameStarted && rowsValid && colsValid && !gridBuilt) {
            e.target.classList.add("hidden");
            startButton.disabled = false;
            startButton.classList.remove("hidden");
            const mapSize = Array.from(document.getElementById("mapSize").options).find(
                (d) => d.selected
            ).value;
            cols = mapSize;
            rows = mapSize;
            document.getElementById("mapSizeDropdown").classList.add("hidden");
            document.getElementById("tankSvg").classList.add("hidden");
            buildGridInternal();
            gridBuilt = true;
            document.getElementById("introMessage").classList.add("hidden");
            document.getElementById("startMessage").classList.remove("hidden");
            startButton.scrollIntoView({ behavior: "smooth" });
        }
    }

    function setLeftButtonState(e) {
        leftMouseButtonOnlyDown =
            e.buttons === undefined ? e.which === 1 : e.buttons === 1;
    }

    function buildGridInternal() {
        for (let x = 0; x < cols; x++) {
            gameBoard.push([]);
            const col = document.createElement("div");
            col.id = "col-" + x;
            col.classList.add("col");
            col.draggable = false;
            col.ondragstart = function () {
                return false;
            };
            gameBoard_UI.appendChild(col);
            for (let y = 0; y < rows; y++) {
                const newCell = new Cell(x, y);
                gameBoard[x].push(newCell);
                gameBoard[x][y].setNeighbors();
                const cell = document.createElement("div");
                cell.id = getCellId(x, y);
                cell.classList.add("cell");
                cell.classList.add("cell_hover");
                if (cols * rows < 25 * 25) {
                    cell.classList.add("large_cell");
                } else if (cols * rows < 40 * 40) {
                    cell.classList.add("medium_cell");
                } else if (cols * rows < 60 * 60) {
                    cell.classList.add("small_cell");
                } else {
                    cell.classList.add("x-small_cell");
                }

                col.appendChild(cell);
                cell.addEventListener("mouseup", (e) => newCell.handleClick(e));
                cell.addEventListener("mouseover", highlightCell);
                cell.addEventListener("mouseout", highlightCellRevert);
                cell.draggable = false;
                cell.ondragstart = function () {
                    return false;
                };
            }
        }
    }

    function highlightCell(e) {
        if (settingStart) {
            e.target.classList.add("startHighlight");
        } else if (settingEnd) {
            e.target.classList.add("endHighlight");
        } else if (settingWalls) {
            e.target.classList.add("wallHighlight");
        }
    }

    function highlightCellRevert(e) {
        e.target.classList.remove("startHighlight");
        e.target.classList.remove("endHighlight");
        e.target.classList.remove("wallHighlight");
    }

    const keyDowns = {};

    function checkValidKeyState() {
        const up = keyDowns.ArrowUp || keyDowns.w || keyDowns.W;
        const down = keyDowns.ArrowDown || keyDowns.s || keyDowns.S;
        const left = keyDowns.ArrowLeft || keyDowns.a || keyDowns.A;
        const right = keyDowns.ArrowRight || keyDowns.d || keyDowns.D;
        const space = keyDowns[" "];

        if ((up && down) || (left && right)) return false;

        if (!up && !down && !left && !right && !space) return false;

        // let keys = 0;
        // Object.values(keyDowns).forEach(k => {
        //     if (k) {
        //         keys++;
        //     }
        // });
        // return keys < 3;
        return true;
    }

    function getPressedEvents() {
        const up = keyDowns.ArrowUp || keyDowns.w || keyDowns.W;
        const down = keyDowns.ArrowDown || keyDowns.s || keyDowns.S;
        const left = keyDowns.ArrowLeft || keyDowns.a || keyDowns.A;
        const right = keyDowns.ArrowRight || keyDowns.d || keyDowns.D;
        const space = keyDowns[" "];

        const rv = [];

        if (up && left) {
            rv.push(new GameEvent("move", "NW"));
        }
        else if (up && right) {
            rv.push(new GameEvent("move", "NE"));
        }
        else if (down && right) {
            rv.push(new GameEvent("move", "SE"));
        }
        else if (down && left) {
            rv.push(new GameEvent("move", "SW"));
        }
        else if (down) {
            rv.push(new GameEvent("move", "S"));
        }
        else if (up) {
            rv.push(new GameEvent("move", "N"));
        }
        else if (left) {
            rv.push(new GameEvent("move", "W"));
        }
        else if (right) {
            rv.push(new GameEvent("move", "E"));
        }

        if (space) {
            rv.push(new GameEvent("fire", "playertank"));
        }

        return rv;
    }

    function keyDownHanlder(e) {
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
            e.preventDefault();
        }
        if (gameStarted && !gameOver) {
            keyDowns[e.key] = true;
            if (!paused && checkValidKeyState()) {
                if (e.key !== " ") {
                    movementQueue.empty();
                }
                const pressedEvents = getPressedEvents();
                for (let event of pressedEvents) {
                    if (event.type === "move") {
                        movementQueue.enqueue(event);
                    }
                }

            }
        }
    }

    function keyUpHandler(e) {
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
            e.preventDefault();
        }
        if (gameStarted && !gameOver) {
            keyDowns[e.key] = false;
            if (!paused) {
                if (e.key !== " ") {
                    movementQueue.empty();
                } else if (e.key === " ") {
                    firePlayerLaser();
                    firingQueue.empty();
                }
                const pressedEvents = getPressedEvents();
                for (let event of pressedEvents) {
                    if (event.type === "move" && checkValidKeyState()) {
                        movementQueue.enqueue(event);
                    }
                    else if (event.type === "fire" && checkValidKeyState()) {
                        firingQueue.enqueue(event);
                    }
                }
            }
        }
    }

    (function () {
        startButton.addEventListener("click", start);
        document.getElementById("buildGrid").addEventListener("click", buildGrid);

        document.getElementById("pause").addEventListener("click", () => {
            if (gameOver || !gameStarted) return;
            paused = !paused;
            if (!paused) {
                gameTick();
                eventLoop();
                document.getElementById("reload").classList.add("notShown");
            } else {
                movementQueue.empty();
                firingQueue.empty();
                document.getElementById("reload").classList.remove("notShown");
            }
            document.getElementById("pause").textContent = paused ? "Unpause" : "Pause";
        })

        document.body.onmousedown = setLeftButtonState;
        document.body.onmousemove = setLeftButtonState;
        document.body.onmouseup = setLeftButtonState;

        document.addEventListener("keydown", keyDownHanlder);
        document.addEventListener("keyup", keyUpHandler);
        startButton.disabled = true;
        document.oncontextmenu = () => false;
        document.draggable = false;
        document.ondragstart = function () {
            return false;
        }

        document.getElementById("difficulty")
            .addEventListener("change", () => {
                document.getElementById("difficulty").blur();
            });

        gameBoard_UI.draggable = false;
        gameBoard_UI.ondragstart = function () {
            return false;
        }
    })();

})();