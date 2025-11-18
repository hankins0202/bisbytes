/**************************************
 * HTML RENDERING HELPERS
 * Contains helper functions used by the Apps Script server-side to generate HTML 
 * strings for PDF creation.
 **************************************/

/**
 * Helper function to generate the HTML rows and cells for a Sudoku grid (table rows/data).
 * This function is used by the server-side template (PdfTemplate.html).
 * It uses a data-value attribute approach for better compatibility with server-side PDF generation.
 */
function renderGrid(grid, isSolution) {
  let rowsHtml = "";
  // Defensive check for grid structure
  if (!grid || grid.length !== 9 || !Array.isArray(grid[0]) || grid[0].length !== 9) {
    Logger.log("WARNING: Invalid grid data passed to renderGrid in HtmlHelpers.gs.");
    return '<tr><td colspan="9">Error: Invalid Grid Data</td></tr>';
  }
  
  for (let r = 0; r < 9; r++) {
    rowsHtml += "<tr>";
    for (let c = 0; c < 9; c++) {
      const v = grid[r][c];
      
      // If it's a puzzle, only display pre-filled values (v !== 0). 
      // If it's a solution, display all values.
      const displayValue = (isSolution || v !== 0) ? v.toString() : ""; 

      // CRITICAL FIX: Use data-value attribute which is read by the CSS in getPdfHtml
      // and keep the cell content empty as the CSS will render it via ::after.
      rowsHtml += `<td data-value="${displayValue}"></td>`; 
    }
    rowsHtml += "</tr>";
  }
  return rowsHtml;
}

/**
 * Constructs the entire HTML content string for the PDF document.
 * This replaces the need for a separate .html template file.
 */
function getPdfHtml(data) {
  const { puzzlesByLevel, solutionsByLevel, banners, allQuotes, levels, totalPuzzles } = data;
  let html = `
    <!doctype html>
    <html>
    <head>
    <meta charset="utf-8" />
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
        width: 100%; 
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
        font-size:12pt; 
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
        width: 100%; 
        max-width: 4in; 
        border-collapse:collapse;
        border:3px solid #111;
        margin: 0 auto;
      }
      table.sudoku td {
        width: calc(100% / 9); 
        height: 0;
        padding-bottom: calc(100% / 9); 
        text-align:center; vertical-align:middle;
        font-size:18pt; 
        font-weight:700;
        border:1px solid #111;
        box-sizing:border-box;
        position: relative;
        line-height: 0;
      }
      /* Center text inside the 1:1 cell using the data-value attribute */
      table.sudoku td::after {
        content: attr(data-value); /* CRITICAL FIX: Use data-value attribute */
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        line-height: 1;
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
        max-width: 1.3in; 
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
      
      /* Center text inside the 1:1 cell for SOLUTIONS using the data-value attribute */
      table.solution-grid td::after { 
        content: attr(data-value); /* CRITICAL FIX: Use data-value attribute */
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        line-height: 1;
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
  `;

  // ======================================
  // 1. GENERATE PUZZLE PAGES
  // ======================================
  let totalPuzzleIndex = 0;
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
      
      // Append puzzle page HTML
      html += `
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
              <!-- Call the helper function from the .gs file -->
              ${renderGrid(puzzleGrid, false)}
            </table>
          </div>
        </div>
        <div class="page-break"></div>
      `;
      totalPuzzleIndex++;
    });
  });

  // ======================================
  // 2. GENERATE SOLUTION PAGES (3x3 Layout per page)
  // ======================================
  let solutionsOnCurrentPage = 0;
  totalPuzzleIndex = 0; // Reset index for solutions

  html += '<div class="page-content solution-page-wrapper">';
  html += '<h2 class="section-title">Solutions (' + totalPuzzles + ' Puzzles)</h2>';
  html += '<div class="solution-grid-container">';

  levels.forEach((level) => {
    solutionsByLevel[level].forEach((solutionGrid) => {
      const puzzleNumber = totalPuzzleIndex + 1;
      
      // Check if a new page is needed (we'll aim for 9 solutions per page: 3x3 layout)
      if (solutionsOnCurrentPage > 0 && solutionsOnCurrentPage % 9 === 0) {
        // Close current containers and start new page
        html += '</div></div><div class="page-break"></div><div class="page-content solution-page-wrapper">';
        html += '<h2 class="section-title">Solutions (Cont.)</h2>';
        html += '<div class="solution-grid-container">';
      }

      // Append individual solution box HTML
      html += `
        <div class="solution-box">
          <p class="solution-label">Puz ${puzzleNumber} (${level})</p>
          <table class="solution-grid" role="grid" aria-label="Solution grid ${puzzleNumber}">
            <!-- Call the helper function from the .gs file, passing true for isSolution -->
            ${renderGrid(solutionGrid, true)}
          </table>
        </div>
      `;
      solutionsOnCurrentPage++;
      totalPuzzleIndex++;
    });
  });

  // Finalize the last solution page and close body/html tags
  html += '</div></div></body></html>';
  
  return html;
}