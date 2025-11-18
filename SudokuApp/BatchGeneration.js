/**************************************
 * BIS BYTES — SUDOKU GENERATOR
 * MAIN ORCHESTRATOR FILE
 * - doGet(): Serves the Input.html user interface.
 * - generateSudokuBatch(): Runs the PDF generation based on user input.
 **************************************/

const QUOTES_SPREADSHEET_URL = "https://docs.google.com/spreadsheets/by/d/1_-U00q6GmLHiSdwVh3ASMT5Mt_F5LC3-T8VO3ISDxZ8/edit?usp=sharing";
const QUOTES_SHEET_NAME = "Quotes";

/**
 * Main web app entry point.
 * This function serves the user interface (Input.html) to the browser.
 * It can also route to the 'Admin.html' page.
 */
function doGet(e) {
  let templateName = 'Input'; // Default page
  
  if (e.parameter.page && e.parameter.page === 'admin') {
    templateName = 'Admin'; // Route to admin page
  }
  
  return HtmlService.createTemplateFromFile(templateName)
    .evaluate()
    .setTitle('Sudoku Batch Generator')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

/**
 * Runs the complete Sudoku batch PDF generation (server-side).
 * This function is called from the Input.html form via google.script.run.
 *
 * @param {object} formData An object from the HTML form (e.g., {levels: ["Easy", "Hard"], quantity: "20"})
 * @returns {string} The URL of the newly created PDF file.
 */
function generateSudokuBatch(formData) {
  
  // 1. Validate User Input
  const levels = formData.levels;
  const puzzlesPerLevel = parseInt(formData.quantity, 10);

  if (!levels || levels.length === 0) {
    throw new Error("No levels selected. Please select at least one level.");
  }
  if (isNaN(puzzlesPerLevel) || puzzlesPerLevel <= 0) {
    throw new Error("Invalid quantity. Please enter a number greater than 0.");
  }
  
  const totalPuzzles = levels.length * puzzlesPerLevel;
  Logger.log(`Starting batch job: ${totalPuzzles} puzzles (${levels.join(', ')})`);

  const puzzlesByLevel = {};
  const solutionsByLevel = {};

  // 2. Generate all puzzles & solutions (Logic from Sudoku.gs)
  for (const level of levels) {
    puzzlesByLevel[level] = [];
    solutionsByLevel[level] = [];
    for (let i = 0; i < puzzlesPerLevel; i++) {
      const { puzzle, solution } = generatePuzzle(level);
      puzzlesByLevel[level].push(puzzle);
      solutionsByLevel[level].push(solution);
    }
  }

  // 3. Load Data (Quotes and Banners) (Logic from DataHelpers.gs)
  const allQuotes = getAllQuotes(QUOTES_SHEET_NAME, QUOTES_SPREADSHEET_URL); 
  
  // --- MODIFICATION: Load IDs from PropertiesService ---
  const imageIds = getLogoIds(); // Calls helper function in DataHelpers.gs
  // --- END MODIFICATION ---

  const banners = {};
  for (const level in imageIds) {
    banners[level] = getBase64Image(imageIds[level]);
  }

  // 4. Prepare data object for PDF generation
  const data = {
    puzzlesByLevel, solutionsByLevel, banners, allQuotes, levels, puzzlesPerLevel, totalPuzzles
  };

  try {
    // 5. Get the complete HTML content string (Logic from HtmlHelpers.gs)
    const htmlContent = getPdfHtml(data);
    
    // 6. Convert HTML string to a PDF Blob
    const now = new Date();
    const fileName = `Sudoku_Booklet_${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}_${now.getHours()}${now.getMinutes()}.pdf`;
    
    const htmlBlob = Utilities.newBlob(htmlContent, MimeType.HTML);
    const pdfBlob = htmlBlob.getAs(MimeType.PDF).setName(fileName);

    // 7. Save the PDF to Google Drive
    const pdfFile = DriveApp.createFile(pdfBlob);
    
    const fileUrl = pdfFile.getUrl();
    Logger.log(`✅ NEW PDF CREATED: ${fileName} | URL: ${fileUrl}`);
    
    // 8. Return the URL to the client-side success handler
    return fileUrl;

  } catch (e) {
    Logger.log(`❌ PDF Generation Failed: ${e.toString()}`);
    // Propagate the error back to the client-side failure handler
    throw new Error(`PDF Generation Failed: ${e.message}`);
  }
}