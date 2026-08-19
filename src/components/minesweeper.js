// src/components/minesweeper.js
export function initMinesweeper() {
    const grid = document.getElementById('mines-grid');
    const status = document.getElementById('mines-status');
    const resetBtn = document.getElementById('minesweeper-reset');
    
    const rows = 10;
    const cols = 10;
    const minesCount = 15;
    
    let board = [];
    let gameOver = false;

    function createBoard() {
        grid.innerHTML = '';
        board = [];
        gameOver = false;
        status.textContent = 'Good luck!';
        status.style.color = 'var(--text-main)';

        // Initialize empty board
        for(let r=0; r<rows; r++) {
            let row = [];
            for(let c=0; c<cols; c++) {
                const cell = document.createElement('div');
                cell.className = 'mine-cell';
                cell.dataset.r = r;
                cell.dataset.c = c;
                
                cell.addEventListener('click', () => reveal(r, c));
                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    toggleFlag(r, c);
                });
                
                grid.appendChild(cell);
                row.push({
                    element: cell,
                    isMine: false,
                    revealed: false,
                    flagged: false,
                    neighborMines: 0
                });
            }
            board.push(row);
        }

        // Place mines
        let placed = 0;
        while(placed < minesCount) {
            let r = Math.floor(Math.random() * rows);
            let c = Math.floor(Math.random() * cols);
            if(!board[r][c].isMine) {
                board[r][c].isMine = true;
                placed++;
            }
        }

        // Calculate neighbors
        for(let r=0; r<rows; r++) {
            for(let c=0; c<cols; c++) {
                if(!board[r][c].isMine) {
                    let count = 0;
                    for(let dr=-1; dr<=1; dr++) {
                        for(let dc=-1; dc<=1; dc++) {
                            let nr = r + dr, nc = c + dc;
                            if(nr>=0 && nr<rows && nc>=0 && nc<cols && board[nr][nc].isMine) {
                                count++;
                            }
                        }
                    }
                    board[r][c].neighborMines = count;
                }
            }
        }
    }

    function reveal(r, c) {
        if(gameOver || board[r][c].revealed || board[r][c].flagged) return;
        
        let cellData = board[r][c];
        cellData.revealed = true;
        cellData.element.classList.add('revealed');

        if(cellData.isMine) {
            cellData.element.textContent = '💣';
            cellData.element.style.background = 'red';
            status.textContent = 'BOOM! Game Over.';
            status.style.color = 'red';
            gameOver = true;
            revealAllMines();
            return;
        }

        if(cellData.neighborMines > 0) {
            cellData.element.textContent = cellData.neighborMines;
            // Add some color coding
            const colors = ['#00ffff', '#00ff00', '#ff0000', '#ff00ff', '#ffff00', '#00ffff', '#ffffff', '#aaaaaa'];
            cellData.element.style.color = colors[cellData.neighborMines - 1];
        } else {
            // Flood fill
            for(let dr=-1; dr<=1; dr++) {
                for(let dc=-1; dc<=1; dc++) {
                    let nr = r + dr, nc = c + dc;
                    if(nr>=0 && nr<rows && nc>=0 && nc<cols) {
                        reveal(nr, nc);
                    }
                }
            }
        }
        
        checkWin();
    }

    function toggleFlag(r, c) {
        if(gameOver || board[r][c].revealed) return;
        let cellData = board[r][c];
        cellData.flagged = !cellData.flagged;
        cellData.element.textContent = cellData.flagged ? '🚩' : '';
    }

    function revealAllMines() {
        for(let r=0; r<rows; r++) {
            for(let c=0; c<cols; c++) {
                if(board[r][c].isMine) {
                    board[r][c].element.textContent = '💣';
                }
            }
        }
    }

    function checkWin() {
        let unrevealedSafe = 0;
        for(let r=0; r<rows; r++) {
            for(let c=0; c<cols; c++) {
                if(!board[r][c].isMine && !board[r][c].revealed) unrevealedSafe++;
            }
        }
        if(unrevealedSafe === 0) {
            status.textContent = 'YOU WON! 🏆';
            status.style.color = '#00ff00';
            gameOver = true;
        }
    }

    resetBtn.addEventListener('click', createBoard);
    
    // Init game
    createBoard();
}
