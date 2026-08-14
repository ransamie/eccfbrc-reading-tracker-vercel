import { getDatabase } from "./googleSheets";

// Helper to get or create a worksheet if it doesn't exist
async function getSheetByTitle(title, headers = []) {
  const db = await getDatabase();
  let sheet = db.sheetsByTitle[title];
  if (!sheet) {
    // Attempt to create sheet programmatically if missing
    sheet = await db.addSheet({ title, headerValues: headers });
  }
  return sheet;
}

export async function getQuizSettings() {
  const sheet = await getSheetByTitle("Quiz_Settings", ["Setting_Key", "Setting_Value"]);
  const rows = await sheet.getRows();
  const settings = {
    Active_Round: "Round 1",
    Time_Limit_Minutes: "15",
    Is_Quiz_Live: "FALSE"
  };
  rows.forEach((row) => {
    const key = row.get("Setting_Key");
    const val = row.get("Setting_Value");
    if (key) {
      settings[key] = val;
    }
  });
  return settings;
}

export async function updateQuizSettings(key, value) {
  const sheet = await getSheetByTitle("Quiz_Settings", ["Setting_Key", "Setting_Value"]);
  const rows = await sheet.getRows();
  const existingRow = rows.find((row) => row.get("Setting_Key") === key);
  
  if (existingRow) {
    existingRow.set("Setting_Value", String(value));
    await existingRow.save();
  } else {
    await sheet.addRow({ Setting_Key: key, Setting_Value: String(value) });
  }
}

export async function getQuestionsForRound(round) {
  const sheet = await getSheetByTitle("Quiz_Questions", [
    "ID",
    "Round",
    "Question",
    "Option_1",
    "Option_2",
    "Option_3",
    "Option_4",
    "Correct_Answer"
  ]);
  const rows = await sheet.getRows();
  return rows
    .filter((row) => String(row.get("Round")).trim() === String(round).trim())
    .map((row, index) => ({
      id: row.get("ID") || `q_${index}`, // Allow fallback to index if ID column isn't there
      round: row.get("Round"),
      question: row.get("Question"),
      options: [
        row.get("Option_1"),
        row.get("Option_2"),
        row.get("Option_3"),
        row.get("Option_4")
      ].filter(Boolean),
      correctAnswer: row.get("Correct_Answer")
    }));
}

export async function checkExistingResult(whatsAppNumber, round) {
  const sheet = await getSheetByTitle("Quiz_Results", [
    "Full_Name",
    "WhatsApp_Number",
    "Round",
    "Score",
    "Total_Questions",
    "Timestamp",
    "Details"
  ]);
  const rows = await sheet.getRows();
  const match = rows.find(
    (row) =>
      String(row.get("WhatsApp_Number")).trim() === String(whatsAppNumber).trim() &&
      String(row.get("Round")).trim() === String(round).trim()
  );
  return !!match;
}

export async function getSession(whatsAppNumber, round) {
  const sheet = await getSheetByTitle("Quiz_Sessions", [
    "WhatsApp_Number",
    "Round",
    "Start_Timestamp",
    "Absolute_Deadline"
  ]);
  const rows = await sheet.getRows();
  const existingRow = rows.find(
    (row) =>
      String(row.get("WhatsApp_Number")).trim() === String(whatsAppNumber).trim() &&
      String(row.get("Round")).trim() === String(round).trim()
  );

  if (existingRow) {
    return {
      whatsAppNumber: existingRow.get("WhatsApp_Number"),
      round: existingRow.get("Round"),
      startTimestamp: Number(existingRow.get("Start_Timestamp")),
      absoluteDeadline: Number(existingRow.get("Absolute_Deadline"))
    };
  }
  return null;
}

export async function getOrCreateSession(whatsAppNumber, round, durationMinutes) {
  const session = await getSession(whatsAppNumber, round);
  if (session) return session;

  const sheet = await getSheetByTitle("Quiz_Sessions", [
    "WhatsApp_Number",
    "Round",
    "Start_Timestamp",
    "Absolute_Deadline"
  ]);

  const startTimestamp = Date.now();
  const absoluteDeadline = startTimestamp + durationMinutes * 60 * 1000;

  await sheet.addRow({
    WhatsApp_Number: String(whatsAppNumber),
    Round: String(round),
    Start_Timestamp: String(startTimestamp),
    Absolute_Deadline: String(absoluteDeadline)
  });

  return {
    whatsAppNumber,
    round,
    startTimestamp,
    absoluteDeadline
  };
}

export async function saveQuizResult(result) {
  const sheet = await getSheetByTitle("Quiz_Results", [
    "Full_Name",
    "WhatsApp_Number",
    "Team_Name",
    "Round",
    "Score",
    "Total_Questions",
    "Timestamp",
    "Details"
  ]);
  await sheet.addRow({
    Full_Name: result.fullName,
    WhatsApp_Number: result.whatsApp,
    Team_Name: result.teamName || result.team || "Unassigned",
    Round: result.round,
    Score: String(result.score),
    Total_Questions: String(result.totalQuestions),
    Timestamp: result.timestamp,
    Details: result.details
  });
}

export async function getAllQuestions() {
  const sheet = await getSheetByTitle("Quiz_Questions", [
    "ID",
    "Round",
    "Question",
    "Option_1",
    "Option_2",
    "Option_3",
    "Option_4",
    "Correct_Answer"
  ]);
  const rows = await sheet.getRows();
  return rows.map((row, index) => ({
    id: row.get("ID") || `q_${index}`,
    round: row.get("Round"),
    question: row.get("Question"),
    option1: row.get("Option_1"),
    option2: row.get("Option_2"),
    option3: row.get("Option_3"),
    option4: row.get("Option_4"),
    correctAnswer: row.get("Correct_Answer")
  }));
}

export async function getAllQuizResults() {
  const sheet = await getSheetByTitle("Quiz_Results", [
    "Full_Name",
    "WhatsApp_Number",
    "Team_Name",
    "Round",
    "Score",
    "Total_Questions",
    "Timestamp",
    "Details"
  ]);
  const rows = await sheet.getRows();
  return rows.map((row) => ({
    fullName: row.get("Full_Name"),
    whatsApp: row.get("WhatsApp_Number"),
    team: row.get("Team_Name") || row.get("Team") || "Unassigned",
    round: row.get("Round"),
    score: Number(row.get("Score")),
    totalQuestions: Number(row.get("Total_Questions")),
    timestamp: row.get("Timestamp"),
    details: row.get("Details")
  }));
}

export async function addQuizQuestion(q) {
  const sheet = await getSheetByTitle("Quiz_Questions", [
    "ID",
    "Round",
    "Question",
    "Option_1",
    "Option_2",
    "Option_3",
    "Option_4",
    "Correct_Answer"
  ]);
  const id = q.id || `q_${Date.now()}`;
  await sheet.addRow({
    ID: id,
    Round: q.round,
    Question: q.question,
    Option_1: q.option1,
    Option_2: q.option2,
    Option_3: q.option3,
    Option_4: q.option4,
    Correct_Answer: q.correctAnswer
  });
  return id;
}

export async function bulkAddQuizQuestions(questionsList) {
  const sheet = await getSheetByTitle("Quiz_Questions", [
    "ID",
    "Round",
    "Question",
    "Option_1",
    "Option_2",
    "Option_3",
    "Option_4",
    "Correct_Answer"
  ]);
  const now = Date.now();
  const rowsToAdd = questionsList.map((q, idx) => ({
    ID: q.id || `q_${now}_${idx + 1}`,
    Round: q.round,
    Question: q.question,
    Option_1: q.option1,
    Option_2: q.option2,
    Option_3: q.option3,
    Option_4: q.option4,
    Correct_Answer: q.correctAnswer
  }));
  if (rowsToAdd.length > 0) {
    await sheet.addRows(rowsToAdd);
  }
  return rowsToAdd.length;
}

export async function updateQuizQuestion(id, q) {
  const sheet = await getSheetByTitle("Quiz_Questions", [
    "ID",
    "Round",
    "Question",
    "Option_1",
    "Option_2",
    "Option_3",
    "Option_4",
    "Correct_Answer"
  ]);
  const rows = await sheet.getRows();
  const targetRow = rows.find((row) => String(row.get("ID")).trim() === String(id).trim());
  if (targetRow) {
    if (q.round !== undefined) targetRow.set("Round", q.round);
    if (q.question !== undefined) targetRow.set("Question", q.question);
    if (q.option1 !== undefined) targetRow.set("Option_1", q.option1);
    if (q.option2 !== undefined) targetRow.set("Option_2", q.option2);
    if (q.option3 !== undefined) targetRow.set("Option_3", q.option3);
    if (q.option4 !== undefined) targetRow.set("Option_4", q.option4);
    if (q.correctAnswer !== undefined) targetRow.set("Correct_Answer", q.correctAnswer);
    await targetRow.save();
    return true;
  }
  return false;
}

export async function deleteQuizQuestion(id) {
  const sheet = await getSheetByTitle("Quiz_Questions", [
    "ID",
    "Round",
    "Question",
    "Option_1",
    "Option_2",
    "Option_3",
    "Option_4",
    "Correct_Answer"
  ]);
  const rows = await sheet.getRows();
  const targetRow = rows.find((row) => String(row.get("ID")).trim() === String(id).trim());
  if (targetRow) {
    await targetRow.delete();
    return true;
  }
  return false;
}

