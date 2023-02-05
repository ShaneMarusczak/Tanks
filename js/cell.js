class Cell {
    constructor(x, y, session) {
        this.x = x;
        this.y = y;
        this.neighbors = [];
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
                if (validPosition(this.x + dir_x, this.y + dir_y, this.session.gameBoard.cols, this.session.gameBoard.rows)) {
                    if (dir_x === 0 && dir_y === 0) {
                        continue;
                    }
                    let cardinal_direction = getCellConnectionDirection(dir_x, dir_y);
                    if (dir_x === 0 || dir_y === 0) {
                        this.neighbors.push(build_neighbor(this.x + dir_x, this.y + dir_y, 1, cardinal_direction));
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
            let cell = this.session.gameBoard.getCell(n.x, n.y);
            if (cell.distance < low && cell.visited && !cell.wall) {
                low = cell.distance;
                lowCell = cell;
            }
        }
        return lowCell;
    }

    getLowestCrowFly(cell) {
        let low = Infinity;
        let lowCell = null
        let connection_cost = null;
        for (let n of this.neighbors) {
            let n_cell = this.session.gameBoard.getCell(n.x, n.y);
            let d = cell.getCrowFlyDistance(cell)
            if (d < low && !cell.searched && !cell.wall) {
                low = cell.d;
                lowCell = n_cell;
                connection_cost = n.connection_cost;
            }
        }
        lowCell.searched = true;
        return [lowCell, connection_cost];
    }

    getCrowFlyDistance(cell) {
        return Math.sqrt((cell.x - this.x) ^ 2 + (cell.y - this.y) ^ 2);
    }

    handleClick(e) {
        if (this.session.settingStart && !this.session.hasStarted && !this.session.settingWalls && e.button === 0) {
            this.start_cell = true;
            getCellElem(this.x, this.y).classList.add("start");
            this.session.startCell = this;
            this.session.settingStart = false;
            this.session.settingEnd = true;
            this.session.startSet = true;
            document.getElementById("startMessage").classList.add("hidden");
            document.getElementById("endMessage").classList.remove("hidden");
        } else if (this.session.settingEnd && !this.session.hasStarted && !this.session.settingWalls && e.button === 0) {
            this.session.endCell = this;
            this.end_cell = true;
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

function onMouseOver(e, c) {
    clearSelection();
    if (c.session.leftMouseButtonOnlyDown && !c.session.hasStarted && c.session.settingWalls) {
        let [x, y] = getXYFromCell(e.target);
        let cell = c.session.gameBoard.getCell(x, y);
        if (cell.start_cell || cell.end_cell || cell.wall) {
            return;
        }
        cell.wall = true;
        e.target.classList.add("wall");
    }
}