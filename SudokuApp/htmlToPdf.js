/**
 * Create a PDF of the Sudoku page (HTML->PDF) and save to Drive
 * - No body.setMargins or other invalid calls.
 * - Optional: embed a header image from Drive by putting its fileId into headerImageId.
 */
function createSudokuPdfToDrive() {
  const fileName = "Sudoku Puzzle 2 - Easy.pdf";
  const folderName = "Sudoku PDFs"; // folder will be created if missing

  // --- OPTIONAL: Put a Drive file ID here to embed the banner avatar/logo (or leave empty) ---
  const headerImageId = ""; // e.g. "1abcdEfGHijklMNopQRsT" or "" for no image

  // --- Prepare or create folder ---
  let folder;
  const fIter = DriveApp.getFoldersByName(folderName);
  folder = fIter.hasNext() ? fIter.next() : DriveApp.createFolder(folderName);

  // --- Puzzle data (0 = blank) - edit if you want different givens ---
  const puzzle = [
    [0,0,0,0,8,0,4,0,0],
    [0,1,7,3,0,0,8,5,0],
    [0,0,0,0,0,0,0,7,0],
    [0,3,0,0,0,9,0,7,0],
    [0,7,8,6,5,0,0,9,0],
    [0,5,0,4,0,0,0,6,0],
    [2,0,0,0,0,0,0,0,0],
    [4,0,3,0,7,2,8,0,0],
    [0,0,5,0,2,0,0,0,0]
  ];

  // --- Build data URL for header image if provided ---
  let headerImageDataUrl = "";
  if (headerImageId && headerImageId.length) {
    try {
      const imgBlob = DriveApp.getFileById(headerImageId).getBlob();
      headerImageDataUrl = "data:" + imgBlob.getContentType() + ";base64," + Utilities.base64Encode(imgBlob.getBytes());
    } catch (e) {
      Logger.log("Couldn't load header image by ID: " + e.toString());
      headerImageDataUrl = "";
    }
  }

  // --- Build HTML and convert to PDF ---
  const html = buildHtmlForPuzzle(puzzle, headerImageDataUrl);
  const htmlOutput = HtmlService.createHtmlOutput(html)
    .setWidth(720)   // browser width used for rendering before conversion
    .setHeight(1024); // height used for rendering

  // Convert to PDF blob
  const pdfBlob = htmlOutput.getBlob().getAs("application/pdf").setName(fileName);

  // Save to Drive
  const pdfFile = folder.createFile(pdfBlob);
  Logger.log("PDF created: " + pdfFile.getUrl());

  // Return URL (useful if you call from other scripts)
  return pdfFile.getUrl();
}

/**
 * Build the HTML for the page. Simple, self-contained.
 * Uses CSS to approximate the banner, info row, and a 9x9 Sudoku grid
 * with thicker 3x3 borders.
 */
function buildHtmlForPuzzle(puzzle, headerImageDataUrl) {
  // Build rows for the sudoku table
  let rowsHtml = "";
  for (let r = 0; r < 9; r++) {
    rowsHtml += "<tr>";
    for (let c = 0; c < 9; c++) {
      const v = puzzle[r][c];
      rowsHtml += "<td>" + (v === 0 ? "&nbsp;" : v.toString()) + "</td>";
    }
    rowsHtml += "</tr>";
  }

  // If caller provided a header image data url, use it; otherwise show a simple avatar placeholder.
  const avatarHtml = headerImageDataUrl
    ? '<div class="avatar"><img src="' + headerImageDataUrl + '" alt="logo" /></div>'
    : '<div class="avatar"><div class="face">B</div></div>';

  // Return full HTML (inline CSS)
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Sudoku PDF</title>
<style>
  /* Page sizing - may be used by some renderers */
  @page { size: 5.06in 7.81in; margin: 0.4in; }
  body { margin:0; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; }
  .container { max-width:520px; margin: 0 auto; padding: 6px; box-sizing: border-box; }

  /* Banner */
  .banner {
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:10px 12px;
    background: linear-gradient(90deg, #4b38d6 0%, #9aa0ff 60%, #dfe3ff 100%);
    color: white;
    border-radius: 4px;
  }
  .banner h1 { margin:0; font-size:18px; font-weight:500; line-height:1.05; }
  .avatar { width:56px; height:56px; display:flex; align-items:center; justify-content:center; }
  .avatar img { width:56px; height:56px; object-fit:cover; border-radius:6px; }
  .face { width:46px; height:46px; border-radius:6px; background:white; color:#e74c3c; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:20px; }

  /* Info row */
  .info-row { display:flex; gap:28px; margin:18px 0 8px; font-weight:700; font-size:18px; align-items:center; }
  .date-line { display:inline-block; border-bottom:2px solid #000; min-width:200px; padding-bottom:6px; }

  /* Sudoku grid */
  .grid-wrap { display:flex; justify-content:center; margin-top:8px; }
  table.sudoku {
    width:480px; height:480px;
    border-collapse:collapse;
    border:4px solid #111;
    margin: 0 auto;
  }
  table.sudoku td {
    width: calc(480px / 9); height: calc(480px / 9);
    text-align:center; vertical-align:middle;
    font-size:26px; font-weight:700;
    border:1px solid #111;
    box-sizing:border-box;
    padding:0;
  }

  /* Thicker separators for 3x3 blocks */
  table.sudoku td:nth-child(3),
  table.sudoku td:nth-child(6) { border-right:4px solid #111; }
  table.sudoku tr td:nth-child(4),
  table.sudoku tr td:nth-child(7) { border-left:4px solid #111; }

  table.sudoku tr:nth-child(3) td,
  table.sudoku tr:nth-child(6) td { border-bottom:4px solid #111; }
  table.sudoku tr:nth-child(4) td,
  table.sudoku tr:nth-child(7) td { border-top:4px solid #111; }

  /* Print tweaks */
  @media print {
    body { margin:0; }
    .container { padding:0.1in; }
  }
</style>
</head>
<body>
  <div class="container" role="main" aria-label="sudoku-page">
    <div class="banner" role="banner">
      <h1>You don't have to understand it to<br>accept it</h1>
      ${avatarHtml}
    </div>

    <div class="info-row" aria-hidden="true">
      <div><span>Puzzle</span> <span style="font-weight:900; margin-left:6px;">2</span></div>
      <div><span>easy</span></div>
      <div><span>Date</span> <span class="date-line"></span></div>
    </div>

    <div class="grid-wrap">
      <table class="sudoku" role="grid" aria-label="Sudoku grid">
        ${rowsHtml}
      </table>
    </div>
  </div>
</body>
</html>`;
}