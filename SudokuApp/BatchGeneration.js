/**************************************
 * BIS BYTES — SUDOKU GENERATOR
 * V59 - FIXED: Answers not displaying in solutions grid due to missing CSS rule.
 * - Generates 100 puzzles and solutions.
 * - Ensures all numbers are rendered in the solution mini-grids.
 * - Includes a page break before the Solutions section.
 **************************************/

const QUOTES_SPREADSHEET_URL = "https://docs.google.com/spreadsheets/by/d/1_-U00q6GmLHiSdwVh3ASMT5Mt_F5LC3-T8VO3ISDxZ8/edit?usp=sharing";
const QUOTES_SHEET_NAME = "Quotes";

/**
 * Main function to generate the complete Sudoku batch PDF.
 */
function generateSudokuBatch() {
  const levels = ["Easy", "Medium", "Hard", "Evil"];
  const puzzlesPerLevel = 25; // Generates 100 puzzles total (4 levels * 25 puzzles)
  const totalPuzzles = levels.length * puzzlesPerLevel;

  const puzzlesByLevel = {};
  const solutionsByLevel = {};

  // 1. Generate all puzzles & solutions
  for (const level of levels) {
    puzzlesByLevel[level] = [];
    solutionsByLevel[level] = [];

    for (let i = 0; i < puzzlesPerLevel; i++) {
      const { puzzle, solution } = generatePuzzle(level);
      puzzlesByLevel[level].push(puzzle);
      solutionsByLevel[level].push(solution);
    }
  }

  // 2. Load Data (Quotes and Banners)
  const allQuotes = getAllQuotes(QUOTES_SHEET_NAME, QUOTES_SPREADSHEET_URL); 
  const imageIds = {
    Easy: "1jilJWDsOmLZQQnjqUYGLTy9wIf2a2y6i",
    Medium: "1jcCyFBmbdpoDICWlhwFf-qN61LkbTmBF5q",
    Hard: "1Nm8EaLX3iGqO9fkyus9wc0_ndX-Wmyo6",
    Evil: "1PMVP2iX-3QXlqB-8Mtvu55re-mqCrtWE"
  };

  const banners = {};
  for (const level in imageIds) {
    try {
      const blob = DriveApp.getFileById(imageIds[level]).getBlob();
      banners[level] = {
        mime: blob.getContentType(),
        base64: Utilities.base64Encode(blob.getBytes())
      };
    } catch (e) {
      Logger.log("Failed to load image for " + level + ": " + e);
      banners[level] = null;
    }
  }

  // 3. Prepare data object for HTML generation
  const data = {
    puzzlesByLevel, solutionsByLevel, banners, allQuotes, levels, puzzlesPerLevel, totalPuzzles
  };

  // 4. Build HTML
  const html = buildHtmlForBatch(data);
  
  // 5. Convert HTML to PDF (The confirmed working method!)
  const fileName = "Sudoku_Booklet_100_Puzzles.pdf";
  const folderName = "Sudoku PDFs";
  
  // Create HTML Output (Width/Height only influence the initial rendering size, not the PDF size, 
  // which is set by the @page CSS rule)
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(400) // Set to approx 5.06in equivalent for accurate scaling
    .setHeight(600); // Set to approx 7.81in equivalent

  // Convert to PDF blob
  const pdfBlob = htmlOutput.getBlob().getAs("application/pdf").setName(fileName);
  
  // 6. Save to Drive
  let folder;
  const fIter = DriveApp.getFoldersByName(folderName);
  folder = fIter.hasNext() ? fIter.next() : DriveApp.createFolder(folderName);
  const pdfFile = folder.createFile(pdfBlob);
  
  Logger.log("✅ Sudoku Batch PDF (100 Puzzles) created: " + pdfFile.getUrl());
  
  return `PDF successfully generated and saved to Drive in the '${folderName}' folder.`;
}


/**
 * Builds the entire multi-page HTML string for the batch PDF.
 * This includes all puzzle pages and all solution pages.
 * @param {Object} data - Contains puzzles, solutions, banners, and quotes.
 * @returns {string} The complete HTML string.
 */
function buildHtmlForBatch(data) {
  const { puzzlesByLevel, solutionsByLevel, banners, allQuotes, levels, totalPuzzles } = data;
  let allPagesHtml = '';
  let totalPuzzleIndex = 0;

  // ======================================
  // 1. GENERATE PUZZLE PAGES
  // ======================================
  levels.forEach((level) => {
    puzzlesByLevel[level].forEach((puzzleGrid) => {
      const puzzleNumber = totalPuzzleIndex + 1;
      const quoteIndex = totalPuzzleIndex % allQuotes.length;
      const currentQuote = allQuotes[quoteIndex];
      const bannerData = banners[level];
      
      // Build the banner HTML using inline base64 image data
      const avatarHtml = bannerData
        ? `<div class="avatar"><img src="data:${bannerData.mime};base64,${bannerData.base64}" alt="logo" /></div>`
        : '<div class="avatar"><div class="face">B</div></div>';

      // Build the Sudoku rows HTML
      const rowsHtml = renderGrid(puzzleGrid, false);

      // Assemble the single puzzle page HTML
      const pageHtml = `
        <div class="page-content" role="main" aria-label="sudoku-page-p${puzzleNumber}">
          <div class="banner" role="banner">
            <h1>${currentQuote}</h1>
            ${avatarHtml}
          </div>

          <div class="info-row" aria-hidden="true">
            <div class="level-box"><span>Level:</span> <span class="level-text">${level}</span></div>
            <div><span>Puzzle</span> <span class="puzzle-num">${puzzleNumber}</span></div>
            <div><span>Date</span> <span class="date-line"></span></div>
          </div>

          <div class="grid-wrap">
            <table class="sudoku" role="grid" aria-label="Sudoku grid">
              ${rowsHtml}
            </table>
          </div>
        </div>
        <div class="page-break"></div>`; // Force page break after each puzzle

      allPagesHtml += pageHtml;
      totalPuzzleIndex++;
    });
  });

  // Remove the last page-break (to prevent a blank page at the end of the puzzles section)
  allPagesHtml = allPagesHtml.replace(/<div class="page-break"><\/div>$/, '');

  // FORCE PAGE BREAK BEFORE SOLUTIONS SECTION (Fix 2: Page starting correctly)
  allPagesHtml += '<div class="page-break"></div>';


  // ======================================
  // 2. GENERATE SOLUTION PAGES (3x3 Layout per page)
  // ======================================
  let solutionPagesHtml = '';
  let solutionsOnCurrentPage = 0;
  totalPuzzleIndex = 0; // Reset index for solutions

  // Start the first solution page wrapper
  solutionPagesHtml += `
    <div class="page-content solution-page-wrapper">
      <h2 class="section-title">Solutions (${totalPuzzles} Puzzles)</h2>
      <div class="solution-grid-container">`;

  levels.forEach((level) => {
    solutionsByLevel[level].forEach((solutionGrid) => {
      const puzzleNumber = totalPuzzleIndex + 1;
      
      // Check if a new page is needed (we'll aim for 9 solutions per page: 3x3 layout)
      if (solutionsOnCurrentPage > 0 && solutionsOnCurrentPage % 9 === 0) {
        // Close current page and start a new one
        solutionPagesHtml += '</div></div><div class="page-break"></div>';
        
        solutionPagesHtml += `
          <div class="page-content solution-page-wrapper">
            <h2 class="section-title">Solutions (Cont.)</h2>
            <div class="solution-grid-container">`;
      }
      
      // Add the individual solution box
      solutionPagesHtml += `
        <div class="solution-box">
          <p class="solution-label">Puz ${puzzleNumber} (${level})</p>
          <table class="solution-grid" role="grid" aria-label="Solution grid ${puzzleNumber}">
            ${renderGrid(solutionGrid, true)}
          </table>
        </div>`;

      solutionsOnCurrentPage++;
      totalPuzzleIndex++;
    });
  });

  // Finalize the last solution page
  solutionPagesHtml += '</div></div>';
  allPagesHtml += solutionPagesHtml;


  // ======================================
  // 3. WRAP EVERYTHING IN FULL HTML TEMPLATE
  // ======================================
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Sudoku Batch PDF</title>
<style>
  /* CRITICAL: PAGE SIZING SET BY @page RULE */
  @page { 
    size: 5.06in 7.81in; /* Custom size: 5.06in wide, 7.81in tall */
    margin: 0.4in; /* Padding around the content on the physical page */
  }
  
  body { 
    margin:0; 
    font-family: Arial, Helvetica, sans-serif; 
    -webkit-print-color-adjust: exact; /* Ensures colors print accurately */
  }
  
  /* CRITICAL: Force page break after each puzzle page */
  .page-break { page-break-after: always; height: 0; }
  
  /* Container for the content, takes up the print area */
  .page-content { 
    width: 100%; /* Will scale to the printable width set by the @page rule */
    max-width: 4.26in; /* (5.06in - 2*0.4in margin) = 4.26in printable area */
    margin: 0 auto; 
    box-sizing: border-box; 
  }

  /* --- BANNER --- */
  .banner {
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:10px 12px;
    background: linear-gradient(90deg, #4b38d6 0%, #9aa0ff 60%, #dfe3ff 100%);
    color: white;
    border-radius: 4px;
    margin-bottom: 15px;
  }
  .banner h1 { 
    margin:0; 
    font-size:12pt; /* Reduced size for booklet */
    font-weight:500; 
    line-height:1.2; 
    max-width: 75%;
  }
  .avatar { width:45px; height:45px; display:flex; align-items:center; justify-content:center; }
  .avatar img { width:45px; height:45px; object-fit:cover; border-radius:4px; }
  .face { width:40px; height:40px; border-radius:4px; background:white; color:#e74c3c; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:16pt; }

  /* --- INFO ROW --- */
  .info-row { 
    display:flex; 
    justify-content: space-between;
    margin:10px 0 10px; 
    font-weight:700; 
    font-size:10pt; 
    align-items:center; 
    color: #444;
  }
  .level-text { color: #4b38d6; margin-left: 5px;}
  .puzzle-num { font-weight:900; margin-left:6px; }
  .date-line { display:inline-block; border-bottom:1px solid #000; min-width:40%; padding-bottom:3px; }

  /* --- SUDOKU GRID (Puzzle) --- */
  .grid-wrap { display:flex; justify-content:center; margin-top:10px; }
  table.sudoku {
    width: 100%; /* Will scale to fit 4.26in width */
    max-width: 4in; /* Recommended max width for the grid */
    border-collapse:collapse;
    border:3px solid #111;
    margin: 0 auto;
  }
  table.sudoku td {
    width: calc(100% / 9); 
    height: 0;
    padding-bottom: calc(100% / 9); /* Aspect ratio 1:1 */
    text-align:center; vertical-align:middle;
    font-size:18pt; 
    font-weight:700;
    border:1px solid #111;
    box-sizing:border-box;
    position: relative;
    line-height: 0;
  }
  /* Center text inside the 1:1 cell */
  table.sudoku td::after {
    content: attr(data-value);
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    line-height: 1;
    content: var(--cell-content); /* Use CSS variable to hold content */
  }

  /* Thicker separators for 3x3 blocks */
  table.sudoku tr:nth-child(3) td,
  table.sudoku tr:nth-child(6) td { border-bottom:3px solid #111; }
  table.sudoku tr:nth-child(4) td,
  table.sudoku tr:nth-child(7) td { border-top:3px solid #111; }
  table.sudoku td:nth-child(3),
  table.sudoku td:nth-child(6) { border-right:3px solid #111; }
  table.sudoku tr td:nth-child(4),
  table.sudoku tr td:nth-child(7) { border-left:3px solid #111; }
  
  /* --- SOLUTIONS PAGE --- */
  .section-title {
    font-size: 14pt;
    color: #4b38d6;
    margin-bottom: 15px;
    text-align: center;
  }
  .solution-grid-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 10px 0;
  }
  .solution-box {
    width: 31%; /* 3 columns */
    box-sizing: border-box;
    text-align: center;
  }
  .solution-label {
    font-size: 8pt;
    font-weight: bold;
    margin: 0 0 5px 0;
  }
  
  /* Solution Grid Styling */
  table.solution-grid {
    width: 100%;
    max-width: 1.3in; /* Appropriate size for a 3-column layout */
    border-collapse: collapse;
    border: 2px solid #333;
    margin: 0 auto;
    font-size: 7pt;
  }
  table.solution-grid td {
    width: calc(100% / 9); 
    height: 0;
    padding-bottom: calc(100% / 9);
    text-align:center; vertical-align:middle;
    font-weight: 500;
    border: 1px solid #ccc;
    box-sizing: border-box;
    position: relative;
    line-height: 0;
  }
  
  /* CRITICAL FIX: Center text inside the 1:1 cell for SOLUTIONS */
  table.solution-grid td::after { 
    content: attr(data-value);
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    line-height: 1;
    content: var(--cell-content); /* Use CSS variable to hold content */
  }

  /* Thicker separators for 3x3 blocks in solution grid */
  table.solution-grid tr:nth-child(3) td,
  table.solution-grid tr:nth-child(6) td { border-bottom:2px solid #333; }
  table.solution-grid tr:nth-child(4) td,
  table.solution-grid tr:nth-child(7) td { border-top:2px solid #333; }
  table.solution-grid td:nth-child(3),
  table.solution-grid td:nth-child(6) { border-right:2px solid #333; }
  table.solution-grid tr td:nth-child(4),
  table.solution-grid tr td:nth-child(7) { border-left:2px solid #333; }
</style>
</head>
<body>
${allPagesHtml}
</body>
</html>`;
}

/**
 * Helper function to generate the HTML rows for a Sudoku grid.
 * @param {Array<Array<number>>} grid - The 9x9 Sudoku grid array.
 * @param {boolean} isSolution - If true, ensures all non-zero values are displayed.
 * @returns {string} HTML string of table rows.
 */
function renderGrid(grid, isSolution) {
  let rowsHtml = "";
  for (let r = 0; r < 9; r++) {
    rowsHtml += "<tr>";
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c];
      
      // Only display empty string if it's a puzzle and the value is 0.
      // If it's a solution (isSolution=true) or the value is > 0 (a clue), display the value.
      const displayValue = (isSolution || v !== 0) ? v.toString() : ""; 

      // Using a CSS variable and ::after pseudo-element to center the text
      // correctly inside 1:1 aspect ratio cells
      rowsHtml += `<td style="--cell-content:'${displayValue}';"></td>`; 
    }
    rowsHtml += "</tr>";
  }
  return rowsHtml;
}


/** ==============================
 * Standard Sudoku and Quote Helpers 
 * ============================== */

function getAllQuotes(sheetName, spreadsheetUrl) { 
  try {
    const spreadsheet = SpreadsheetApp.openByUrl(spreadsheetUrl);
    const sheet = spreadsheet.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log(`⚠️ ERROR: Quote sheet named "${sheetName}" not found. Using default quotes.`);
      throw new Error("Sheet not found.");
    }
    
    const rows = sheet.getDataRange().getValues();
    const quotes = [];
    
    for (let i = 1; i < rows.length; i++) {
      const quoteText = rows[i][1]?.toString().trim(); 
      if (quoteText) {
          quotes.push(quoteText); 
      }
    }
    
    if (quotes.length === 0) {
        Logger.log("⚠️ WARNING: Quote sheet is empty or contains no valid data rows. Using default quotes.");
        throw new Error("No quotes found in sheet.");
    }

    Logger.log(`✅ Successfully loaded ${quotes.length} quotes from sheet "${sheetName}".`);
    return quotes;

  } catch (e) {
    // Return hardcoded defaults on any failure
    return [ 
      "You don't have to understand it to accept it", 
      "Every moment is a fresh beginning",
      "The struggle you're in today is developing the strength you need for tomorrow", 
      "Failure is not the opposite of success, it’s part of it" 
    ];
  }
}

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

function generateSolvedGrid() {
  const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
  
  function isValid(num, row, col) {
    for (let i = 0; i < 9; i++) {
      if (grid[row][i] === num || grid[i][col] === num) return false;
    }
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
    if (cell === 81) return true; 
    const row = Math.floor(cell / 9);
    const col = cell % 9;
    if (grid[row][col] !== 0) return solve(cell + 1);
    
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
    for (const num of nums) {
      if (isValid(num, row, col)) {
        grid[row][col] = num;
        if (solve(cell + 1)) return true;
        grid[row][col] = 0;
      }
    }
    return false;
  }
  
  solve();
  return grid;
}