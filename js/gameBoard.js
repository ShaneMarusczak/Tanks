/**
 * Represents the game board grid.
 * Manages the 2D array of cells and provides traversal utilities.
 */
class GameBoard {
    /**
     * @param {number} rows - Number of rows in the grid
     * @param {number} cols - Number of columns in the grid
     */
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.boardArray = [];
        this.elementCache = new Map();
    }

    /**
     * Adds a new column array to the board.
     * @param {Array} column - The column array to add
     */
    push(column) {
        this.boardArray.push(column);
    }

    /**
     * Adds a cell to a specific column.
     * @param {number} x - The column index
     * @param {Cell} cell - The cell to add
     */
    pushX(x, cell) {
        this.boardArray[x].push(cell);
    }

    /**
     * Retrieves a cell at the specified coordinates.
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @returns {Cell|undefined} The cell at the given position
     */
    getCell(x, y) {
        const column = this.boardArray[x];
        return column ? column[y] : undefined;
    }

    /**
     * Caches a DOM element for a cell position.
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {HTMLElement} element - The DOM element to cache
     */
    cacheElement(x, y, element) {
        this.elementCache.set(`${x},${y}`, element);
    }

    /**
     * Retrieves a cached DOM element for a cell position.
     * Falls back to getElementById if not cached.
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @returns {HTMLElement} The cell DOM element
     */
    getElement(x, y) {
        const key = `${x},${y}`;
        let element = this.elementCache.get(key);
        if (!element) {
            element = document.getElementById(getCellId(x, y));
            if (element) {
                this.elementCache.set(key, element);
            }
        }
        return element;
    }

    /**
     * Iterates over all cells in the grid.
     * @param {function(Cell, number, number): void} callback - Function called for each cell
     */
    forEachCell(callback) {
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                callback(this.getCell(x, y), x, y);
            }
        }
    }

    /**
     * Iterates over all cells with their DOM elements.
     * @param {function(Cell, HTMLElement, number, number): void} callback - Function called for each cell
     */
    forEachCellWithElement(callback) {
        for (let x = 0; x < this.cols; x++) {
            for (let y = 0; y < this.rows; y++) {
                callback(this.getCell(x, y), this.getElement(x, y), x, y);
            }
        }
    }
}
