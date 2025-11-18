/**************************************
 * BIS BYTES — SUDOKU GENERATOR
 * MAIN ORCHESTRATOR FILE
 * This file orchestrates the data gathering and performs server-side PDF generation.
 **************************************/

const QUOTES_SPREADSHEET_URL = "https://docs.google.com/spreadsheets/by/d/1_-U00q6GmLHiSdwVh3ASMT5Mt_F5LC3-T8VO3ISDxZ8/edit?usp=sharing";
const QUOTES_SHEET_NAME = "Quotes";

/**
 * Main function to generate the complete Sudoku batch PDF.
 * This function now loads the data, generates the HTML string using HtmlHelpers.gs,
 * and converts the string directly into a PDF file saved to Google Drive (server-side).
 * * The URL and ID of the newly created PDF are logged to the console upon success.
 */
function generateSudokuBatch() {
  const levels = ["Easy", "Medium"];
  const puzzlesPerLevel = 50; // 100 total puzzles
  const totalPuzzles = levels.length * puzzlesPerLevel;

  const puzzlesByLevel = {};
  const solutionsByLevel = {};

  // 1. Generate all puzzles & solutions (Logic from Sudoku.gs)
  // ... (existing code) ...
  for (const level of levels) {
    puzzlesByLevel[level] = [];
    solutionsByLevel[level] = [];

    for (let i = 0; i < puzzlesPerLevel; i++) {
      // Calls generatePuzzle, which is now defined in Sudoku.gs
      const { puzzle, solution } = generatePuzzle(level);
      puzzlesByLevel[level].push(puzzle);
      solutionsByLevel[level].push(solution);
    }
  }

  // 2. Load Data (Quotes and Banners) (Logic from DataHelpers.gs)
  // ... (existing code) ...
  const allQuotes = getAllQuotes(QUOTES_SHEET_NAME, QUOTES_SPREADSHEET_URL); 
  const imageIds = {
    // IMPORTANT: Ensure these Drive File IDs are correct and accessible by your script.
    Easy: "1jilJWDsOmLZQQnjqUYGLTy9wIf2a2y6i",
    Medium: "1jcCyFBmbdpoDICWlhwFf-qN6nN61kbTmBF5q",
    Hard: "1Nm8EaLX3iGqO9fkyus9wc0_ndX-Wmyo6",
    Evil: "1PMVP2iX-3QXlqB-8Mtvu55re-mqCrtWE"
  };

  const banners = {};
  for (const level in imageIds) {
    // Calls getBase64Image, which is now defined in DataHelpers.gs
    banners[level] = getBase64Image(imageIds[level]);
  }

  // 3. Prepare data object for PDF generation
  // ... (existing code) ...
  const data = {
    puzzlesByLevel, solutionsByLevel, banners, allQuotes, levels, puzzlesPerLevel, totalPuzzles
  };

  try {
    // 4. Get the complete HTML content string (Logic from HtmlHelpers.gs)
    const htmlContent = getPdfHtml(data);
    
    // 5. Convert HTML string to a PDF Blob with a timestamped file name
    const now = new Date();
    // Format: YYYY-MM-DD_HHMM
    const fileName = `Sudoku_Booklet_${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}_${now.getHours()}${now.getMinutes()}.pdf`;

    // -----------------------------------------------------------------
    // CRITICAL FIX: 
    // We must create the HTML blob, THEN call .getAs(MimeType.PDF) to *convert* it,
    // and THEN set the name on the *final PDF blob*.
    // -----------------------------------------------------------------
    const htmlBlob = Utilities.newBlob(htmlContent, MimeType.HTML);
    const pdfBlob = htmlBlob.getAs(MimeType.PDF).setName(fileName);
    // -----------------------------------------------------------------

    // 6. Save the PDF to Google Drive (Root folder for simplicity)
    const pdfFile = DriveApp.createFile(pdfBlob);
    
    // 7. Log the URL and ID to the execution log (as requested)
    // ... (existing code) ...
    Logger.log("=========================================");
    Logger.log(`✅ NEW PDF CREATED: ${pdfFile.getName()}`);
    Logger.log(`🔗 FILE URL: ${pdfFile.getUrl()}`);
    Logger.log(`🆔 FILE ID: ${pdfFile.getId()}`);
    Logger.log("=========================================");

    // 8. Return a success message to the user
    // ... (existing code) ...
    return HtmlService.createHtmlOutput(
      `<div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
        <h2 style="color: #4b38d6;">✅ PDF Generation Complete!</h2>
        <p style="font-size: 16px;">The file "<strong>${pdfFile.getName()}</strong>" (Total ${totalPuzzles} puzzles) has been saved to your Google Drive.</p>
        <p style="font-size: 14px;">The **File URL** and **ID** have been copied to the Apps Script **Execution Log**.</p>
      </div>`
    )
    .setWidth(500)
    .setHeight(200);

  } catch (e) {
    // Handle any error during PDF generation
    // ... (existing code) ...
    Logger.log(`PDF Generation Failed: ${e.toString()}`);
    return HtmlService.createHtmlOutput(
      `<div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
        <h2 style="color: red;">❌ Error During PDF Generation</h2>
        <p style="font-size: 14px;">An error occurred: ${e.message}. Check the Apps Script logs for details.</p>
      </div>`
    )
    .setWidth(500)
    .setHeight(150);
  }
}