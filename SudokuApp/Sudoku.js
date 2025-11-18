/**************************************
 * SUDOKU GENERATION LOGIC
 * Contains all functions related to generating the Sudoku grids.
 **************************************/

/**
 * Generates a Sudoku puzzle and its solution based on the difficulty level.
 */
function generatePuzzle(level) {
  let solution = generateSolvedGrid();
  let puzzle = JSON.parse(JSON.stringify(solution));
  let holes = { Easy: 35, Medium: 45, Hard: 55, Evil: 60 }[level];
  
  while (holes > 0) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      holes--;
    }
    // Safety break to prevent infinite loops if generation fails
    if (holes < 0) break;
  }
  return { puzzle, solution };
}

/**
 * Generates a complete, valid Sudoku solution grid using backtracking.
 */
function generateSolvedGrid() {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  
  function isValid(num, row, col) {
    // Check row and column
    for (let i = 0; i < 9; i++) {
      if (grid[row][i] === num || grid[i][col] === num) return false;
    }
    // Check 3x3 box
    const boxRow = Math.floor(row / 3) * 3;
    const boxCol = Math.floor(col / 3) * 3;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (grid[boxRow + r][boxCol + c] === num) return false;
      }
    }
    return true;
  }
  
  function solve(cell = 0) {
    if (cell === 81) return true; // Base case: grid is solved
    const row = Math.floor(cell / 9);
    const col = cell % 9;
    
    if (grid[row][col] !== 0) return solve(cell + 1); // Skip pre-filled cells
    
    // Try numbers 1-9 in random order
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    for (const num of nums) {
      if (isValid(num, row, col)) {
        grid[row][col] = num;
        if (solve(cell + 1)) return true; // Recurse
        grid[row][col] = 0; // Backtrack
      }
    }
    return false; // No number works
  }
  
  solve();
  return grid;
}