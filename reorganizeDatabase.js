const fs = require("fs");

// Load the existing database export
const data = require("./scan-9ee0b-default-rtdb-export.json");

// Create a new activityLog array
let activityLog = [];

// Combine checkIns and checkOuts into activityLog
const combineLogs = (log, action) => {
  Object.keys(log).forEach((key) => {
    activityLog.push({
      ...log[key],
      action,
      location: Math.random() < 0.5 ? "UCF RWC" : "UCF Library",
    });
  });
};

// Combine checkIns and checkOuts
combineLogs(data.checkIns, "Check-In");
combineLogs(data.checkOuts, "Check-Out");

// Remove underscores and "checkIn" or "checkOut" text from the timestamp
activityLog = activityLog.map((entry) => {
  const cleanedTimestamp = entry.timestamp
    .replace(/_/g, "")
    .replace(/checkIn|checkOut/g, "");
  return {
    ...entry,
    cleanedTimestamp: parseInt(cleanedTimestamp, 10),
  };
});

// Sort the activityLog by the cleaned timestamp in ascending order
activityLog.sort((a, b) => a.cleanedTimestamp - b.cleanedTimestamp);

// Convert activityLog back to an object indexed by id
const activityLogObject = {};
activityLog.forEach((entry) => {
  const newId = entry.timestamp
    .replace(/_/g, "")
    .replace(/checkIn|checkOut/g, "");
  activityLogObject[newId] = entry;
  delete activityLogObject[newId].cleanedTimestamp; // Remove the cleanedTimestamp field
  delete activityLogObject[newId].id; // Remove the id field
});

// Replace the old logs with the new activityLog
data.activityLog = activityLogObject;
delete data.checkIns;
delete data.checkOuts;

// Save the updated database export
fs.writeFileSync(
  "scan-9ee0b-default-rtdb-export-updated.json",
  JSON.stringify(data, null, 2)
);

console.log("Database reorganized and sorted successfully.");
