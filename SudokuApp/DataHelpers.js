/**************************************
 * DATA FETCHING AND UTILITIES
 * Contains functions for loading quotes from the spreadsheet and images from Drive.
 **************************************/

/**
 * Helper to safely load and encode image files from Google Drive into base64 format 
 * for embedding in HTML.
 */
function getBase64Image(fileId) {
  try {
    if (!fileId) return null;
    // DriveApp is enabled via appsscript.json
    const blob = DriveApp.getFileById(fileId).getBlob();
    return {
      mime: blob.getContentType(),
      base64: Utilities.base64Encode(blob.getBytes())
    };
  } catch (e) {
    // Log the error but return null so the HTML template uses the safe fallback
    Logger.log(`⚠️ Failed to load image ID ${fileId}. Check permissions/ID: ${e.toString()}`);
    return null; 
  }
}

/**
 * Fetches all quotes from the specified Google Sheet.
 */
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
    
    // Assumes quotes start on row 2 (index 1) and are in column B (index 1)
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