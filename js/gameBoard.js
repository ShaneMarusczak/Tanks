/**
 * Represents the game board grid.
 * Manages the 2D array of cells.
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
     * @returns {Cell} The cell at the given position
     */
    getCell(x, y) {
        return this.boardArray[x][y];
    }
}
