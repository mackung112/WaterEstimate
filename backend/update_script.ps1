$path = ".\server_script.js"
if (-not (Test-Path $path)) {
    Write-Error "File not found at $path"
    exit 1
}

$content = Get-Content $path -Raw
$search = 'case "deletePersonnel": result = deleteMasterData(ss, SHEET_NAMES.PERSONNEL, body.id, "Personnel_ID"); break;'
$replace = 'case "deletePersonnel": result = deleteMasterData(ss, SHEET_NAMES.PERSONNEL, body.id, "Personnel_ID"); break;' + "`r`n" + '      case "uploadFile": result = uploadFileToDrive(body); break;'

if ($content -notmatch "case ""uploadFile""") {
    $content = $content.Replace($search, $replace)
}

$functionCode = '
/**
 * UPLOAD FILE TO DRIVE (Direct Action)
 */
function uploadFileToDrive(data) {
  try {
    const FOLDER_ID = "1THYBh5kStI7pQnlS4WYBBkmuo-jZMbfo"; 
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    // Check if data.fileData exists
    if (!data.fileData || data.fileData.indexOf("data:") !== 0) {
      throw new Error("Invalid file data format");
    }

    const parts = data.fileData.split(",");
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    const base64Content = parts[1];

    const blob = Utilities.newBlob(Utilities.base64Decode(base64Content), mimeType, data.fileName || "upload.jpg");
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return { 
      status: "success", 
      url: "https://drive.google.com/uc?export=view&id=" + file.getId() 
    };
  } catch (e) {
    return { status: "error", message: "Upload failed: " + e.toString() };
  }
}
'

if ($content -notmatch "function uploadFileToDrive") {
    $content = $content + "`r`n" + $functionCode
}

# Use Set-Content with UTF8 encoding (without BOM if possible, but default UTF8 is fine for Apps Script usually)
Set-Content -Path $path -Value $content -Encoding UTF8
Write-Output "Update complete"
