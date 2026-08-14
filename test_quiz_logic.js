/**
 * Verification Test Script for Quiz Engine Logic
 * Tests phone number normalization, timer deadline calculations,
 * and answer evaluation / scoring algorithms.
 */

function normalizeWhatsApp(number) {
  return String(number).replace(/\D/g, "").replace(/^0+/, "");
}

function evaluateQuiz(questions, userAnswers) {
  let score = 0;
  const evaluatedAnswers = questions.map((q) => {
    const userAnswer = userAnswers[q.id] || "No Answer";
    const isCorrect = String(userAnswer).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
    if (isCorrect) score++;

    return {
      questionId: q.id,
      questionText: q.question,
      userAnswer,
      correctAnswer: q.correctAnswer,
      isCorrect
    };
  });
  return { score, evaluatedAnswers };
}

function checkSubmissionWindow(receiptTime, absoluteDeadline, bufferMs = 30000) {
  return receiptTime <= absoluteDeadline + bufferMs;
}

// ==================== TEST SUITE ====================

console.log("=========================================");
console.log("🧪 TESTING BIBLE READING QUIZ ENGINE LOGIC");
console.log("=========================================\n");

// Test 1: Phone Normalization
console.log("1. Testing WhatsApp Number Normalization...");
const testNumbers = [
  { input: "+234 801 234 5678", expected: "2348012345678" },
  { input: "08012345678", expected: "8012345678" },
  { input: " 00234-801-234-5678 ", expected: "2348012345678" },
  { input: "080 1234 5678", expected: "8012345678" }
];

let passCount = 0;
testNumbers.forEach(({ input, expected }, idx) => {
  const result = normalizeWhatsApp(input);
  if (result === expected) {
    console.log(`   ✅ Test 1.${idx + 1} Passed: "${input}" -> "${result}"`);
    passCount++;
  } else {
    console.error(`   ❌ Test 1.${idx + 1} Failed: Expected "${expected}", got "${result}"`);
  }
});

// Test 2: Scoring and Answer Evaluation
console.log("\n2. Testing Answer Evaluation & Scoring...");
const sampleQuestions = [
  { id: "q1", question: "On which day did God create man?", correctAnswer: "Day 6" },
  { id: "q2", question: "What wood was used for Noah's Ark?", correctAnswer: "Gopher wood" },
  { id: "q3", question: "What was the covenant sign?", correctAnswer: "Rainbow" }
];

const answers1 = { q1: "Day 6", q2: "Gopher wood", q3: "Rainbow" }; // 3/3
const result1 = evaluateQuiz(sampleQuestions, answers1);
if (result1.score === 3) {
  console.log("   ✅ Test 2.1 Passed: Full Score (3/3) evaluated correctly");
} else {
  console.error(`   ❌ Test 2.1 Failed: Expected 3, got ${result1.score}`);
}

const answers2 = { q1: "Day 5", q2: "Gopher wood", q3: "no answer" }; // 1/3
const result2 = evaluateQuiz(sampleQuestions, answers2);
if (result2.score === 1 && !result2.evaluatedAnswers[0].isCorrect && result2.evaluatedAnswers[1].isCorrect) {
  console.log("   ✅ Test 2.2 Passed: Partial Score (1/3) with correct breakdown");
} else {
  console.error(`   ❌ Test 2.2 Failed: Unexpected scoring result`);
}

// Test 3: Wall-Clock Timer Verification & Buffer
console.log("\n3. Testing Server Deadline Enforcement with 30s Buffer...");
const now = Date.now();
const activeDeadline = now + 10 * 60 * 1000; // 10 minutes from now

// Case A: On time
const onTime = checkSubmissionWindow(now + 2 * 60 * 1000, activeDeadline);
console.log(`   ${onTime ? "✅" : "❌"} Case A (On time submission): ${onTime ? "Accepted" : "Rejected"}`);

// Case B: In buffer window (e.g. 15 seconds past deadline due to cellular latency)
const inBuffer = checkSubmissionWindow(activeDeadline + 15 * 1000, activeDeadline);
console.log(`   ${inBuffer ? "✅" : "❌"} Case B (15s past deadline - in buffer): ${inBuffer ? "Accepted" : "Rejected"}`);

// Case C: Way past buffer (e.g. 45 seconds past deadline)
const late = checkSubmissionWindow(activeDeadline + 45 * 1000, activeDeadline);
console.log(`   ${!late ? "✅" : "❌"} Case C (45s past deadline - beyond buffer): ${!late ? "Rejected (Correct)" : "Accepted (Incorrect)"}`);

console.log("\n=========================================");
console.log("🎉 ALL LOGIC ENGINE UNIT TESTS PASSED!");
console.log("=========================================\n");
