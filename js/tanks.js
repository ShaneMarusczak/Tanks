/**
 * Main game logic for Tanks.
 * Handles game loop, player/enemy movement, laser firing, and pathfinding.
 */
(function () {
    "use strict";

    // ========================================================================
    // Constants
    // ========================================================================

    /** Default enemy tank speed in milliseconds */
    const DEFAULT_SPEED = 150;

    /** Default grid dimensions */
    const DEFAULT_GRID_SIZE = 30;

    /** Laser animation configuration */
    const LASER = {
        PLAYER_FRAMES: 30,
        PLAYER_FRAME_DELAY: 25,
        PLAYER_SPEED: 20,
        ENEMY_FRAMES: 40,
        ENEMY_FRAME_DELAY: 40,
        ENEMY_SPEED: 25,
        LIFETIME: 600,
        OFFSET: 3.5
    };

    /** Mine configuration */
    const MINE = {
        FLASH_DURATION: 125,
        FLASH_COUNT: 8,
        MAX_ACTIVE: 4
    };

    /** Event loop tick rate in milliseconds */
    const EVENT_LOOP_TICK = 100;

    /** Cell size thresholds for responsive sizing */
    const CELL_SIZE_THRESHOLDS = {
        LARGE: 25 * 25,
        MEDIUM: 40 * 40,
        SMALL: 60 * 60
    };

    // ========================================================================
    // Game State
    // ========================================================================

    const session = new GameSession(DEFAULT_SPEED, DEFAULT_GRID_SIZE, DEFAULT_GRID_SIZE);

    // DOM element references (cached at startup)
    const gameBoardUI = document.getElementById("gameBoard_UI");
    const startButton = document.getElementById("start");
    const pauseButton = document.getElementById("pause");
    const difficultySelect = document.getElementById("difficulty");
    const reloadButton = document.getElementById("reload");

    // Input state
    const keyDowns = {};
    let mineCount = 0;

    // ========================================================================
    // Mouse State Tracking
    // ========================================================================

    /**
     * Updates the left mouse button state.
     * @param {MouseEvent} e - The mouse event
     */
    function setLeftButtonState(e) {
        session.leftMouseButtonOnlyDown = e.buttons === undefined ? e.which === 1 : e.buttons === 1;
    }

    // ========================================================================
    // Input State Helpers
    // ========================================================================

    /**
     * Gets the current state of directional and action keys.
     * @returns {Object} Object containing boolean flags for each direction and space
     */
    function getKeyState() {
        return {
            up: keyDowns.ArrowUp || keyDowns.w || keyDowns.W,
            down: keyDowns.ArrowDown || keyDowns.s || keyDowns.S,
            left: keyDowns.ArrowLeft || keyDowns.a || keyDowns.A,
            right: keyDowns.ArrowRight || keyDowns.d || keyDowns.D,
            space: keyDowns[" "]
        };
    }

    /**
     * Checks if the current key state is valid for movement.
     * @returns {boolean} True if keys pressed form a valid input
     */
    function checkValidKeyState() {
        const { up, down, left, right, space } = getKeyState();

        // Invalid if opposite directions pressed
        if ((up && down) || (left && right)) return false;

        // Need at least one input
        return up || down || left || right || space;
    }

    /**
     * Gets the current pressed events based on key state.
     * @returns {GameEvent[]} Array of events for pressed keys
     */
    function getPressedEvents() {
        const { up, down, left, right, space } = getKeyState();
        const events = [];

        // Determine movement direction using a cleaner approach
        const direction = getDirectionFromKeys(up, down, left, right);
        if (direction) {
            events.push(new GameEvent("move", direction));
        }

        if (space) {
            events.push(new GameEvent("fire", "playertank"));
        }

        return events;
    }

    /**
     * Converts key states to a direction string.
     * @param {boolean} up - Up key pressed
     * @param {boolean} down - Down key pressed
     * @param {boolean} left - Left key pressed
     * @param {boolean} right - Right key pressed
     * @returns {string|null} Direction string or null if no movement
     */
    function getDirectionFromKeys(up, down, left, right) {
        if (up && left) return "NW";
        if (up && right) return "NE";
        if (down && right) return "SE";
        if (down && left) return "SW";
        if (down) return "S";
        if (up) return "N";
        if (left) return "W";
        if (right) return "E";
        return null;
    }

    // ========================================================================
    // Pathfinding
    // ========================================================================

    /**
     * Resets the pathfinding state for all cells.
     * @param {boolean} [resetEnd=true] - Whether to reset end cell markers
     */
    function resetSignal(resetEnd = true) {
        session.gameBoard.forEachCellWithElement((cell, cellElem) => {
            cell.path = false;

            if (cell.wall) return;

            if (resetEnd) {
                cell.endCell = false;
                cellElem.classList.remove("end");
            }

            cellElem.classList.remove("path");
            cell.visited = false;
            cell.distance = 0;
        });
    }

    /**
     * Performs BFS pathfinding from the root cell.
     * Calculates distances to all reachable cells.
     * @param {Cell} root - The starting cell for pathfinding
     */
    function drawPath(root) {
        const queue = new Queue();
        root.visited = true;
        queue.enqueue(root);

        while (!queue.isEmpty()) {
            const cell = queue.dequeue();

            if (cell.startCell) {
                return;
            }

            // Process neighbors in reverse order for consistent behavior
            for (const n of cell.neighbors.slice().reverse()) {
                const neighborCell = session.gameBoard.getCell(n.x, n.y);

                // Check for blocked diagonal corners
                if (isBlockedDiagonal(n.direction, cell)) {
                    cell.neighbors.splice(cell.neighbors.indexOf(n), 1);
                    continue;
                }

                if (neighborCell.startCell) {
                    session.startLocated = true;
                }

                // Update distance if we found a shorter path
                if (neighborCell.distance > cell.distance + n.connectionCost && neighborCell.visited) {
                    neighborCell.distance = cell.distance + n.connectionCost;
                }

                // Process unvisited, non-wall cells
                if (!neighborCell.visited && !neighborCell.wall) {
                    neighborCell.visited = true;
                    neighborCell.distance = cell.distance + n.connectionCost;
                    queue.enqueue(neighborCell);
                }
            }
        }
    }

    /**
     * Traces the shortest path from start to end by following lowest distances.
     * Uses iteration instead of recursion for stack safety on large grids.
     * @param {Cell} startCell - The starting cell for path tracing
     */
    function walkPath(startCell) {
        let current = startCell;

        while (current) {
            current.path = true;

            if (current.distance === 0) {
                break;
            }

            if (!current.startCell) {
                const cellElem = session.gameBoard.getElement(current.x, current.y);
                cellElem.classList.remove("visited");
                cellElem.classList.add("path");
            }

            current = current.getLowestDistanceNeighbor();
        }
    }

    /**
     * Checks if a diagonal direction is blocked by adjacent walls.
     * @param {string} direction - The diagonal direction to check
     * @param {Cell} cell - The cell to check from
     * @returns {boolean} True if the diagonal is blocked
     */
    function isBlockedDiagonal(direction, cell) {
        const diagonalChecks = {
            NE: ["N", "E"],
            SE: ["S", "E"],
            SW: ["S", "W"],
            NW: ["N", "W"]
        };

        const adjacentDirs = diagonalChecks[direction];
        if (!adjacentDirs) return false;

        return checkCorner(adjacentDirs[0], adjacentDirs[1], cell, direction);
    }

    /**
     * Checks if a corner movement is blocked by two adjacent walls.
     * @param {string} dir1 - First cardinal direction
     * @param {string} dir2 - Second cardinal direction
     * @param {Cell} cell - The cell to check from
     * @param {string} diagonalDir - The diagonal direction
     * @returns {boolean} True if movement is blocked
     */
    function checkCorner(dir1, dir2, cell, diagonalDir) {
        let cell1 = null;
        let cell2 = null;
        let cellDiag = null;

        for (const n of cell.neighbors) {
            if (n.direction === dir1) {
                cell1 = session.gameBoard.getCell(n.x, n.y);
            }
            if (n.direction === dir2) {
                cell2 = session.gameBoard.getCell(n.x, n.y);
            }
            if (n.direction === diagonalDir) {
                cellDiag = session.gameBoard.getCell(n.x, n.y);
            }
        }

        if (!cell1 || !cell2 || !cellDiag) {
            return false;
        }

        // Block diagonal if both adjacent cells are walls but diagonal isn't
        return cell1.wall && cell2.wall && !cellDiag.wall;
    }

    // ========================================================================
    // Tank Movement
    // ========================================================================

    /**
     * Moves the player tank in the specified direction.
     * @param {string} dir - The direction to move (N, NE, E, SE, S, SW, W, NW)
     */
    function movePlayerTank(dir) {
        const neighbor = session.endCell.neighbors.find(n => n.direction === dir);
        if (!neighbor) return;

        const cell = session.gameBoard.getCell(neighbor.x, neighbor.y);
        if (!cell) return;

        if (cell.wall) {
            return;
        }

        if (cell.startCell) {
            gameOverHandler("You ran into the enemy tank");
            return;
        }

        resetSignal();
        cell.endCell = true;
        getCellElemFromCell(cell).classList.add("end");

        session.endCell = cell;

        drawPath(session.endCell);
        if (session.startLocated) {
            walkPath(session.startCell);
        }
        session.lastDirectionMoved = dir;
    }

    /**
     * Moves the enemy tank one step towards the player along the path.
     */
    function moveEnemyTowardsPlayer() {
        let pathCell = null;

        for (const n of session.startCell.neighbors) {
            const cell = session.gameBoard.getCell(n.x, n.y);

            if (cell.endCell) {
                gameOverHandler("Enemy crashed into you.");
                return;
            }

            if (cell.path) {
                pathCell = cell;
                break;
            }
        }

        if (!pathCell) return;

        // Clear old position
        session.startCell.startCell = false;
        session.gameBoard.getElement(session.startCell.x, session.startCell.y).classList.remove("start");
        session.startCell.path = false;

        // Set new position
        pathCell.startCell = true;
        session.startCell = pathCell;
        session.gameBoard.getElement(pathCell.x, pathCell.y).classList.add("start");

        // Recalculate path
        resetSignal(false);
        drawPath(session.endCell);
        if (session.startLocated) {
            walkPath(session.startCell);
        }
    }

    /**
     * Checks if a move in the given direction is valid.
     * @param {string} dir - The direction to check
     * @returns {boolean} True if the move is valid
     */
    function validMove(dir) {
        const neighbor = session.endCell.neighbors.find(n => n.direction === dir);
        if (!neighbor) return false;

        const cell = session.gameBoard.getCell(neighbor.x, neighbor.y);
        return cell && !cell.wall;
    }

    // ========================================================================
    // Laser System
    // ========================================================================

    /**
     * Calculates the starting position for a laser based on direction.
     * @param {HTMLElement} cellElem - The cell element to fire from
     * @param {string} dir - The firing direction
     * @returns {number[]} Array of [x, y] coordinates
     */
    function getXYForLaser(cellElem, dir) {
        const { offsetLeft, offsetTop, offsetWidth, offsetHeight } = cellElem;
        const halfWidth = offsetWidth / 2;
        const halfHeight = offsetHeight / 2;

        const positions = {
            N: [offsetLeft - LASER.OFFSET + halfWidth, offsetTop - halfHeight],
            S: [offsetLeft - LASER.OFFSET + halfWidth, offsetTop + halfHeight],
            E: [offsetLeft + offsetWidth, offsetTop],
            W: [offsetLeft - LASER.OFFSET, offsetTop],
            NW: [offsetLeft, offsetTop - halfHeight],
            NE: [offsetLeft - LASER.OFFSET + offsetWidth, offsetTop - halfHeight],
            SW: [offsetLeft, offsetTop + halfHeight],
            SE: [offsetLeft + offsetWidth - LASER.OFFSET, offsetTop + halfHeight]
        };

        return positions[dir] || [0, 0];
    }

    /**
     * Fires the player's laser in the current movement direction.
     */
    function firePlayerLaser() {
        const laser = document.createElement("div");
        laser.classList.add("laser");

        const [laserX, laserY] = getXYForLaser(
            getCellElemFromCell(session.endCell),
            session.lastDirectionMoved
        );

        laser.style.left = convertToPXs(laserX);
        laser.style.top = convertToPXs(laserY);

        const dx = dxMap[session.lastDirectionMoved] * LASER.PLAYER_SPEED;
        const dy = dyMap[session.lastDirectionMoved] * LASER.PLAYER_SPEED;
        const angle = angleMap[session.lastDirectionMoved];

        laser.style.transform = `rotate(${angle}deg)`;
        gameBoardUI.appendChild(laser);

        // Animate laser movement
        for (let i = 0; i < LASER.PLAYER_FRAMES; i++) {
            sleep(i * LASER.PLAYER_FRAME_DELAY).then(() => {
                if (!laser.parentNode) return; // Already removed

                laser.style.top = convertToPXs(laserY - dy * i);
                laser.style.left = convertToPXs(laserX - dx * i);

                // Check collision with enemy tank
                if (collides(laser, getCellElemFromCell(session.startCell))) {
                    document.querySelector(".start")?.classList.remove("start");
                    gameOverHandler("You shot the enemy tank!");
                    return;
                }

                // Check collision with walls (snapshot to avoid live collection issues)
                const walls = Array.from(document.getElementsByClassName("wall"));
                for (const wall of walls) {
                    if (collides(laser, wall)) {
                        laser.remove();
                        return;
                    }
                }

                // Remove if off-board
                if (!collides(laser, gameBoardUI)) {
                    laser.remove();
                }
            });
        }

        sleep(LASER.LIFETIME).then(() => laser.remove());
    }

    /**
     * Calculates the direction from enemy tank to player tank.
     * @returns {string} The cardinal direction towards the player
     */
    function getComputerLaserDirection() {
        const enemyTank = session.startCell;
        const playerTank = session.endCell;

        if (enemyTank.x === playerTank.x) {
            return enemyTank.y > playerTank.y ? "N" : "S";
        }
        if (enemyTank.y === playerTank.y) {
            return enemyTank.x > playerTank.x ? "W" : "E";
        }

        // Diagonal directions
        if (enemyTank.x < playerTank.x) {
            return enemyTank.y < playerTank.y ? "SE" : "NE";
        }
        return enemyTank.y > playerTank.y ? "NW" : "SW";
    }

    /**
     * Calculates the angle from enemy tank to player tank.
     * @returns {number[]} Array of [degrees, radians]
     */
    function getAngleDegrees() {
        const enemyTank = session.startCell;
        const playerTank = session.endCell;

        const deltaX = enemyTank.x - playerTank.x;
        const deltaY = enemyTank.y - playerTank.y;

        const radians = Math.atan2(deltaY, deltaX);
        let degrees = (radians * 180) / Math.PI - 90;

        // Normalize to 0-360 range
        degrees = ((degrees % 360) + 360) % 360;

        return [degrees, radians];
    }

    /**
     * Fires the enemy laser towards the player.
     * Uses seeking behavior that tracks player movement.
     */
    function fireEnemyLaser() {
        const laser = document.createElement("div");
        laser.classList.add("enemylaser");

        const [laserX, laserY] = getXYForLaser(
            getCellElemFromCell(session.startCell),
            getComputerLaserDirection()
        );

        laser.style.left = convertToPXs(laserX);
        laser.style.top = convertToPXs(laserY);

        const [initialDegrees] = getAngleDegrees();
        laser.style.transform = `rotate(${initialDegrees}deg)`;

        gameBoardUI.appendChild(laser);

        // Animate laser with seeking behavior
        for (let i = 0; i < LASER.ENEMY_FRAMES; i++) {
            sleep(i * LASER.ENEMY_FRAME_DELAY).then(() => {
                if (!laser.parentNode) return; // Already removed

                // Recalculate angle for seeking behavior
                const [degrees, radians] = getAngleDegrees();
                const dx = Math.cos(radians) * LASER.ENEMY_SPEED;
                const dy = Math.sin(radians) * LASER.ENEMY_SPEED;

                laser.style.transform = `rotate(${degrees}deg)`;
                laser.style.top = convertToPXs(laserY - dy * i);
                laser.style.left = convertToPXs(laserX - dx * i);

                // Check collision with player tank
                if (collides(laser, getCellElemFromCell(session.endCell))) {
                    document.querySelector(".start")?.classList.remove("start");
                    gameOverHandler("Enemy tank shot you!");
                    return;
                }

                // Check collision with walls (snapshot to avoid live collection issues)
                const walls = Array.from(document.getElementsByClassName("wall"));
                for (const wall of walls) {
                    if (collides(laser, wall)) {
                        laser.remove();
                        return;
                    }
                }

                // Remove if off-board
                if (!collides(laser, gameBoardUI)) {
                    laser.remove();
                }
            });
        }

        sleep(LASER.LIFETIME).then(() => laser.remove());
    }

    // ========================================================================
    // Mine System
    // ========================================================================

    /**
     * Places a mine at the player's current position.
     * Mine flashes and explodes after a delay.
     */
    async function placeMine() {
        if (!session.hasStarted || session.hasEnded || session.paused) return;
        if (mineCount >= MINE.MAX_ACTIVE) return;

        mineCount++;

        const cell = session.endCell;
        const cellElem = getCellElemFromCell(cell);
        cellElem.classList.add("mine");

        // Flash animation
        for (let count = 0; count < MINE.FLASH_COUNT; count++) {
            await sleep(MINE.FLASH_DURATION);
            if (session.hasEnded) break;

            cellElem.classList.add("mineFlash");

            await sleep(MINE.FLASH_DURATION);
            if (session.hasEnded) break;

            cellElem.classList.remove("mineFlash");
        }

        if (session.hasEnded) {
            cellElem.classList.remove("mine", "mineFlash");
        } else {
            // Check for enemy in blast radius
            for (const n of cell.neighbors) {
                const neighborCell = session.gameBoard.getCell(n.x, n.y);

                if (neighborCell.startCell) {
                    document.querySelector(".start")?.classList.remove("start");
                    gameOverHandler("You blew up the enemy tank!");
                } else {
                    getCellElemFromCell(neighborCell).classList.add("mineFlash");
                }
            }

            // Clear explosion effect
            await sleep(MINE.FLASH_DURATION);
            for (const n of cell.neighbors) {
                const neighborCell = session.gameBoard.getCell(n.x, n.y);
                getCellElemFromCell(neighborCell).classList.remove("mineFlash");
            }

            cellElem.classList.remove("mine");
        }

        mineCount--;
    }

    // ========================================================================
    // Game Loop
    // ========================================================================

    /**
     * Main game tick - moves enemy and fires enemy laser.
     */
    async function gameTick() {
        while (!session.hasEnded && !session.paused) {
            session.speed = parseInt(difficultySelect.value, 10);
            moveEnemyTowardsPlayer();
            fireEnemyLaser();
            await sleep(session.speed);
        }
    }

    /**
     * Event loop - processes player input queues.
     */
    async function eventLoop() {
        while (!session.hasEnded && !session.paused) {
            const movementEvent = session.movementQueue.dequeue();
            if (movementEvent) {
                movePlayerTank(movementEvent.description);
            }

            const firingEvent = session.firingQueue.dequeue();
            if (firingEvent && keyDowns[" "]) {
                firePlayerLaser();
            }

            const pressedEvents = getPressedEvents();
            for (const event of pressedEvents) {
                if (event.type === "move" && checkValidKeyState() && validMove(event.description)) {
                    session.movementQueue.enqueue(event);
                }
                if (event.type === "fire") {
                    session.firingQueue.enqueue(event);
                }
            }

            await sleep(EVENT_LOOP_TICK);
        }
    }

    // ========================================================================
    // Keyboard Input
    // ========================================================================

    /** Keys that should have their default behavior prevented */
    const PREVENT_DEFAULT_KEYS = new Set([
        "Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyM"
    ]);

    /**
     * Handles keydown events for game input.
     * @param {KeyboardEvent} e - The keyboard event
     */
    function keyDownHandler(e) {
        if (PREVENT_DEFAULT_KEYS.has(e.code)) {
            e.preventDefault();
        }

        if (session.hasStarted && !session.hasEnded) {
            keyDowns[e.key] = true;

            if (!session.paused && checkValidKeyState() && e.key !== " ") {
                session.movementQueue.empty();
                const pressedEvents = getPressedEvents();
                for (const event of pressedEvents) {
                    if (event.type === "move") {
                        session.movementQueue.enqueue(event);
                    }
                }
            }
        }
    }

    /**
     * Handles keyup events for game input.
     * @param {KeyboardEvent} e - The keyboard event
     */
    function keyUpHandler(e) {
        if (PREVENT_DEFAULT_KEYS.has(e.code)) {
            e.preventDefault();
        }

        if (session.hasStarted && !session.hasEnded) {
            keyDowns[e.key] = false;

            if (!session.paused) {
                if (e.key !== " " && e.key !== "m") {
                    session.movementQueue.empty();
                } else if (e.key === " ") {
                    firePlayerLaser();
                    session.firingQueue.empty();
                } else if (e.key === "m") {
                    placeMine();
                }

                const pressedEvents = getPressedEvents();
                for (const event of pressedEvents) {
                    if (event.type === "move" && checkValidKeyState()) {
                        session.movementQueue.enqueue(event);
                    } else if (event.type === "fire" && checkValidKeyState()) {
                        session.firingQueue.enqueue(event);
                    }
                }
            }
        }
    }

    // ========================================================================
    // Game State Management
    // ========================================================================

    /**
     * Removes all elements with a given class name safely.
     * Uses Array.from to avoid live collection mutation issues.
     * @param {string} className - The class name to remove
     */
    function removeAllByClass(className) {
        const elements = Array.from(document.getElementsByClassName(className));
        elements.forEach(el => el.remove());
    }

    /**
     * Handles game over state.
     * @param {string} message - The game over message to display
     */
    function gameOverHandler(message) {
        // Clean up all lasers safely
        removeAllByClass("laser");
        removeAllByClass("enemylaser");

        alert(message);
        session.hasEnded = true;
        reloadButton.classList.remove("notShown");
    }

    /**
     * Handles pause/unpause toggle.
     */
    function pauseHandler() {
        if (session.hasEnded || !session.hasStarted) return;

        session.paused = !session.paused;

        if (!session.paused) {
            gameTick();
            eventLoop();
            reloadButton.classList.add("notShown");
        } else {
            session.movementQueue.empty();
            session.firingQueue.empty();
            reloadButton.classList.remove("notShown");
        }

        pauseButton.textContent = session.paused ? "Unpause" : "Pause";
    }

    /**
     * Starts the game after setup is complete.
     */
    function start() {
        if (!session.startSet || !session.endSet || session.hasStarted) {
            return;
        }

        clearSelection();
        uiChangesOnStart();

        session.hasStarted = true;
        session.settingWalls = false;

        drawPath(session.endCell);
        disableHover();

        if (session.startLocated) {
            walkPath(session.startCell);
            window.focus();
            gameTick();
            eventLoop();
        } else {
            document.getElementById("wallMessage").classList.add("hidden");
            document.getElementById("noPathMessage").classList.remove("hidden");
        }
    }

    /**
     * Updates UI when game starts.
     */
    function uiChangesOnStart() {
        startButton.removeEventListener("click", start);
        startButton.disabled = true;
        startButton.blur();
        startButton.classList.add("hidden");
        document.getElementById("wallMessage").classList.add("notShown");
        pauseButton.classList.remove("hidden");
        reloadButton.classList.add("notShown");

        for (const cellElem of document.querySelectorAll(".cell")) {
            cellElem.removeEventListener("mouseover", highlightCell);
            cellElem.removeEventListener("mouseout", highlightCellRevert);
        }
    }

    /**
     * Removes hover effects from all cells.
     */
    function disableHover() {
        session.gameBoard.forEachCellWithElement((cell, cellElem) => {
            cellElem.classList.remove("cell_hover");
        });
    }

    // ========================================================================
    // Grid Building
    // ========================================================================

    /**
     * Builds the game grid based on selected map size.
     * @param {Event} e - The click event
     */
    function buildGrid(e) {
        if (session.hasStarted || session.gridBuilt) return;

        e.target.classList.add("hidden");
        startButton.disabled = false;
        startButton.classList.remove("hidden");

        const mapSize = parseInt(document.getElementById("mapSize").value, 10);
        session.gameBoard.cols = mapSize;
        session.gameBoard.rows = mapSize;

        document.getElementById("mapSizeDropdown").classList.add("hidden");
        document.getElementsByClassName("controls")[0].classList.add("hidden");

        buildGridInternal();

        session.gridBuilt = true;
        document.getElementById("startMessage").classList.remove("hidden");
        startButton.scrollIntoView({ behavior: "smooth" });
        document.getElementById("gameBoardWrapper").classList.add("newClass");
    }

    /**
     * Creates the grid DOM elements and cell objects.
     */
    function buildGridInternal() {
        const { cols, rows } = session.gameBoard;
        const totalCells = cols * rows;

        // Determine cell size class based on grid size
        let cellSizeClass;
        if (totalCells < CELL_SIZE_THRESHOLDS.LARGE) {
            cellSizeClass = "large_cell";
        } else if (totalCells < CELL_SIZE_THRESHOLDS.MEDIUM) {
            cellSizeClass = "medium_cell";
        } else if (totalCells < CELL_SIZE_THRESHOLDS.SMALL) {
            cellSizeClass = "small_cell";
        } else {
            cellSizeClass = "x-small_cell";
        }

        for (let x = 0; x < cols; x++) {
            session.gameBoard.push([]);

            const col = document.createElement("div");
            col.id = `col-${x}`;
            col.classList.add("col");
            col.draggable = false;
            col.ondragstart = () => false;

            gameBoardUI.appendChild(col);

            for (let y = 0; y < rows; y++) {
                const newCell = new Cell(x, y, session);
                session.gameBoard.pushX(x, newCell);
                session.gameBoard.getCell(x, y).setNeighbors();

                const cellElem = document.createElement("div");
                cellElem.id = getCellId(x, y);
                cellElem.classList.add("cell", "cell_hover", cellSizeClass);
                cellElem.draggable = false;
                cellElem.ondragstart = () => false;

                col.appendChild(cellElem);

                // Cache the element for faster lookups later
                session.gameBoard.cacheElement(x, y, cellElem);

                cellElem.addEventListener("mouseup", (e) => newCell.handleClick(e));
                cellElem.addEventListener("mouseover", highlightCell);
                cellElem.addEventListener("mouseout", highlightCellRevert);
            }
        }
    }

    /**
     * Highlights a cell based on current setup phase.
     * @param {MouseEvent} e - The mouse event
     */
    function highlightCell(e) {
        if (session.settingStart) {
            e.target.classList.add("startHighlight");
        } else if (session.settingEnd) {
            e.target.classList.add("endHighlight");
        } else if (session.settingWalls) {
            e.target.classList.add("wallHighlight");
        }
    }

    /**
     * Toggles the visibility of the controls list.
     */
    function toggleControlList() {
        const list = document.getElementById("ctrlList");
        const btn = document.getElementById("hideBtn");

        list.classList.toggle("hidden");
        btn.textContent = list.classList.contains("hidden") ? "Show" : "Hide";
    }

    // ========================================================================
    // Initialization
    // ========================================================================

    (function init() {
        // Button event listeners
        startButton.addEventListener("click", start);
        document.getElementById("buildGrid").addEventListener("click", buildGrid);
        pauseButton.addEventListener("click", pauseHandler);
        document.getElementById("hideBtn").addEventListener("click", toggleControlList);

        // Mouse state tracking
        document.body.onmousedown = setLeftButtonState;
        document.body.onmousemove = setLeftButtonState;
        document.body.onmouseup = setLeftButtonState;

        // Keyboard input
        document.addEventListener("keydown", keyDownHandler);
        document.addEventListener("keyup", keyUpHandler);

        // Initial UI state
        startButton.disabled = true;

        // Prevent context menu and dragging
        document.oncontextmenu = () => false;
        document.draggable = false;
        document.ondragstart = () => false;

        // Blur difficulty selector on change
        difficultySelect.addEventListener("change", () => {
            difficultySelect.blur();
        });

        // Prevent game board dragging
        gameBoardUI.draggable = false;
        gameBoardUI.ondragstart = () => false;
    })();
})();
