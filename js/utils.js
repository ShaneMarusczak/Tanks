/**
 * Utility functions for the Tanks game.
 * Contains DOM helpers, direction maps, and collision detection.
 */

// ============================================================================
// DOM Utilities
// ============================================================================

/**
 * Converts a number to a CSS pixel value string.
 * @param {number} num - The number to convert
 * @returns {string} The number with 'px' suffix
 */
const convertToPXs = (num) => num + "px";

/**
 * Returns a promise that resolves after the specified delay.
 * @param {number} ms - The delay in milliseconds
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generates a cell element ID from coordinates.
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @returns {string} The cell element ID
 */
function getCellId(x, y) {
    return `cell-${x}-${y}`;
}

/**
 * Extracts x,y coordinates from a cell element.
 * @param {HTMLElement} cell - The cell element
 * @returns {number[]} Array of [x, y] coordinates
 */
function getXYFromCell(cell) {
    const parts = cell.id.split("-");
    return [parseInt(parts[1], 10), parseInt(parts[2], 10)];
}

/**
 * Gets a cell DOM element by coordinates.
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @returns {HTMLElement} The cell element
 */
function getCellElem(x, y) {
    return document.getElementById(getCellId(x, y));
}

/**
 * Gets a cell DOM element from a Cell object.
 * @param {Cell} cell - The cell object
 * @returns {HTMLElement} The cell element
 */
function getCellElemFromCell(cell) {
    return document.getElementById(getCellId(cell.x, cell.y));
}

/**
 * Clears any text selection in the document.
 */
function clearSelection() {
    if (window.getSelection) {
        window.getSelection().removeAllRanges();
    } else if (document.selection) {
        document.selection.empty();
    }
}

/**
 * Removes highlight classes from a cell element.
 * @param {MouseEvent} e - The mouse event
 */
function highlightCellRevert(e) {
    e.target.classList.remove("startHighlight", "endHighlight", "wallHighlight");
}

// ============================================================================
// Grid Utilities
// ============================================================================

/**
 * Checks if a position is within the grid bounds.
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @param {number} cols - Number of columns
 * @param {number} rows - Number of rows
 * @returns {boolean} True if position is valid
 */
function validPosition(x, y, cols, rows) {
    return x >= 0 && x < cols && y >= 0 && y < rows;
}

/**
 * Creates a neighbor object for pathfinding.
 * @param {number} x - The x coordinate
 * @param {number} y - The y coordinate
 * @param {number} connectionCost - The movement cost to this neighbor
 * @param {string} direction - The cardinal direction
 * @returns {Object} The neighbor object
 */
function buildNeighbor(x, y, connectionCost, direction) {
    return { x, y, connectionCost, direction };
}

/**
 * Determines the cardinal direction from delta coordinates.
 * @param {number} dirX - The x direction (-1, 0, or 1)
 * @param {number} dirY - The y direction (-1, 0, or 1)
 * @returns {string} The cardinal direction (N, NE, E, SE, S, SW, W, NW)
 */
function getCellConnectionDirection(dirX, dirY) {
    const directionMap = {
        "0,-1": "N",
        "1,-1": "NE",
        "1,0": "E",
        "1,1": "SE",
        "0,1": "S",
        "-1,1": "SW",
        "-1,0": "W",
        "-1,-1": "NW"
    };
    return directionMap[`${dirX},${dirY}`];
}

// ============================================================================
// Direction Maps for Laser Movement
// ============================================================================

/**
 * Maps directions to x-axis movement deltas.
 */
const dxMap = {
    N: 0,
    S: 0,
    E: -1,
    W: 1,
    NE: -1,
    NW: 1,
    SE: -1,
    SW: 1
};

/**
 * Maps directions to y-axis movement deltas.
 */
const dyMap = {
    N: 1,
    S: -1,
    E: 0,
    W: 0,
    NE: 1,
    NW: 1,
    SE: -1,
    SW: -1
};

/**
 * Maps directions to rotation angles in degrees.
 */
const angleMap = {
    N: 0,
    S: 0,
    E: 90,
    W: 90,
    NE: 45,
    NW: -45,
    SE: -45,
    SW: 45
};

// ============================================================================
// Collision Detection
// ============================================================================

/**
 * Checks if two elements are colliding using bounding box intersection.
 * @param {HTMLElement} elem1 - The first element
 * @param {HTMLElement} elem2 - The second element
 * @returns {boolean} True if the elements are colliding
 */
function collides(elem1, elem2) {
    const rect1 = elem1.getBoundingClientRect();
    const rect2 = elem2.getBoundingClientRect();

    return (
        rect1.top < rect2.bottom &&
        rect1.bottom > rect2.top &&
        rect1.left < rect2.right &&
        rect1.right > rect2.left
    );
}
