# Tanks – A Web-Based Tank Battle Game

Welcome to Tanks, a dynamic and action-packed tank battle game built entirely with HTML, CSS, and JavaScript. In this game, players navigate a grid-based battle arena, strategically placing tanks and walls while engaging in fast-paced combat with an enemy tank. The enemy uses clever pathfinding and laser attacks, and players must use their wits and reflexes to outmaneuver and defeat the opponent.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Installation Instructions](#installation-instructions)
3. [Usage Guide](#usage-guide)
4. [File and Structure Overview](#file-and-structure-overview)
5. [Configuration Details](#configuration-details)
6. [Contribution Guidelines](#contribution-guidelines)
7. [License Information](#license-information)

---

## Project Overview

Tanks is a browser-based game where you face off against an enemy tank on a customizable map grid. The key features include:

- **Grid-Based Game Board:** Customize map sizes ranging from small to gigantic to test your tactical prowess.
- **Enemy AI Pathfinding:** The enemy tank uses a combination of pathfinding strategies and collision detection to navigate and target your tank.
- **Interactive Controls:** Use arrow keys (or WASD) to maneuver your tank, the space bar to fire lasers, and the M key to deploy mines.
- **Intuitive UI:** On-screen controls, dropdown menus for map size and enemy speed, and visual cues that indicate game state and interactions.
- **Responsive Design:** Optimized for modern browsers with adaptive grid sizing and real-time updates.

---

## Installation Instructions

To set up and run Tanks locally, follow these steps:

1. **Clone the Repository:**

   Open your terminal and clone the repository using Git:
   ```
   git clone https://github.com/ShaneMarusczak/Tanks.git
   ```
2. **Navigate to the Project Directory:**
   ```
   cd Tanks
   ```
3. **Open the Game:**

   - You can open the game directly by launching the `index.html` file located in the `web_games/Tanks` directory.
   - Alternatively, for a better experience (especially with local file permissions), use a simple local web server. For example, using Python:
     ```
     python -m http.server 8000
     ```
     Then, open your browser and navigate to `http://localhost:8000/web_games/Tanks/index.html`.

4. **Dependencies:**

   This project is built using vanilla HTML, CSS, and JavaScript. There are no external dependencies apart from the Google Fonts API and icons specified in `index.html`.

---

## Usage Guide

Once the game is open in your browser:

1. **Setting Up the Arena:**
   - Use the dropdown menus on the game interface to select your desired **Map Size** (Small, Medium, Large, etc.) and to specify the **Enemy Tank Speed** (Slow to Insane).
   - Click the **Build Map** button to generate the game board.

2. **Placing Tanks and Walls:**
   - **Enemy Tank Placement:** Click on any cell in the grid when prompted to place the enemy tank. The cell will highlight as the enemy's starting point.
   - **Your Tank Placement:** After placing the enemy, click on a different cell to set your tank’s starting position.
   - **Wall Placement:** Once both tanks are placed, you can click and drag over cells to create walls. Right-click on an existing wall to remove it.

3. **Starting the Game:**
   - Click on the **Start** button that becomes enabled once both tanks are placed.
   - The enemy tank will begin to move toward your position using a computed path.
   - Use the arrow keys or WASD to change your tank's position along the grid.
   - Fire lasers with the **Space Bar** and deploy mines with the **M key**.

4. **In-Game Controls and Feedback:**
   - A control menu is available to view key mappings and game controls. Use the **Show/Hide** button to toggle this list.
   - The game provides real-time messages, such as alerts when you are shot or when tanks collide.
   - Use the **Pause** button to pause gameplay, and the **Reload** button to restart after a game-ending event.

---

## File and Structure Overview

Below is an overview of the key files and folders within the project:

- **index.html**  
  The main HTML file responsible for loading the game’s UI, linking CSS styles, and deferring the necessary JavaScript files.

- **css/**
  - `styles.min.css` – The minified CSS file that styles the game board, controls, and overall layout.

- **js/**
  - **Core Game Logic:**
    - `cell.js` – Contains the definition for a grid cell including properties and interaction methods.
    - `gameSession.js` – Manages the overall game session state (e.g., game start, movement queue, settings).
    - `gameBoard.js` – Defines the game board grid and methods for accessing individual cells.
    - `queue.js` – Implements a simple queue structure used to manage movement and firing events.
    - `utils.js` – Contains utility methods for DOM element manipulation, distance calculations, and helper functions.
    - `gameEvent.js` – Defines events used within the game such as movement and firing.

  - **Minified Files:**
    - The `js/min/` directory includes minified versions of the above JavaScript files (e.g., `cell.min.js`, `gameSession.min.js`, `utils.min.js`, etc.) for enhanced load performance.

  - **Alternate Implementation:**
    - `tanks.js` – An alternate or supplemental script providing additional game logic, laser firing functions, and event handling.

- **Assets:**
  - Icons (e.g., `favicon-32x32.png`, `apple-touch-icon.png`) and images (e.g., `house-icon.png`, `github-icon.png`) used for UI elements and branding.
  - `site.webmanifest` – Defines how the game appears when installed on devices as a Progressive Web App (PWA).

---

## Configuration Details

While Tanks does not rely on external configuration files like `.toml`, `.json`, or `.yaml`, there are a few settings and customizations defined across the code:

- **Game Board Dimensions:**  
  Set via the dropdown in `index.html` and adjusted dynamically within `gameBoard.js` and associated scripts.
  
- **Enemy Tank Speed:**  
  Controlled from a dropdown in the UI. This value is referenced in the game loop to adjust update intervals and firing rates.

- **UI Asset References:**  
  Icon and font URLs are defined within the `<head>` of `index.html`.

All game behavior is managed via JavaScript class configurations within files such as `GameSession`, `GameBoard`, and `Cell`.

---

## Contribution Guidelines

Contributions to Tanks are welcome! If you would like to contribute to the project:

1. Fork the repository on GitHub.
2. Create a new branch for your feature or bugfix.
3. Make your changes with clear and descriptive commits.
4. Submit a pull request with a detailed explanation of your changes.

For more information, please see [CONTRIBUTING.md](CONTRIBUTING.md) if available.

---

## License Information

This project is licensed under the terms specified in the [LICENSE](LICENSE) file. Please review the licensing details if you plan on using or modifying this project.

---

Thank you for checking out Tanks! Whether it’s for fun or as a learning tool for game development and JavaScript programming, we hope you enjoy playing, exploring, and contributing to the game.

Happy gaming!
