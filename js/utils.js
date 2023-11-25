const convertToPXs = (num) => num + "px";

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function getCellId(x, y) {
    return "cell-" + x + "-" + y;
}

function getXYFromCell(cell) {
    return [cell.id.split("-")[1], cell.id.split("-")[2]];
}

function getCellElem(x, y) {
    return document.getElementById(getCellId(x, y));
}

function getCellElemFromCell(cell) {
    return document.getElementById(getCellId(cell.x, cell.y));
}

function validPosition(x, y, cols, rows) {
    return x >= 0 && x < cols && y >= 0 && y < rows;
}

function build_neighbor(x, y, connection_cost, direction) {
    return {
        x,
        y,
        connection_cost,
        direction
    };
}

function highlightCellRevert(e) {
    e.target.classList.remove("startHighlight");
    e.target.classList.remove("endHighlight");
    e.target.classList.remove("wallHighlight");
}

function getCellConnectionDirection(dir_x, dir_y) {
    if (dir_x === 0 && dir_y === -1) {
        return "N";
    } else if (dir_x === 1 && dir_y === -1) {
        return "NE";
    } else if (dir_x === 1 && dir_y === 0) {
        return "E";
    } else if (dir_x === 1 && dir_y === 1) {
        return "SE";
    } else if (dir_x === 0 && dir_y === 1) {
        return "S";
    } else if (dir_x === -1 && dir_y === 1) {
        return "SW";
    } else if (dir_x === -1 && dir_y === 0) {
        return "W";
    } else {
        return "NW";
    }
}

function clearSelection() {
    if (window.getSelection) {
        window.getSelection().removeAllRanges();
    } else if (document.selection) {
        document.selection.empty();
    }
}

const dxmap = {
    "N": 0,
    "S": 0,
    "E": -1,
    "W": 1,
    "NE": -1,
    "NW": 1,
    "SE": -1,
    "SW": 1
}

const dymap = {
    "N": 1,
    "S": -1,
    "E": 0,
    "W": 0,
    "NE": 1,
    "NW": 1,
    "SE": -1,
    "SW": -1
}

const anglemap = {
    "N": 0,
    "S": 0,
    "E": 90,
    "W": 90,
    "NE": 45,
    "NW": -45,
    "SE": -45,
    "SW": 45
}

function colides(elem1, elem2) {
    const rect1 = elem1.getBoundingClientRect();
    const rect2 = elem2.getBoundingClientRect();

    return (
      rect1.top < rect2.bottom &&
      rect1.bottom > rect2.top &&
      rect1.left < rect2.right &&
      rect1.right > rect2.left
    );
}

