(function () {
    const session = new GameSession(150, 30, 30);

    let leftMouseButtonOnlyDown = false;

    let startCell, endCell;

    let lastDirectionMoved = "N";

    const gameBoard_UI = document.getElementById("gameBoard_UI");
    const startButton = document.getElementById("start");

    class Cell {
        constructor(x, y, session) {
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
            this.session = session;
        }

        setNeighbors() {
            const dirs = [-1, 0, 1];
            for (let dir_x of dirs) {
                for (let dir_y of dirs) {
                    if (validPosition(this.x + dir_x, this.y + dir_y, session.gameBoard.cols, session.gameBoard.rows)) {
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
                let cell = session.gameBoard.getCell(n.x, n.y);
                if (cell.distance < low && cell.visited && !cell.wall) {
                    low = cell.distance;
                    lowCell = cell;
                }
            }
            return lowCell;
        }

        handleClick(e) {
            if (session.settingStart && !session.hasStarted && !session.settingWalls && e.button === 0) {
                this.start_cell = true;
                getCellElem(this.x, this.y).classList.add("start");
                startCell = this;
                session.settingStart = false;
                session.settingEnd = true;
                session.startSet = true;
                document.getElementById("startMessage").classList.add("hidden");
                document.getElementById("endMessage").classList.remove("hidden");
            } else if (session.settingEnd && !session.hasStarted && !session.settingWalls && e.button === 0) {
                endCell = this;
                this.end_cell = true;
                getCellElem(this.x, this.y).classList.add("end");
                session.settingEnd = false;
                session.endSet = true;
                document.getElementById("endMessage").classList.add("hidden");
                document.getElementById("wallMessage").classList.remove("hidden");
                session.settingWalls = true;
                for (let x = 0; x < session.gameBoard.cols; x++) {
                    for (let y = 0; y < session.gameBoard.rows; y++) {
                        getCellElem(x, y).addEventListener("mouseover", onMouseOver);
                    }
                }
            } else if (!session.settingEnd && !session.settingStart && session.settingWalls && !session.hasStarted && e.button === 2) {
                this.wall = false;
                getCellElem(this.x, this.y).classList.remove("wall");
            }
        }
    }

    function onMouseOver(e) {
        clearSelection();
        if (leftMouseButtonOnlyDown && !session.hasStarted && session.settingWalls) {
            let [x, y] = getXYFromCell(e.target);
            let cell = session.gameBoard.getCell(x, y);
            if (cell.start_cell || cell.end_cell || cell.wall) {
                return;
            }
            cell.wall = true;
            e.target.classList.add("wall");
        }
    }

    function resetSignal(resetEnd = true) {
        for (let x = 0; x < session.gameBoard.cols; x++) {
            for (let y = 0; y < session.gameBoard.rows; y++) {
                let to_check = session.gameBoard.getCell(x, y);
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

    function movePlayerTank(dir) {
        let cell;

        for (let n of endCell.neighbors) {
            if (n.direction === dir) {
                cell = session.gameBoard.getCell(n.x, n.y);
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
        if (session.startLocated) {
            walk_path(startCell);
        }
        lastDirectionMoved = dir;
    }

    function moveEnemyTowardsPlayer() {
        let pathCell;
        for (let n of startCell.neighbors) {
            let cell = session.gameBoard.getCell(n.x, n.y);
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
        if (session.startLocated) {
            walk_path(startCell);
        }
    }

    function gameOverHandler(message) {
        Array.from(document.getElementsByClassName("laser")).forEach((l) =>
            l.remove()
        );
        alert(message);
        session.hasEnded = true;
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
        Array.from(document.querySelectorAll(".cell")).forEach(cell_elem => {
            cell_elem.removeEventListener("mouseover", highlightCell);
            cell_elem.removeEventListener("mouselout", highlightCellRevert);
        });
    }

    function start() {
        if (!session.startSet || !session.endSet || session.hasStarted) {
            return;
        }

        clearSelection();
        uiChangesOnStart();

        session.hasStarted = true;
        session.settingWalls = false;

        draw_path(endCell);
        disableHover();
        if (session.startLocated) {
            walk_path(startCell);
            window.focus();
            gameTick();
            eventLoop();

        } else if (!session.startLocated) {
            document.getElementById("wallMessage").classList.add("hidden");
            document.getElementById("noPathMessage").classList.remove("hidden");
        }
    }

    function disableHover() {
        for (let x = 0; x < session.gameBoard.cols; x++) {
            for (let y = 0; y < session.gameBoard.rows; y++) {
                getCellElem(x, y).classList.remove("cell_hover");
            }
        }
    }

    function getXYForLaser(cellElem) {
        const rv = [];
        if (lastDirectionMoved === "N") {
            rv.push(cellElem.offsetLeft - 3.5 + cellElem.offsetWidth / 2);
            rv.push(cellElem.offsetTop - cellElem.offsetHeight / 2);
        }
        else if (lastDirectionMoved === "S") {
            rv.push(cellElem.offsetLeft - 3.5 + cellElem.offsetWidth / 2);
            rv.push(cellElem.offsetTop + cellElem.offsetHeight / 2);
        }
        else if (lastDirectionMoved === "E") {
            rv.push(cellElem.offsetLeft + cellElem.offsetWidth);
            rv.push(cellElem.offsetTop);
        }
        else if (lastDirectionMoved === "W") {
            rv.push(cellElem.offsetLeft - 3.5);
            rv.push(cellElem.offsetTop);
        }
        else if (lastDirectionMoved === "NW") {
            rv.push(cellElem.offsetLeft);
            rv.push(cellElem.offsetTop - cellElem.offsetHeight / 2);
        }
        else if (lastDirectionMoved === "NE") {
            rv.push(cellElem.offsetLeft - 3.5 + cellElem.offsetWidth);
            rv.push(cellElem.offsetTop - cellElem.offsetHeight / 2);
        }
        else if (lastDirectionMoved === "SW") {
            rv.push(cellElem.offsetLeft);
            rv.push(cellElem.offsetTop + cellElem.offsetHeight / 2);
        }
        else if (lastDirectionMoved === "SE") {
            rv.push(cellElem.offsetLeft + cellElem.offsetWidth - 3.5);
            rv.push(cellElem.offsetTop + cellElem.offsetHeight / 2);
        }
        return rv;
    }

    function firePlayerLaser() {
        const laser = document.createElement("div");
        laser.classList.add("laser");
        const [laserX, laserY] = getXYForLaser(getCellElemFromCell(endCell));
        laser.style.left = convertToPXs(laserX);
        laser.style.top = convertToPXs(laserY);
        const dx = dxmap[lastDirectionMoved] * 20;
        const dy = dymap[lastDirectionMoved] * 20;
        const angle = anglemap[lastDirectionMoved];
        laser.style.transform = "rotate(" + angle + "deg)";
        gameBoard_UI.appendChild(laser);
        for (let i = 0; i < 30; i++) {
            sleep(i * 25).then(() => {
                laser.style.top = convertToPXs(
                    laserY - dy * i
                );
                laser.style.left = convertToPXs(
                    laserX - dx * i
                );
                if (colides(laser, getCellElemFromCell(startCell))) {
                    document.getElementsByClassName("start")[0].classList.remove("start");
                    gameOverHandler("You shot the enemy tank!");
                }
                Array.from(document.getElementsByClassName("wall")).forEach((w) => {
                    if (colides(laser, w)) {
                        laser.remove();
                    }
                });
                Array.from(document.getElementsByClassName("edge")).forEach((e) => {
                    if (colides(laser, e)) {
                        laser.remove();
                    }
                });

            });
        }
        sleep(600).then(() => laser.remove());
    }

    async function eventLoop() {
        while (!session.hasEnded && !session.paused) {
            const movementEvent = session.movementQueue.dequeue();
            if (typeof movementEvent !== "undefined" && movementEvent !== null) {
                movePlayerTank(movementEvent.description);
            };
            const firingEvent = session.firingQueue.dequeue();
            if (typeof firingEvent !== "undefined" && firingEvent !== null && keyDowns[" "]) {
                firePlayerLaser();
            };
            const pressedEvents = getPressedEvents();
            for (let event of pressedEvents) {
                if (event.type === "move" && checkValidKeyState() && validMove(event.description)) {
                    session.movementQueue.enqueue(event);
                }
                if (event.type === "fire") {
                    session.firingQueue.enqueue(event);
                }
            }

            await sleep(100);
        }

    }

    function validMove(dir) {
        let cell;
        for (let n of endCell.neighbors) {
            if (n.direction === dir) {
                cell = session.gameBoard.getCell(n.x, n.y);
                if (typeof cell === "undefined" || cell === null) return false;
                if (cell.wall) return false;
                return true;
            }
        }
        return false;
    }

    async function gameTick() {
        while (!session.hasEnded && !session.paused) {
            singleStep();
            await sleep(session.speed);
        }

    }

    function singleStep() {
        session.speed = Array.from(document.getElementById("difficulty").options).find(
            (d) => d.selected
        ).value;
        moveEnemyTowardsPlayer();
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
                let n_cell = session.gameBoard.getCell(n.x, n.y);
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
                    session.startLocated = true;
                }
                if (n_cell.distance > cell.distance + n.connection_cost && n_cell.visited) {
                    n_cell.distance = cell.distance + n.connection_cost;
                }
                if (!n_cell.visited && !n_cell.wall) {
                    n_cell.visited = true;
                    n_cell.distance = cell.distance + n.connection_cost;
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
                cell_1 = session.gameBoard.getCell(n.x, n.y);
            }
            if (n.direction === n_2) {
                cell_2 = session.gameBoard.getCell(n.x, n.y);
            }
            if (n.direction === d) {
                cell_d = session.gameBoard.getCell(n.x, n.y)
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

    function buildGrid(e) {
        if (!session.hasStarted && !session.gridBuilt) {
            e.target.classList.add("hidden");
            startButton.disabled = false;
            startButton.classList.remove("hidden");
            const mapSize = Array.from(document.getElementById("mapSize").options).find(
                (d) => d.selected
            ).value;
            session.gameBoard.cols = mapSize;
            session.gameBoard.rows = mapSize;
            document.getElementById("mapSizeDropdown").classList.add("hidden");
            buildGridInternal();
            session.gridBuilt = true;
            document.getElementById("startMessage").classList.remove("hidden");
            startButton.scrollIntoView({ behavior: "smooth" });
        }
    }

    function setLeftButtonState(e) {
        leftMouseButtonOnlyDown =
            e.buttons === undefined ? e.which === 1 : e.buttons === 1;
    }

    function buildGridInternal() {
        for (let x = 0; x < session.gameBoard.cols; x++) {
            session.gameBoard.push([]);
            const col = document.createElement("div");
            col.id = "col-" + x;
            col.classList.add("col");
            col.draggable = false;
            col.ondragstart = function () {
                return false;
            };
            gameBoard_UI.appendChild(col);
            for (let y = 0; y < session.gameBoard.rows; y++) {
                const newCell = new Cell(x, y, session);
                session.gameBoard.pushX(x, newCell);
                session.gameBoard.getCell(x, y).setNeighbors();
                const cell = document.createElement("div");
                cell.id = getCellId(x, y);
                cell.classList.add("cell");
                cell.classList.add("cell_hover");

                if (x === 0 || x === session.gameBoard.cols - 1 || y === 0 || y === session.gameBoard.rows - 1) {
                    cell.classList.add("edge");
                }

                if (session.gameBoard.cols * session.gameBoard.rows < 25 * 25) {
                    cell.classList.add("large_cell");
                } else if (session.gameBoard.cols * session.gameBoard.rows < 40 * 40) {
                    cell.classList.add("medium_cell");
                } else if (session.gameBoard.cols * session.gameBoard.rows < 60 * 60) {
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
        if (session.settingStart) {
            e.target.classList.add("startHighlight");
        } else if (session.settingEnd) {
            e.target.classList.add("endHighlight");
        } else if (session.settingWalls) {
            e.target.classList.add("wallHighlight");
        }
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
        if (session.hasStarted && !session.hasEnded) {
            keyDowns[e.key] = true;
            if (!session.paused && checkValidKeyState()) {
                if (e.key !== " ") {
                    session.movementQueue.empty();
                }
                const pressedEvents = getPressedEvents();
                for (let event of pressedEvents) {
                    if (event.type === "move") {
                        session.movementQueue.enqueue(event);
                    }
                }

            }
        }
    }

    function keyUpHandler(e) {
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) > -1) {
            e.preventDefault();
        }
        if (session.hasStarted && !session.hasEnded) {
            keyDowns[e.key] = false;
            if (!session.paused) {
                if (e.key !== " ") {
                    session.movementQueue.empty();
                } else if (e.key === " ") {
                    firePlayerLaser();
                    session.firingQueue.empty();
                }
                const pressedEvents = getPressedEvents();
                for (let event of pressedEvents) {
                    if (event.type === "move" && checkValidKeyState()) {
                        session.movementQueue.enqueue(event);
                    }
                    else if (event.type === "fire" && checkValidKeyState()) {
                        session.firingQueue.enqueue(event);
                    }
                }
            }
        }
    }

    function pausehandler() {
        if (session.hasEnded || !session.hasStarted) return;
        session.paused = !session.paused;
        if (!session.paused) {
            gameTick();
            eventLoop();
            document.getElementById("reload").classList.add("notShown");
        } else {
            session.movementQueue.empty();
            session.firingQueue.empty();
            document.getElementById("reload").classList.remove("notShown");
        }
        document.getElementById("pause").textContent = session.paused ? "Unpause" : "Pause";
    }

    (function () {
        startButton.addEventListener("click", start);
        document.getElementById("buildGrid").addEventListener("click", buildGrid);

        document.getElementById("pause").addEventListener("click", pausehandler);

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