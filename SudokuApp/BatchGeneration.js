/**************************************
 * BIS BYTES — SUDOKU GENERATOR
 * Creates 100 puzzles (25 each level)
 * Outputs 5.06x7.81in PDF to Drive
 **************************************/

function generateSudokuBatch() {
  const levels = ["Easy", "Medium", "Hard", "Evil"];
  const puzzlesPerLevel = 25;
  const folderId = "1AmfJWRbaIORyrb1HjkEKlPXipK_aNe0v"; // 🔧 Add your Drive folder ID
  const quotesSheetName = "Quote"; // 🔧 Add your Sheet name later

  const puzzlesByLevel = {};
  const solutionsByLevel = {};

  // Generate all puzzles & solutions
  for (const level of levels) {
    puzzlesByLevel[level] = [];
    solutionsByLevel[level] = [];

    for (let i = 0; i < puzzlesPerLevel; i++) {
      const { puzzle, solution } = generatePuzzle(level);
      puzzlesByLevel[level].push(puzzle);
      solutionsByLevel[level].push(solution);
    }
  }

  // Build and save PDF
  const file = createPdf(puzzlesByLevel, solutionsByLevel, folderId, quotesSheetName);
  Logger.log("✅ PDF Saved: " + file.getUrl());
  return file.getUrl();
}

/** ==============================
 *  PUZZLE GENERATION
 *  ============================== */
function generatePuzzle(level) {
  let solution = generateSolvedGrid();

  // Copy and remove random cells based on difficulty
  let puzzle = JSON.parse(JSON.stringify(solution));
  let holes = { Easy: 35, Medium: 45, Hard: 55, Evil: 60 }[level];
  while (holes > 0) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    if (puzzle[r][c] !== 0) {
      puzzle[r][c] = 0;
      holes--;
    }
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

/** ==============================
 *  PDF CREATION
 *  ============================== */
/**
 * Corrected createPdf() — saves & reopens doc in the same variable,
 * avoids writing to a closed document, and batches saves to avoid limits.
 */
function createPdf(puzzlesByLevel, solutionsByLevel, folderId, quotesSheetName) {
  // create doc and allow reassigning it later
  let doc = DocumentApp.create("Bis Bytes Sudoku Collection");
  const docId = doc.getId();
  let body = doc.getBody();

  // Set custom size (5.06 x 7.81 inches)
  doc.setPageWidth(5.06 * 72);
  doc.setPageHeight(7.81 * 72);

  // Load quotes (safe fallback)
  const quotes = getQuotesByLevel(quotesSheetName);

  // Images object - replace these with your Drive image IDs
  const images = {
    Easy: "1jilJWDsOmLZQQnjqUYGLTy9wIf2a2y6i",     // 🔧 Replace later
    Medium: "1jcCyFBmbdpoDICWlhwFqN61LkbTmBF5q", // 🔧 Replace later
    Hard: "1Nm8EaLX3iGqO9fkyus9wc0_ndX-Wmyo6",     // 🔧 Replace later
    Evil: "1PMVP2iX-3QXlqB-8Mtvu55re-mqCrtWE" 
  };

  // Helper to safely get image blob (returns null if not found)
  function safeGetImageBlob(fileId) {
    try {
      if (!fileId || fileId.indexOf("DRIVE_ID_") === 0) return null; // placeholder left
      return DriveApp.getFileById(fileId).getBlob();
    } catch (e) {
      Logger.log("Image not found or accessible for id: " + fileId + " — " + e);
      return null;
    }
  }

  // Process puzzle pages level-by-level (save & reopen after each level)
  for (const level of Object.keys(puzzlesByLevel)) {
    const puzzles = puzzlesByLevel[level];
    const quote = quotes[level] || "";
    const imageBlob = safeGetImageBlob(images[level]);

    Logger.log("Generating pages for level: " + level);

    for (let i = 0; i < puzzles.length; i++) {
      // Add header (Puzzle number & level)
      body.appendParagraph(`Puzzle ${i + 1} — ${level}`).setBold(true).setFontSize(12);

      // Add image if available
      if (imageBlob) {
        try {
          body.appendImage(imageBlob).setWidth(250);
        } catch (e) {
          Logger.log("Failed to append image for level " + level + ": " + e);
        }
      }

      // Add the grid
      renderGrid(body, puzzles[i]);

      // Add quote centered
      body.appendParagraph(quote).setAlignment(DocumentApp.HorizontalAlignment.CENTER);

      // Page break except after last puzzle of the last level (we'll be adding solution pages later)
      body.appendPageBreak();
    }

    // Save and close the doc to flush changes and avoid "too many changes"
    doc.saveAndClose();
    Utilities.sleep(700); // give Drive a short moment

    // Reopen the doc into the same variable and refresh body
    doc = DocumentApp.openById(docId);
    body = doc.getBody();
  }

  // Now append solution sections (for each level). We'll do them in batches too.
  for (const level of Object.keys(solutionsByLevel)) {
    const solutions = solutionsByLevel[level];
    body.appendPageBreak();
    body.appendParagraph(`Solutions — ${level}`).setHeading(DocumentApp.ParagraphHeading.HEADING1);

    Logger.log("Adding solution pages for: " + level);

    // Render solutions in groups (8, 8, 9)
    const groups = [8, 8, 9];
    let idx = 0;
    for (let g = 0; g < groups.length; g++) {
      const count = groups[g];
      for (let j = 0; j < count && idx < solutions.length; j++) {
        renderGrid(body, solutions[idx]);
        idx++;
      }
      // If there are still more solutions for this level, add a page break (except after last group)
      if (g < groups.length - 1) body.appendPageBreak();
    }

    // Save & reopen again after finishing solutions for this level to stay under API limits
    doc.saveAndClose();
    Utilities.sleep(700);
    doc = DocumentApp.openById(docId);
    body = doc.getBody();
  }

  // Final save & export
  doc.saveAndClose();

  // Get blob from Drive file (use DriveApp.getFileById) to ensure up-to-date copy
  const pdfBlob = DriveApp.getFileById(docId).getAs("application/pdf").setName("Bis Bytes Sudoku.pdf");

  // Save output to specified folder (replace folderId)
  try {
    const folder = DriveApp.getFolderById(folderId);
    const outFile = folder.createFile(pdfBlob);
    Logger.log("PDF saved to: " + outFile.getUrl());
    return outFile;
  } catch (e) {
    // fallback to root folder if provided folderId is invalid
    const outFile = DriveApp.createFile(pdfBlob);
    Logger.log("FolderId invalid; saved to My Drive: " + outFile.getUrl());
    return outFile;
  }
}



/** ==============================
 *  QUOTES HANDLER
 *  ============================== */
function getQuotesByLevel(sheetName) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    const rows = sheet.getDataRange().getValues();
    const quotes = {};
    for (let i = 1; i < rows.length; i++) {
      quotes[rows[i][0]] = rows[i][1];
    }
    return quotes;
  } catch (e) {
    Logger.log("⚠️ Quote sheet not found — using blanks.");
    return { Easy: "", Medium: "", Hard: "", Evil: "" };
  }
}

/** ==============================
 *  GRID RENDERING
 *  ============================== */
function renderGrid(body, grid) {
  const table = body.appendTable();
  for (let r = 0; r < 9; r++) {
    const row = table.appendTableRow();
    for (let c = 0; c < 9; c++) {
      const text = grid[r][c] ? grid[r][c].toString() : "";
      const cell = row.appendTableCell(text);
      cell.setPaddingTop(2).setPaddingBottom(2);
      cell.setWidth(20);

      // ✅ Fix alignment for text in cell
      const paragraph = cell.getChild(0).asParagraph();
      paragraph.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    }
  }
  table.setBorderWidth(1);
}


function renderSolutions(body, solutions) {
  const perPage = [8, 8, 9];
  let index = 0;
  for (const group of perPage) {
    for (let i = 0; i < group && index < solutions.length; i++) {
      renderGrid(body, solutions[index]);
      index++;
    }
    if (index < solutions.length) body.appendPageBreak();
  }
}

