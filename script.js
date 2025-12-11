document.addEventListener('DOMContentLoaded', () => {
    const GRID_SIZE = 10;
    const NUM_MINES = 10;
    const MAX_LEADERBOARD_ENTRIES = 5;
    const SCORES_STORAGE_KEY = 'minesweeperScoresV2';

    const gameBoard = document.getElementById('game-board');
    const minesCountSpan = document.getElementById('mines-count');
    const timerSpan = document.getElementById('timer');
    const resetButton = document.getElementById('reset-button');
    const leaderboardList = document.getElementById('leaderboard');

    let board = [];
    let scores = [];
    let minesLeft = NUM_MINES;
    let timeLeft = 0;
    let timerInterval;
    let gameOver = false;
    let firstClick = true;

    function updateLeaderboardUI() {
        leaderboardList.innerHTML = '';
        const topScores = scores.slice(0, MAX_LEADERBOARD_ENTRIES);
        for (const score of topScores) {
            const li = document.createElement('li');
            li.textContent = `${score.name}: ${score.tiles} tiles`;
            leaderboardList.appendChild(li);
        }
    }

    function loadScores() {
        const savedScores = localStorage.getItem(SCORES_STORAGE_KEY);
        if (savedScores) {
            scores = JSON.parse(savedScores);
        }
        updateLeaderboardUI();
    }

    function saveScore(tilesRevealed) {
        const lowestScore = scores.length > 0 ? scores[scores.length - 1].tiles : -1;

        if (scores.length < MAX_LEADERBOARD_ENTRIES || tilesRevealed > lowestScore) {
            let playerName;
            let nameIsValid = false;

            while (!nameIsValid) {
                playerName = prompt("You made the leaderboard! Enter your name (max 5 chars):");

                if (!playerName) { // User cancelled the prompt
                    nameIsValid = true; 
                    continue;
                }
                
                const formattedName = playerName.trim().substring(0, 5).toUpperCase();

                if (scores.some(score => score.name === formattedName)) {
                    alert(`The name "${formattedName}" is already taken. Please choose another.`);
                } else {
                    playerName = formattedName;
                    nameIsValid = true;
                }
            }
            
            if (!playerName) {
                playerName = "GUEST";
            }

            scores.push({ name: playerName, tiles: tilesRevealed });
            scores.sort((a, b) => b.tiles - a.tiles);
            scores = scores.slice(0, MAX_LEADERBOARD_ENTRIES);
            localStorage.setItem(SCORES_STORAGE_KEY, JSON.stringify(scores));
            updateLeaderboardUI();
        }
    }
    
    function countRevealedTiles() {
        let revealedCount = 0;
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if(board[r][c].isRevealed) {
                    revealedCount++;
                }
            }
        }
        return revealedCount;
    }

    function initGame() {
        gameOver = false;
        firstClick = true;
        minesLeft = NUM_MINES;
        timeLeft = 0;
        if (timerInterval) {
            clearInterval(timerInterval);
        }

        gameBoard.innerHTML = '';
        gameBoard.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 1fr)`;
        minesCountSpan.textContent = minesLeft;
        timerSpan.textContent = timeLeft;
        
        board = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null).map(() => ({
            isMine: false,
            isRevealed: false,
            isFlagged: false,
            adjacentMines: 0
        })));

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.row = r;
                cell.dataset.col = c;
                cell.addEventListener('click', handleCellClick);
                cell.addEventListener('contextmenu', handleCellRightClick);
                gameBoard.appendChild(cell);
            }
        }
    }

    function startTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
        }
        timerInterval = setInterval(() => {
            timeLeft++;
            timerSpan.textContent = timeLeft;
        }, 1000);
    }
    
    function placeMines(startRow, startCol) {
        let minesPlaced = 0;
        while (minesPlaced < NUM_MINES) {
            const r = Math.floor(Math.random() * GRID_SIZE);
            const c = Math.floor(Math.random() * GRID_SIZE);

            if ((r === startRow && c === startCol) || board[r][c].isMine) {
                continue;
            }

            board[r][c].isMine = true;
            minesPlaced++;
        }
    }

    function calculateAdjacentMines() {
        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (board[r][c].isMine) continue;

                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const nr = r + dr;
                        const nc = c + dc;

                        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && board[nr][nc].isMine) {
                            count++;
                        }
                    }
                }
                board[r][c].adjacentMines = count;
            }
        }
    }

    function handleCellClick(event) {
        if (gameOver) return;

        const cellElement = event.target;
        const row = parseInt(cellElement.dataset.row);
        const col = parseInt(cellElement.dataset.col);
        const cellData = board[row][col];

        if (cellData.isFlagged || cellData.isRevealed) {
            return;
        }

        if (firstClick) {
            placeMines(row, col);
            calculateAdjacentMines();
            startTimer();
            firstClick = false;
        }

        if (cellData.isMine) {
            endGame(false);
            return;
        }
        
        revealCell(row, col);
        checkWinCondition();
    }
    
    function handleCellRightClick(event) {
        event.preventDefault();
        if (gameOver) return;

        const cellElement = event.target.closest('.cell');
        const row = parseInt(cellElement.dataset.row);
        const col = parseInt(cellElement.dataset.col);
        const cellData = board[row][col];
        
        if (cellData.isRevealed) return;

        cellData.isFlagged = !cellData.isFlagged;
        
        if(cellData.isFlagged) {
            minesLeft--;
            cellElement.innerHTML = '<span class="flag-icon">🚩</span>';
        } else {
            minesLeft++;
            cellElement.innerHTML = '';
        }
        minesCountSpan.textContent = minesLeft;
    }

    function revealCell(r, c) {
        if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return;
        
        const cellData = board[r][c];
        const cellElement = document.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);

        if (cellData.isRevealed || cellData.isFlagged) return;

        cellData.isRevealed = true;
        cellElement.classList.add('revealed');

        if (cellData.adjacentMines > 0) {
            cellElement.textContent = cellData.adjacentMines;
            cellElement.dataset.adjacentMines = cellData.adjacentMines;
        } else {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    revealCell(r + dr, c + dc);
                }
            }
        }
    }

    function checkWinCondition() {
        const revealedCount = countRevealedTiles();
        if (revealedCount === GRID_SIZE * GRID_SIZE - NUM_MINES) {
            endGame(true);
        }
    }

    function endGame(isWin) {
        gameOver = true;
        clearInterval(timerInterval);

        if (!isWin) {
            const tilesRevealed = countRevealedTiles();
            // This needs to be delayed until after the board is shown
            // but before the game resets.
            setTimeout(() => saveScore(tilesRevealed), 100);
        }

        for (let r = 0; r < GRID_SIZE; r++) {
            for (let c = 0; c < GRID_SIZE; c++) {
                if (board[r][c].isMine) {
                    const cellElement = document.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
                    cellElement.classList.add('mine');
                    cellElement.innerHTML = '<span class="mine-icon">💣</span>';
                }
            }
        }
        
        setTimeout(() => {
           if (isWin) {
                alert('You win!');
                initGame();
            } else {
                initGame();
            }
        }, 2000);
    }

    resetButton.addEventListener('click', initGame);

    // Initial setup
    loadScores();
    initGame();
});