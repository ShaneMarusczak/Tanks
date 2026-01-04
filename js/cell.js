/**
 * Represents a single cell in the game grid.
 * Handles cell state, neighbor relationships, and user interactions.
 */
class Cell {
    /**
     * @param {number} x - The x coordinate of the cell
     * @param {number} y - The y coordinate of the cell
     * @param {GameSession} session - The current game session
     */
    constructor(x, y, session) {
        this.x = x;
        this.y = y;
        this.neighbors = [];
        this.wall = false;
        this.path = false;
        this.startCell = false;
        this.endCell = false;
        this.distance = 0;
        this.visited = false;
        this.session = session;
    }

    /**
     * Populates the neighbors array with adjacent cells.
     * Cardinal directions have a connection cost of 1,
     * diagonal directions have a connection cost of sqrt(2).
     */
    setNeighbors() {
        const dirs = [-1, 0, 1];
        for (const dirX of dirs) {
            for (const dirY of dirs) {
                if (dirX === 0 && dirY === 0) {
                    continue;
                }
                if (validPosition(this.x + dirX, this.y + dirY, this.session.gameBoard.cols, this.session.gameBoard.rows)) {
                    const cardinalDirection = getCellConnectionDirection(dirX, dirY);
                    const connectionCost = (dirX === 0 || dirY === 0) ? 1 : Math.SQRT2;
                    this.neighbors.push(buildNeighbor(this.x + dirX, this.y + dirY, connectionCost, cardinalDirection));
                }
            }
        }
    }

    /**
     * Gets a neighbor by direction.
     * @param {string} direction - The direction (N, NE, E, SE, S, SW, W, NW)
     * @returns {Object|undefined} The neighbor object or undefined
     */
    getNeighbor(direction) {
        return this.neighbors.find(n => n.direction === direction);
    }

    /**
     * Finds the neighboring cell with the lowest distance value.
     * Used for pathfinding to trace the shortest path back.
     * @returns {Cell|null} The neighbor with the lowest distance, or null if none found
     */
    getLowestDistanceNeighbor() {
        let low = Infinity;
        let lowCell = null;
        for (const n of this.neighbors) {
            const cell = this.session.gameBoard.getCell(n.x, n.y);
            if (cell.distance < low && cell.visited && !cell.wall) {
                low = cell.distance;
                lowCell = cell;
            }
        }
        return lowCell;
    }

    /**
     * Handles mouse click events on this cell.
     * Manages placing start/end tanks and walls.
     * @param {MouseEvent} e - The mouse event
     */
    handleClick(e) {
        const { session } = this;

        if (session.settingStart && !session.hasStarted && !session.settingWalls && e.button === 0) {
            this.startCell = true;
            getCellElem(this.x, this.y).classList.add("start");
            session.startCell = this;
            session.settingStart = false;
            session.settingEnd = true;
            session.startSet = true;
            document.getElementById("startMessage").classList.add("hidden");
            document.getElementById("endMessage").classList.remove("hidden");
        } else if (session.settingEnd && !session.hasStarted && !session.settingWalls && e.button === 0) {
            session.endCell = this;
            this.endCell = true;
            getCellElem(this.x, this.y).classList.add("end");
            session.settingEnd = false;
            session.endSet = true;
            document.getElementById("endMessage").classList.add("hidden");
            document.getElementById("wallMessage").classList.remove("hidden");
            session.settingWalls = true;
            // Add wall drawing listeners - pass session directly instead of cell context
            session.gameBoard.forEachCellWithElement((cell, cellElem) => {
                cellElem.addEventListener("mouseover", (e) => onMouseOver(e, session));
            });
        } else if (!session.settingEnd && !session.settingStart && session.settingWalls && !session.hasStarted && e.button === 2) {
            this.wall = false;
            getCellElem(this.x, this.y).classList.remove("wall");
        }
    }
}

/**
 * Handles mouse over events for wall placement during setup.
 * @param {MouseEvent} e - The mouse event
 * @param {GameSession} session - The game session
 */
function onMouseOver(e, session) {
    clearSelection();
    if (session.leftMouseButtonOnlyDown && !session.hasStarted && session.settingWalls) {
        const [x, y] = getXYFromCell(e.target);
        const cell = session.gameBoard.getCell(x, y);
        if (cell.startCell || cell.endCell || cell.wall) {
            return;
        }
        cell.wall = true;
        e.target.classList.add("wall");
    }
}
