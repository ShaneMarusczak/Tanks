/**
 * Manages the state of a game session.
 * Contains all game state flags and references.
 */
class GameSession {
    /**
     * @param {number} speed - Enemy tank movement speed in milliseconds
     * @param {number} rows - Number of grid rows
     * @param {number} cols - Number of grid columns
     */
    constructor(speed, rows, cols) {
        // Game state flags
        this.hasStarted = false;
        this.hasEnded = false;
        this.paused = false;
        this.gridBuilt = false;

        // Setup phase flags
        this.settingStart = true;
        this.settingEnd = false;
        this.settingWalls = false;
        this.startSet = false;
        this.endSet = false;
        this.startLocated = false;

        // Game configuration
        this.speed = speed;
        this.gameBoard = new GameBoard(rows, cols);

        // Event queues
        this.movementQueue = new Queue();
        this.firingQueue = new Queue();

        // Input state
        this.leftMouseButtonOnlyDown = false;

        // Tank references
        this.startCell = null;
        this.endCell = null;
        this.lastDirectionMoved = "N";
    }
}
