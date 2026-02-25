// ==========================================
// 1. CONFIGURATION
// ==========================================
const SPREADSHEET_ID = "1SJGq7ocF4lVFwPGTkgpE0i-Wqxwe7163DruVvz6aWS0";

// Folder ID for GIS Images (User Specified)
const DRIVE_FOLDER_ID = "1THYBh5kStI7pQnlS4WYBBkmuo-jZMbfo";

const SHEET_NAMES = {
  JOBS: "JOBS",
  ITEMS: "JOB_ITEMS",
  PERSONNEL: "MASTER_PERSONNEL",
  MATERIALS: "MASTER_MATERIALS"
};

// ==========================================
// 2. ROUTER
// ==========================================

function doGet(e) { return handleRequest(e); }
function doPost(e) { return handleRequest(e); }

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return createResponse({ status: "error", message: "Server is busy, please try again." });
  }

  try {
    const action = e.parameter.action;
    const bodyString = e.postData ? e.postData.contents : "{}";
    const body = JSON.parse(bodyString);

    let result = {};
    const ss = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();

    switch (action) {
      case "getData": result = getAllData(ss, body.limit); break;
      case "saveJob": result = saveJobData(ss, body); break;
      case "deleteJob": result = deleteJobData(ss, body.jobId); break;
      case "updatePrintStatus": result = updatePrintStatus(ss, body.jobId, body.isPrinted); break;

      case "saveMaterial": result = saveMasterData(ss, SHEET_NAMES.MATERIALS, body, "Material_ID", "materialId"); break;
      case "deleteMaterial": result = deleteMasterData(ss, SHEET_NAMES.MATERIALS, body.id, "Material_ID"); break;

      case "savePersonnel": result = saveMasterData(ss, SHEET_NAMES.PERSONNEL, body, "Personnel_ID", "personnelId"); break;
      case "deletePersonnel": result = deleteMasterData(ss, SHEET_NAMES.PERSONNEL, body.id, "Personnel_ID"); break;

      case "uploadFile": result = uploadFileToDrive(body); break;

      default:
        result = { status: "error", message: "Unknown action: " + action };
    }

    return createResponse(result);

  } catch (error) {
    return createResponse({ status: "error", message: error.toString(), stack: error.stack });
  } finally {
    lock.releaseLock();
  }
}

function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ==========================================
// 3. LOGIC FUNCTIONS
// ==========================================

const HEADER_MAP = {
  "Timestamp": "timestamp",
  "Job_ID": "jobId",
  "Request_No": "requestNo",
  "Request_Date": "requestDate",
  "Estimate_No": "estimateNo",
  "Customer_Name": "customerName",
  "House_No": "houseNo",
  "Moo": "moo",
  "Tambon": "tambon",
  "Amphoe": "amphoe",
  "Province": "province",
  "Meter_Size": "meterSize",
  "Status": "status",
  "User_Number": "userNumber",
  "Map_URL": "mapUrl",
  "Image_URL": "imageUrl",
  "Gis_Image_URL": "gisImageUrl",
  "Surveyor_Name": "surveyorName", "Surveyor_Pos": "surveyorPos",
  "Inspector_Name": "inspectorName", "Inspector_Pos": "inspectorPos",
  "Approver_Name": "approverName", "Approver_Pos": "approverPos",
  "Print_Date": "printDate",
  "Transaction_ID": "transactionId",
  "Section": "section",
  "Material_ID": "materialId",
  "Item_Name": "itemName",
  "Quantity": "quantity",
  "Unit": "unit",
  "Unit_Price_Mat": "unitPriceMaterial",
  "Unit_Price_Labor": "unitPriceLabor",
  "Total_Price": "totalPrice",
  "Price_Material": "unitPriceMaterial",
  "Price_Labor": "unitPriceLabor",
  "Category": "category",
  "Size": "size",
  "Personnel_ID": "personnelId",
  "Name": "name",
  "Role_Type": "roleType",
  "Position": "position",
  "Signature_URL": "signatureUrl"
};

function getAllData(ss, limit) {
  const materials = readSheetToJSON(ss, SHEET_NAMES.MATERIALS, 0);
  const personnel = readSheetToJSON(ss, SHEET_NAMES.PERSONNEL, 0);
  const rawJobs = readSheetToJSON(ss, SHEET_NAMES.JOBS, limit || 0);
  const rawItems = readSheetToJSON(ss, SHEET_NAMES.ITEMS, 0);

  const itemsMap = {};
  rawItems.forEach(item => {
    const jId = String(item.jobId);
    if (!itemsMap[jId]) itemsMap[jId] = [];
    itemsMap[jId].push(item);
  });

  const jobs = rawJobs.map(job => {
    job.items = itemsMap[String(job.jobId)] || [];
    return job;
  });

  return { status: "success", materials, personnel, jobs };
}

function saveJobData(ss, data) {
  const jobSheet = ss.getSheetByName(SHEET_NAMES.JOBS);
  const itemSheet = ss.getSheetByName(SHEET_NAMES.ITEMS);
  // 1. Save Job Info
  var jobHeaders = jobSheet.getDataRange().getValues()[0];

  // [AUTO-MIGRATE] Check if "Gis_Image_URL" column exists, if not, add it
  if (jobHeaders.indexOf("Gis_Image_URL") === -1) {
    const lastCol = jobSheet.getLastColumn();
    jobSheet.getRange(1, lastCol + 1).setValue("Gis_Image_URL");
    // Reload headers after adding
    jobHeaders = jobSheet.getDataRange().getValues()[0];
  }

  processBase64Images(data, ss);


  const jobRowData = mapJsonToRow(data, jobHeaders);
  const jobIds = jobSheet.getRange(2, 1, jobSheet.getLastRow() - 1 || 1, 1).getValues().flat();
  const existingIndex = jobIds.map(String).indexOf(String(data.jobId));

  if (existingIndex !== -1) {
    jobSheet.getRange(existingIndex + 2, 1, 1, jobRowData.length).setValues([jobRowData]);
  } else {
    jobSheet.appendRow(jobRowData);
  }

  const itemHeaders = itemSheet.getDataRange().getValues()[0];
  const jobIdColIndex = itemHeaders.indexOf("Job_ID");
  deleteRowByValue(itemSheet, jobIdColIndex, data.jobId);

  if (data.items && data.items.length > 0) {
    const newRows = data.items.map((item, idx) => {
      item.jobId = data.jobId;
      if (!item.transactionId) item.transactionId = `${data.jobId}-${idx + 1}`;
      return mapJsonToRow(item, itemHeaders);
    });
    if (newRows.length > 0) {
      itemSheet.getRange(itemSheet.getLastRow() + 1, 1, newRows.length, newRows[0].length).setValues(newRows);
    }
  }

  return { status: "success", message: "Job saved successfully" };
}

function saveMasterData(ss, sheetName, data, dbIdKey, jsIdKey) {
  const sheet = ss.getSheetByName(sheetName);
  const headers = sheet.getDataRange().getValues()[0];
  const rowData = mapJsonToRow(data, headers);
  const idValue = data[jsIdKey];
  const allData = sheet.getDataRange().getValues();
  const idColIndex = headers.indexOf(dbIdKey);

  let rowIndex = -1;
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][idColIndex]) === String(idValue)) { rowIndex = i + 1; break; }
  }

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  return { status: "success", message: `Saved to ${sheetName}` };
}

function deleteJobData(ss, jobId) {
  const jobSheet = ss.getSheetByName(SHEET_NAMES.JOBS);
  const itemSheet = ss.getSheetByName(SHEET_NAMES.ITEMS);
  deleteRowByValue(jobSheet, 0, jobId);
  deleteRowByValue(itemSheet, 0, jobId);
  return { status: "success", message: "Job deleted" };
}

function deleteMasterData(ss, sheetName, id, dbIdKey) {
  const sheet = ss.getSheetByName(sheetName);
  const headers = sheet.getDataRange().getValues()[0];
  const deleted = deleteRowByValue(sheet, headers.indexOf(dbIdKey), id);
  return deleted ? { status: "success" } : { status: "error", message: "ID not found" };
}

function updatePrintStatus(ss, jobId, isPrinted) {
  const sheet = ss.getSheetByName(SHEET_NAMES.JOBS);
  const headers = sheet.getDataRange().getValues()[0];
  const printDateIndex = headers.indexOf("Print_Date");
  const jobIdIndex = headers.indexOf("Job_ID");
  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (String(allData[i][jobIdIndex]) === String(jobId)) {
      sheet.getRange(i + 1, printDateIndex + 1).setValue(isPrinted ? new Date() : "");
      return { status: "success", message: "Update Success" };
    }
  }
  return { status: "error", message: "Job not found" };
}

// --- IMAGES ---

function processBase64Images(data, ss) { }

/**
 * UPLOAD FILE TO DRIVE (Direct Action)
 * Returns Google Drive Viewer Link
 */
function uploadFileToDrive(data) {
  try {
    const FOLDER_ID = "1THYBh5kStI7pQnlS4WYBBkmuo-jZMbfo";
    // [FIX] Get Folder Object but create file in Root first
    const folder = DriveApp.getFolderById(FOLDER_ID);

    if (!data.fileData || data.fileData.indexOf("data:") !== 0) {
      throw new Error("Invalid file data format");
    }

    // Extract Base64
    const parts = data.fileData.split(",");
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    const base64Content = parts[1];

    // Decode and Create Blob
    const blob = Utilities.newBlob(Utilities.base64Decode(base64Content), mimeType, data.fileName || "upload.jpg");

    // [FIX] WORKAROUND: Create in Root first, then Move
    // This bypasses 'upload directly to shared folder' restriction for some account types
    const file = DriveApp.createFile(blob);
    file.moveTo(folder);

    // Set Permission (Force Viewable)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      status: "success",
      url: "https://drive.google.com/uc?export=view&id=" + file.getId()
    };
  } catch (e) {
    return { status: "error", message: "Upload failed: " + e.toString() };
  }
}

// --- HELPERS ---

function readSheetToJSON(ss, sheetName, limit) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  let dataRaw = [];
  if (limit > 0 && lastRow - 1 > limit) {
    const startRow = lastRow - limit + 1;
    dataRaw = sheet.getRange(startRow, 1, limit, sheet.getLastColumn()).getValues();
  } else {
    dataRaw = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  }
  return dataRaw.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      const key = HEADER_MAP[h] || h;
      let val = row[i];
      if (val instanceof Date) val = val.toISOString();
      obj[key] = val;
    });
    return obj;
  });
}

function mapJsonToRow(jsonData, headers) {
  return headers.map(h => {
    const key = HEADER_MAP[h];
    let val = jsonData[key];
    if (val === undefined) val = jsonData[h];
    if (val === undefined) val = "";
    if (h === "Timestamp" && !val) val = new Date();
    return val;
  });
}

function deleteRowByValue(sheet, colIndex, value) {
  if (colIndex === -1) return false;
  const data = sheet.getDataRange().getValues();
  let deleted = false;
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][colIndex]) === String(value)) {
      sheet.deleteRow(i + 1);
      deleted = true;
    }
  }
  return deleted;
}

/**
 * [CRITICAL] EXPLICIT AUTH HELPER
 * Run this to grant permissions. 
 */
function explicitAuth() {
  const folder = DriveApp.getRootFolder();
  folder.createFile("temp_auth_test.txt", "Auth Test"); // Force Drive Scope
  DriveApp.getFolderById(DRIVE_FOLDER_ID); // Check access
  SpreadsheetApp.getActiveSpreadsheet();
}
