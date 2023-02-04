class GameSession {
    constructor(speed, rows, cols) {
        this.hasStarted = false;
        this.hasEnded = false;
        this.paused = false;
        this.gridBuilt = false;
        this.settingEnd = false;
        this.settingWalls = false;
        this.startSet = false;
        this.endSet = false;
        this.startLocated = false;
        this.settingStart = true;
        this.speed = speed;
        this.gameBoard = new GameBoard(rows, cols);
        this.movementQueue = new Queue();
        this.firingQueue = new Queue();
    }

}