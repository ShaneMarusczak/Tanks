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
        if (this.session.settingStart && !this.session.hasStarted && !this.session.settingWalls && e.button === 0) {
            this.startCell = true;
            getCellElem(this.x, this.y).classList.add("start");
            this.session.startCell = this;
            this.session.settingStart = false;
            this.session.settingEnd = true;
            this.session.startSet = true;
            document.getElementById("startMessage").classList.add("hidden");
            document.getElementById("endMessage").classList.remove("hidden");
        } else if (this.session.settingEnd && !this.session.hasStarted && !this.session.settingWalls && e.button === 0) {
            this.session.endCell = this;
            this.endCell = true;
            getCellElem(this.x, this.y).classList.add("end");
            this.session.settingEnd = false;
            this.session.endSet = true;
            document.getElementById("endMessage").classList.add("hidden");
            document.getElementById("wallMessage").classList.remove("hidden");
            this.session.settingWalls = true;
            for (let x = 0; x < this.session.gameBoard.cols; x++) {
                for (let y = 0; y < this.session.gameBoard.rows; y++) {
                    getCellElem(x, y).addEventListener("mouseover", (e) => onMouseOver(e, this));
                }
            }
        } else if (!this.session.settingEnd && !this.session.settingStart && this.session.settingWalls && !this.session.hasStarted && e.button === 2) {
            this.wall = false;
            getCellElem(this.x, this.y).classList.remove("wall");
        }
    }
}

/**
 * Handles mouse over events for wall placement during setup.
 * @param {MouseEvent} e - The mouse event
 * @param {Cell} c - The cell context
 */
function onMouseOver(e, c) {
    clearSelection();
    if (c.session.leftMouseButtonOnlyDown && !c.session.hasStarted && c.session.settingWalls) {
        const [x, y] = getXYFromCell(e.target);
        const cell = c.session.gameBoard.getCell(x, y);
        if (cell.startCell || cell.endCell || cell.wall) {
            return;
        }
        cell.wall = true;
        e.target.classList.add("wall");
    }
}
