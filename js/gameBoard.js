class GameBoard {
    constructor(rows, cols) {
        this.rows = rows;
        this.cols = cols;
        this.boardArray = [];
    }

    push(e) {
        this.boardArray.push(e);
    }

    pushX(x, e) {
        this.boardArray[x].push(e);
    }

    getCell(x, y) {
        return this.boardArray[x][y];
    }
}