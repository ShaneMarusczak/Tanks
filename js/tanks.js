(function () {
  const session = new GameSession(150, 30, 30);

  const gameBoard_UI = document.getElementById("gameBoard_UI");
  const startButton = document.getElementById("start");
  const pauseButton = document.getElementById("pause");

  function setLeftButtonState(e) {
    session.leftMouseButtonOnlyDown =
      e.buttons === undefined ? e.which === 1 : e.buttons === 1;
  }

  function resetSignal(resetEnd = true) {
    for (let x = 0; x < session.gameBoard.cols; x++) {
      for (let y = 0; y < session.gameBoard.rows; y++) {
        let to_check = session.gameBoard.getCell(x, y);
        let to_check_elem = getCellElem(x, y);
        to_check.path = false;
        if (to_check.wall) {
          continue;
        }
        if (resetEnd) {
          to_check.end_cell = false;
          to_check_elem.classList.remove("end");
        }
        to_check_elem.classList.remove("path");
        to_check.visited = false;
        to_check.distance = 0;
      }
    }
  }

  function movePlayerTank(dir) {
    let cell;

    for (let n of session.endCell.neighbors) {
      if (n.direction === dir) {
        cell = session.gameBoard.getCell(n.x, n.y);
        break;
      }
    }
    if (typeof cell === "undefined" || cell === null) return;
    if (cell.wall) {
      return;
    } else if (cell.start_cell) {
      gameOverHandler("You ran into the enemy tank");
      return;
    }
    resetSignal();
    cell.end_cell = true;
    getCellElemFromCell(cell).classList.add("end");

    session.endCell = cell;

    draw_path(session.endCell);
    if (session.startLocated) {
      walk_path(session.startCell);
    }
    session.lastDirectionMoved = dir;
  }

  function moveEnemyTowardsPlayer() {
    let pathCell;
    for (let n of session.startCell.neighbors) {
      let cell = session.gameBoard.getCell(n.x, n.y);
      if (cell.end_cell) {
        gameOverHandler("Enemy crashed into you.");
        return;
      } else if (cell.path) {
        pathCell = cell;
        break;
      }
    }
    session.startCell.start_cell = false;
    getCellElem(session.startCell.x, session.startCell.y).classList.remove(
      "start",
    );

    session.startCell.path = false;
    pathCell.start_cell = true;

    session.startCell = pathCell;
    getCellElem(pathCell.x, pathCell.y).classList.add("start");

    resetSignal(false);
    draw_path(session.endCell);
    if (session.startLocated) {
      walk_path(session.startCell);
    }
  }

  function gameOverHandler(message) {
    Array.from(document.getElementsByClassName("laser")).forEach((l) =>
      l.remove(),
    );
    Array.from(document.getElementsByClassName("enemylaser")).forEach((l) =>
      l.remove(),
    );
    alert(message);
    session.hasEnded = true;
    document.getElementById("reload").classList.remove("notShown");
  }

  function uiChangesOnStart() {
    startButton.removeEventListener("click", start);
    startButton.disabled = true;
    startButton.blur();
    startButton.classList.add("hidden");
    document.getElementById("wallMessage").classList.add("notShown");
    pauseButton.classList.remove("hidden");
    document.getElementById("reload").classList.add("notShown");
    Array.from(document.querySelectorAll(".cell")).forEach((cell_elem) => {
      cell_elem.removeEventListener("mouseover", highlightCell);
      cell_elem.removeEventListener("mouselout", highlightCellRevert);
    });
  }

  function start() {
    if (!session.startSet || !session.endSet || session.hasStarted) {
      return;
    }

    clearSelection();
    uiChangesOnStart();

    session.hasStarted = true;
    session.settingWalls = false;

    draw_path(session.endCell);
    disableHover();
    if (session.startLocated) {
      walk_path(session.startCell);
      window.focus();
      gameTick();
      eventLoop();
    } else if (!session.startLocated) {
      document.getElementById("wallMessage").classList.add("hidden");
      document.getElementById("noPathMessage").classList.remove("hidden");
    }
  }

  function disableHover() {
    for (let x = 0; x < session.gameBoard.cols; x++) {
      for (let y = 0; y < session.gameBoard.rows; y++) {
        getCellElem(x, y).classList.remove("cell_hover");
      }
    }
  }

  function getXYForLaser(cellElem, dir) {
    const rv = [];
    if (dir === "N") {
      rv.push(cellElem.offsetLeft - 3.5 + cellElem.offsetWidth / 2);
      rv.push(cellElem.offsetTop - cellElem.offsetHeight / 2);
    } else if (dir === "S") {
      rv.push(cellElem.offsetLeft - 3.5 + cellElem.offsetWidth / 2);
      rv.push(cellElem.offsetTop + cellElem.offsetHeight / 2);
    } else if (dir === "E") {
      rv.push(cellElem.offsetLeft + cellElem.offsetWidth);
      rv.push(cellElem.offsetTop);
    } else if (dir === "W") {
      rv.push(cellElem.offsetLeft - 3.5);
      rv.push(cellElem.offsetTop);
    } else if (dir === "NW") {
      rv.push(cellElem.offsetLeft);
      rv.push(cellElem.offsetTop - cellElem.offsetHeight / 2);
    } else if (dir === "NE") {
      rv.push(cellElem.offsetLeft - 3.5 + cellElem.offsetWidth);
      rv.push(cellElem.offsetTop - cellElem.offsetHeight / 2);
    } else if (dir === "SW") {
      rv.push(cellElem.offsetLeft);
      rv.push(cellElem.offsetTop + cellElem.offsetHeight / 2);
    } else if (dir === "SE") {
      rv.push(cellElem.offsetLeft + cellElem.offsetWidth - 3.5);
      rv.push(cellElem.offsetTop + cellElem.offsetHeight / 2);
    }
    return rv;
  }

  //fire at the location of the mouse cursor when you fire, not seeking
  function firePlayerLaser() {
    const laser = document.createElement("div");
    laser.classList.add("laser");
    const [laserX, laserY] = getXYForLaser(
      getCellElemFromCell(session.endCell),
      session.lastDirectionMoved,
    );
    laser.style.left = convertToPXs(laserX);
    laser.style.top = convertToPXs(laserY);
    const dx = dxmap[session.lastDirectionMoved] * 20;
    const dy = dymap[session.lastDirectionMoved] * 20;
    const angle = anglemap[session.lastDirectionMoved];
    laser.style.transform = "rotate(" + angle + "deg)";
    gameBoard_UI.appendChild(laser);
    for (let i = 0; i < 30; i++) {
      sleep(i * 25).then(() => {
        laser.style.top = convertToPXs(laserY - dy * i);
        laser.style.left = convertToPXs(laserX - dx * i);
        if (colides(laser, getCellElemFromCell(session.startCell))) {
          document.getElementsByClassName("start")[0].classList.remove("start");
          gameOverHandler("You shot the enemy tank!");
        }
        Array.from(document.getElementsByClassName("wall")).forEach((w) => {
          if (colides(laser, w)) {
            laser.remove();
          }
        });

        if (!colides(laser, gameBoard_UI)) {
          laser.remove();
        }
      });
    }
    sleep(600).then(() => laser.remove());
  }

  async function eventLoop() {
    while (!session.hasEnded && !session.paused) {
      const movementEvent = session.movementQueue.dequeue();
      if (typeof movementEvent !== "undefined" && movementEvent !== null) {
        movePlayerTank(movementEvent.description);
      }
      const firingEvent = session.firingQueue.dequeue();
      if (
        typeof firingEvent !== "undefined" &&
        firingEvent !== null &&
        keyDowns[" "]
      ) {
        firePlayerLaser();
      }
      const pressedEvents = getPressedEvents();
      for (let event of pressedEvents) {
        if (
          event.type === "move" &&
          checkValidKeyState() &&
          validMove(event.description)
        ) {
          session.movementQueue.enqueue(event);
        }
        if (event.type === "fire") {
          session.firingQueue.enqueue(event);
        }
      }

      await sleep(100);
    }
  }

  function validMove(dir) {
    let cell;
    for (let n of session.endCell.neighbors) {
      if (n.direction === dir) {
        cell = session.gameBoard.getCell(n.x, n.y);
        if (typeof cell === "undefined" || cell === null) return false;
        if (cell.wall) return false;
        return true;
      }
    }
    return false;
  }

  async function gameTick() {
    while (!session.hasEnded && !session.paused) {
      singleStep();
      await sleep(session.speed);
    }
  }

  function singleStep() {
    session.speed = Array.from(
      document.getElementById("difficulty").options,
    ).find((d) => d.selected).value;
    moveEnemyTowardsPlayer();
    fireEnemyLaser();
  }

  function getComputerLaserDirection() {
    const enemeyTank = session.startCell;
    const playerTank = session.endCell;

    let firingDirection = "";
    if (enemeyTank.x == playerTank.x && enemeyTank.y > playerTank.y) {
      firingDirection = "N";
    } else if (enemeyTank.x == playerTank.x && enemeyTank.y < playerTank.y) {
      firingDirection = "S";
    } else if (enemeyTank.x > playerTank.x && enemeyTank.y == playerTank.y) {
      firingDirection = "W";
    } else if (enemeyTank.x < playerTank.x && enemeyTank.y == playerTank.y) {
      firingDirection = "E";
    } else if (enemeyTank.x < playerTank.x && enemeyTank.y < playerTank.y) {
      firingDirection = "SE";
    } else if (enemeyTank.x > playerTank.x && enemeyTank.y > playerTank.y) {
      firingDirection = "NW";
    } else if (enemeyTank.x < playerTank.x && enemeyTank.y > playerTank.y) {
      firingDirection = "NE";
    } else if (enemeyTank.x > playerTank.x && enemeyTank.y < playerTank.y) {
      firingDirection = "SW";
    }

    return firingDirection;
  }

  function getAngleDegrees() {
    const enemeyTank = session.startCell;
    const playerTank = session.endCell;
    let px = playerTank.x;
    let py = playerTank.y;
    const dir = session.lastDirectionMoved;

    //medium mode
    // if (dir === "N") {
    //   py = py - 3;
    // } else if (dir === "S") {
    //   py = py + 3;
    // } else if (dir === "E") {
    //   px = px + 3;
    // } else if (dir === "W") {
    //   px = px - 3;
    // } else if (dir === "NW") {
    //   py = py - 3;
    //   px = px - 3;
    // } else if (dir === "NE") {
    //   py = py - 3;
    //   px = px + 3;
    // } else if (dir === "SW") {
    //   py = py + 3;
    //   px = px - 3;
    // } else if (dir === "SE") {
    //   py = py + 3;
    //   px = px + 3;
    // }
    
    let deltaX = enemeyTank.x-px; 
    let deltaY = enemeyTank.y-py; 
    let radians = Math.atan2(deltaY, deltaX)
    let degrees = (radians * 180) / Math.PI - 90;
    while (degrees >= 360) degrees -= 360;
    while (degrees < 0) degrees += 360;
    return [degrees,radians];
  }

  function fireEnemyLaser() {
    const laser = document.createElement("div");
    laser.classList.add("enemylaser");
    const [laserX, laserY] = getXYForLaser(
      getCellElemFromCell(session.startCell),
      getComputerLaserDirection(),
    );
    laser.style.left = convertToPXs(laserX);
    laser.style.top = convertToPXs(laserY);
    const [d, r] = getAngleDegrees();
    laser.style.transform = "rotate(" + d + "deg)";

    gameBoard_UI.appendChild(laser);
    for (let i = 0; i < 40; i++) {
      sleep(i * 40).then(() => {

        //if hard mode
        const [degrees, radians] = getAngleDegrees();

        const dx = Math.cos(radians) * 25;
        const dy = Math.sin(radians) * 25;
        laser.style.transform = "rotate(" + degrees + "deg)";
        //to here

        laser.style.top = convertToPXs(laserY - dy * i);
        laser.style.left = convertToPXs(laserX - dx * i);

        if (colides(laser, getCellElemFromCell(session.endCell))) {
          document.getElementsByClassName("start")[0].classList.remove("start");
          gameOverHandler("Enemy tank shot you!");
        }
        Array.from(document.getElementsByClassName("wall")).forEach((w) => {
          if (colides(laser, w)) {
            laser.remove();
          }
        });

        if (!colides(laser, gameBoard_UI)) {
          laser.remove();
        }
      });
    }
    sleep(600).then(() => laser.remove());
  }

  function walk_path(root) {
    root.path = true;
    if (root.distance === 0) {
      return;
    }
    if (!root.start_cell) {
      getCellElem(root.x, root.y).classList.remove("visited");
      getCellElem(root.x, root.y).classList.add("path");
    }

    walk_path(root.getLowestDistanceNeighbor());
  }

  function draw_path(root) {
    const q = new Queue();
    root.visited = true;
    q.enqueue(root);
    while (!q.isEmpty()) {
      let cell = q.dequeue();
      if (cell.start_cell) {
        return;
      }
      for (let n of cell.neighbors.reverse()) {
        let n_cell = session.gameBoard.getCell(n.x, n.y);
        if (n.direction === "NE" && checkCorner("N", "E", cell, "NE")) {
          cell.neighbors.splice(cell.neighbors.indexOf(n), 1);
          continue;
        } else if (n.direction === "SE" && checkCorner("S", "E", cell, "SE")) {
          cell.neighbors.splice(cell.neighbors.indexOf(n), 1);
          continue;
        } else if (n.direction === "SW" && checkCorner("S", "W", cell, "SW")) {
          cell.neighbors.splice(cell.neighbors.indexOf(n), 1);
          continue;
        } else if (n.direction === "NW" && checkCorner("N", "W", cell, "NW")) {
          cell.neighbors.splice(cell.neighbors.indexOf(n), 1);
          continue;
        }
        if (n_cell.start_cell) {
          session.startLocated = true;
        }
        if (
          n_cell.distance > cell.distance + n.connection_cost &&
          n_cell.visited
        ) {
          n_cell.distance = cell.distance + n.connection_cost;
        }
        if (!n_cell.visited && !n_cell.wall) {
          n_cell.visited = true;
          n_cell.distance = cell.distance + n.connection_cost;
          if (!n_cell.wall) {
            q.enqueue(n_cell);
          }
        }
      }
    }
  }

  function checkCorner(n_1, n_2, c, d) {
    //TODO: I FEEL LIKE THIS CAN BE SIMPLIFIED SOMEHOW, DO THIS TODO LAST
    let cell_1 = null;
    let cell_2 = null;
    let cell_d = null;
    for (let n of c.neighbors) {
      if (n.direction === n_1) {
        cell_1 = session.gameBoard.getCell(n.x, n.y);
      }
      if (n.direction === n_2) {
        cell_2 = session.gameBoard.getCell(n.x, n.y);
      }
      if (n.direction === d) {
        cell_d = session.gameBoard.getCell(n.x, n.y);
      }
    }
    if (cell_1 === null || cell_2 === null || cell_d === null) {
      return false;
    }
    if (cell_1.wall && cell_2.wall) {
      return !cell_d.wall;
    }
    return false;
  }

  function buildGrid(e) {
    if (!session.hasStarted && !session.gridBuilt) {
      e.target.classList.add("hidden");
      startButton.disabled = false;
      startButton.classList.remove("hidden");
      const mapSize = Array.from(
        document.getElementById("mapSize").options,
      ).find((d) => d.selected).value;
      session.gameBoard.cols = mapSize;
      session.gameBoard.rows = mapSize;
      document.getElementById("mapSizeDropdown").classList.add("hidden");
      document.getElementsByClassName("controls")[0].classList.add("hidden");
      buildGridInternal();
      session.gridBuilt = true;
      document.getElementById("startMessage").classList.remove("hidden");
      startButton.scrollIntoView({ behavior: "smooth" });
      document.getElementById("gameBoardWrapper").classList.add("newClass");
    }
  }

  function buildGridInternal() {
    for (let x = 0; x < session.gameBoard.cols; x++) {
      session.gameBoard.push([]);
      const col = document.createElement("div");
      col.id = "col-" + x;
      col.classList.add("col");
      col.draggable = false;
      col.ondragstart = function () {
        return false;
      };
      gameBoard_UI.appendChild(col);
      for (let y = 0; y < session.gameBoard.rows; y++) {
        const newCell = new Cell(x, y, session);
        session.gameBoard.pushX(x, newCell);
        session.gameBoard.getCell(x, y).setNeighbors();
        const cell = document.createElement("div");
        cell.id = getCellId(x, y);
        cell.classList.add("cell");
        cell.classList.add("cell_hover");

        if (session.gameBoard.cols * session.gameBoard.rows < 25 * 25) {
          cell.classList.add("large_cell");
        } else if (session.gameBoard.cols * session.gameBoard.rows < 40 * 40) {
          cell.classList.add("medium_cell");
        } else if (session.gameBoard.cols * session.gameBoard.rows < 60 * 60) {
          cell.classList.add("small_cell");
        } else {
          cell.classList.add("x-small_cell");
        }

        col.appendChild(cell);
        cell.addEventListener("mouseup", (e) => newCell.handleClick(e));
        cell.addEventListener("mouseover", highlightCell);
        cell.addEventListener("mouseout", highlightCellRevert);
        cell.draggable = false;
        cell.ondragstart = function () {
          return false;
        };
      }
    }
  }

  function highlightCell(e) {
    if (session.settingStart) {
      e.target.classList.add("startHighlight");
    } else if (session.settingEnd) {
      e.target.classList.add("endHighlight");
    } else if (session.settingWalls) {
      e.target.classList.add("wallHighlight");
    }
  }

  const keyDowns = {};

  function checkValidKeyState() {
    const up = keyDowns.ArrowUp || keyDowns.w || keyDowns.W;
    const down = keyDowns.ArrowDown || keyDowns.s || keyDowns.S;
    const left = keyDowns.ArrowLeft || keyDowns.a || keyDowns.A;
    const right = keyDowns.ArrowRight || keyDowns.d || keyDowns.D;
    const space = keyDowns[" "];

    if ((up && down) || (left && right)) return false;

    if (!up && !down && !left && !right && !space) return false;
    return true;
  }

  function getPressedEvents() {
    const up = keyDowns.ArrowUp || keyDowns.w || keyDowns.W;
    const down = keyDowns.ArrowDown || keyDowns.s || keyDowns.S;
    const left = keyDowns.ArrowLeft || keyDowns.a || keyDowns.A;
    const right = keyDowns.ArrowRight || keyDowns.d || keyDowns.D;
    const space = keyDowns[" "];

    const rv = [];

    if (up && left) {
      rv.push(new GameEvent("move", "NW"));
    } else if (up && right) {
      rv.push(new GameEvent("move", "NE"));
    } else if (down && right) {
      rv.push(new GameEvent("move", "SE"));
    } else if (down && left) {
      rv.push(new GameEvent("move", "SW"));
    } else if (down) {
      rv.push(new GameEvent("move", "S"));
    } else if (up) {
      rv.push(new GameEvent("move", "N"));
    } else if (left) {
      rv.push(new GameEvent("move", "W"));
    } else if (right) {
      rv.push(new GameEvent("move", "E"));
    }

    if (space) {
      rv.push(new GameEvent("fire", "playertank"));
    }

    return rv;
  }

  function keyDownHanlder(e) {
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "M"].indexOf(
        e.code,
      ) > -1
    ) {
      e.preventDefault();
    }
    if (session.hasStarted && !session.hasEnded) {
      keyDowns[e.key] = true;
      if (!session.paused && checkValidKeyState()) {
        if (e.key !== " ") {
          session.movementQueue.empty();
        }
        const pressedEvents = getPressedEvents();
        for (let event of pressedEvents) {
          if (event.type === "move") {
            session.movementQueue.enqueue(event);
          }
        }
      }
    }
  }

  function keyUpHandler(e) {
    if (
      ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "M"].indexOf(
        e.code,
      ) > -1
    ) {
      e.preventDefault();
    }
    if (session.hasStarted && !session.hasEnded) {
      keyDowns[e.key] = false;
      if (!session.paused) {
        if (e.key !== " " && e.key !== "m") {
          session.movementQueue.empty();
        } else if (e.key === " ") {
          firePlayerLaser();
          session.firingQueue.empty();
        } else if (e.key === "m") {
          placeMine();
        }
        const pressedEvents = getPressedEvents();
        for (let event of pressedEvents) {
          if (event.type === "move" && checkValidKeyState()) {
            session.movementQueue.enqueue(event);
          } else if (event.type === "fire" && checkValidKeyState()) {
            session.firingQueue.enqueue(event);
          }
        }
      }
    }
  }

  let mineCount = 0; //semaphore

  async function placeMine() {
    if (
      !session.hasStarted ||
      session.hasEnded ||
      session.paused ||
      mineCount > 4
    )
      return;
    mineCount++;
    const cell = session.endCell;
    const cellElem = getCellElemFromCell(cell);
    cellElem.classList.add("mine");
    let count = 0;

    while (count < 8) {
      count++;
      await sleep(125);
      if (session.hasEnded) break;
      cellElem.classList.add("mineFlash");
      await sleep(125);
      if (session.hasEnded) break;
      cellElem.classList.remove("mineFlash");
    }
    if (session.hasEnded) {
      cellElem.classList.remove("mine");
      cellElem.classList.remove("mineFlash");
    } else {
      for (let n of cell.neighbors) {
        const n_cell = session.gameBoard.getCell(n.x, n.y);
        if (n_cell.start_cell) {
          document.getElementsByClassName("start")[0].classList.remove("start");
          gameOverHandler("You blew up the enemy tank!");
        } else {
          getCellElemFromCell(n_cell).classList.add("mineFlash");
        }
      }
      await sleep(125);
      for (let n of cell.neighbors) {
        const n_cell = session.gameBoard.getCell(n.x, n.y);
        getCellElemFromCell(n_cell).classList.remove("mineFlash");
      }

      cellElem.classList.remove("mine");
    }
    mineCount--;
  }

  function pausehandler() {
    if (session.hasEnded || !session.hasStarted) return;
    session.paused = !session.paused;
    if (!session.paused) {
      gameTick();
      eventLoop();
      document.getElementById("reload").classList.add("notShown");
    } else {
      session.movementQueue.empty();
      session.firingQueue.empty();
      document.getElementById("reload").classList.remove("notShown");
    }
    pauseButton.textContent = session.paused ? "Unpause" : "Pause";
  }

  const toggleControlList = () => {
    const list = document.getElementById("ctrlList");
    const btn = document.getElementById("hideBtn");
    if (list.classList.contains("hidden")) {
      list.classList.remove("hidden");
      btn.textContent = "Hide";
    } else {
      list.classList.add("hidden");
      btn.textContent = "Show";
    }
  };

  (function () {
    startButton.addEventListener("click", start);
    document.getElementById("buildGrid").addEventListener("click", buildGrid);

    pauseButton.addEventListener("click", pausehandler);
    document
      .getElementById("hideBtn")
      .addEventListener("click", toggleControlList);

    document.body.onmousedown = setLeftButtonState;
    document.body.onmousemove = setLeftButtonState;
    document.body.onmouseup = setLeftButtonState;

    document.addEventListener("keydown", keyDownHanlder);
    document.addEventListener("keyup", keyUpHandler);
    startButton.disabled = true;
    document.oncontextmenu = () => false;
    document.draggable = false;
    document.ondragstart = function () {
      return false;
    };

    document.getElementById("difficulty").addEventListener("change", () => {
      document.getElementById("difficulty").blur();
    });

    gameBoard_UI.draggable = false;
    gameBoard_UI.ondragstart = function () {
      return false;
    };
  })();
})();
