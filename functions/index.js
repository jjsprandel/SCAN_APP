/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// const { onRequest } = require("firebase-functions/v2/https");
// const logger = require("firebase-functions/logger");

const { onValueWritten } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
admin.initializeApp();

// Function to convert "YYYYMMDD_HHMMSS" to a JavaScript Date object
function parseTimestamp(encodedTime) {
  console.log("Parsing timestamp:", encodedTime);

  const match = encodedTime.match(
    /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})$/
  );
  if (!match) {
    console.error("Timestamp format is invalid:", encodedTime);
    return null;
  }

  const [, year, month, day, hour, minute, second] = match.map(Number);
  const parsedDate = new Date(
    Date.UTC(year, month - 1, day, hour, minute, second)
  ); // Adjust for JS Date zero-based month

  console.log("Parsed Date object:", parsedDate);
  return parsedDate;
}

// Update occupancy count, user check-in status, timestamps, and average stay duration
exports.updateOccupancy = onValueWritten(
  "/activityLog/{logId}",
  async (event) => {
    const beforeData = event.data.before?.val(); // Data before the write
    const afterData = event.data.after?.val(); // Data after the write

    console.log("Event received:", { beforeData, afterData });

    // Validate that required fields exist
    if (
      !afterData ||
      !afterData.action ||
      !afterData.userId ||
      !afterData.location ||
      !afterData.timestamp
    ) {
      console.error("Missing required fields in event data:", afterData);
      return null;
    }

    const activityType = afterData.action; // "Check-In" or "Check-Out"
    const userId = afterData.userId;
    const location = afterData.location;
    const timestampStr = afterData.timestamp; // Timestamp from activity log

    console.log("Activity Type:", activityType);
    console.log("User ID:", userId);
    console.log("Location:", location);
    console.log("Encoded Timestamp:", timestampStr);

    const timestampDate = parseTimestamp(timestampStr);

    if (!timestampDate) {
      console.error("Invalid timestamp format:", timestampStr);
      return null;
    }

    const occupancyRef = admin.database().ref(`/stats/occupancy/${location}`);
    const userCheckInStatusRef = admin
      .database()
      .ref(`/users/${userId}/checkInStatus`);
    const userLastCheckInRef = admin
      .database()
      .ref(`/users/${userId}/lastCheckIn`);
    const userLastCheckOutRef = admin
      .database()
      .ref(`/users/${userId}/lastCheckOut`);
    const numVisitsRef = admin
      .database()
      .ref(`/stats/average_stay/${location}/num_visits`);
    const totalTimeRef = admin
      .database()
      .ref(`/stats/average_stay/${location}/total_time`);

    // Get the current occupancy value for this location
    const occupancySnapshot = await occupancyRef.once("value");
    let occupancy = occupancySnapshot.val() || 0;

    console.log("Current occupancy before update:", occupancy);

    // Prepare updates
    let updates = {};

    if (activityType === "Check-In") {
      occupancy += 1;
      updates[`/users/${userId}/checkInStatus`] = "Checked In";
      updates[`/users/${userId}/lastCheckIn`] = timestampStr;
      console.log("User checked in. Updated occupancy:", occupancy);
    } else if (activityType === "Check-Out") {
      occupancy -= 1;
      updates[`/users/${userId}/checkInStatus`] = "Checked Out";
      updates[`/users/${userId}/lastCheckOut`] = timestampStr;
      console.log("User checked out. Updated occupancy:", occupancy);

      // Retrieve last check-in time
      const lastCheckInSnapshot = await userLastCheckInRef.once("value");
      const lastCheckInStr = lastCheckInSnapshot.val();
      console.log("Last Check-In Encoded Time:", lastCheckInStr);

      const lastCheckInDate = parseTimestamp(lastCheckInStr);

      if (lastCheckInDate) {
        const stayDuration = Math.round(
          (timestampDate - lastCheckInDate) / 60000
        ); // Convert to minutes

        console.log("Stay Duration in Minutes:", stayDuration);

        // Get current num_visits and total_time
        const [numVisitsSnapshot, totalTimeSnapshot] = await Promise.all([
          numVisitsRef.once("value"),
          totalTimeRef.once("value"),
        ]);

        const numVisits = numVisitsSnapshot.val() || 0;
        const totalTime = totalTimeSnapshot.val() || 0;

        console.log("Previous Num Visits:", numVisits);
        console.log("Previous Total Time:", totalTime);

        // Update visit count and total stay duration
        updates[`/stats/average_stay/${location}/num_visits`] = numVisits + 1;
        updates[`/stats/average_stay/${location}/total_time`] =
          totalTime + stayDuration;

        console.log("Updated Num Visits:", numVisits + 1);
        console.log("Updated Total Time:", totalTime + stayDuration);
      } else {
        console.warn(
          "Last check-in time is invalid or missing for user:",
          userId
        );
      }
    }

    // Update occupancy count
    updates[`/stats/occupancy/${location}`] = occupancy;

    console.log("Final updates object:", updates);

    // Perform batch update
    return admin.database().ref().update(updates);
  }
);

exports.updateHourlyHistogram = onSchedule("0 * * * *", async (event) => {
  const db = admin.database();
  const locations = ["UCF RWC", "UCF Library", "UCF Arena"]; // List of locations

  try {
    // Get the current time
    const now = new Date();
    const options = {
      timeZone: "America/New_York",
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false,
    };
    const easternTime = new Intl.DateTimeFormat("en-US", options).format(now);

    // Parse the Eastern Time date and time
    const [dayOfWeek, hour] = easternTime.split(",")[0].split(" ");
    const parsedHour = parseInt(hour, 10);

    // Get the current week number
    const weeksRef = db.ref("/stats/weeks");
    const weeksSnapshot = await weeksRef.once("value");
    let weeks = weeksSnapshot.val() || 1;

    // Check if it is Sunday at 12 AM
    if (dayOfWeek === "Sunday" && parsedHour === 0) {
      weeks += 1;
      await weeksRef.set(weeks);
      console.log("Incremented week number to:", weeks);
    }

    // Loop through each location and update the histogram
    for (const location of locations) {
      const occupancyRef = db.ref(`/stats/occupancy/${location}`);
      const histogramRef = db.ref(`/stats/histogram/${location}`);

      // Get the current occupancy
      const occupancySnapshot = await occupancyRef.once("value");
      const currentOccupancy = occupancySnapshot.val() || 0;
      console.log(`Current Occupancy for ${location}:`, currentOccupancy);

      // Update the histogram with occupancy for the current hour
      const hourRef = histogramRef.child(`${dayOfWeek}/${parsedHour}`);
      const hourSnapshot = await hourRef.once("value");
      const hourData = hourSnapshot.val() || {
        totalOccupancy: 0,
        currentStat: 0,
      };

      // Add the current occupancy to the totalOccupancy
      hourData.totalOccupancy += currentOccupancy;

      // Calculate the new currentStat as the average occupancy for that hour
      hourData.currentStat = hourData.totalOccupancy / weeks;

      // Update the histogram data for the current hour
      await hourRef.set(hourData);
      console.log(
        `Updated histogram for ${location}, ${dayOfWeek}, Hour ${parsedHour}:`,
        hourData
      );
    }
  } catch (error) {
    console.error("Error updating hourly histogram:", error);
  }
});
