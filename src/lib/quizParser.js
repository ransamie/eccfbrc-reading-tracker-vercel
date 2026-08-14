/**
 * Intelligent Quiz Question Parser
 * Parses plain text / document pastes into structured quiz question objects.
 */

export function parseQuizQuestions(rawText, defaultRound = "Round 1") {
  if (!rawText || typeof rawText !== "string" || !rawText.trim()) {
    return { questions: [], errors: [], totalDetected: 0 };
  }

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const questions = [];
  const errors = [];

  // Check if text is tabular (TSV or Pipe-separated)
  const isTabular = lines.some(l => l.includes('\t') || (l.includes('|') && l.split('|').length >= 5));

  if (isTabular) {
    lines.forEach((line, idx) => {
      // Ignore header rows
      if (/^(question|round|q_text|id)\b/i.test(line)) return;

      const delimiter = line.includes('\t') ? '\t' : '|';
      const parts = line.split(delimiter).map(p => p.trim()).filter(Boolean);

      if (parts.length >= 5) {
        let qText = parts[0];
        let opt1 = parts[1] || "";
        let opt2 = parts[2] || "";
        let opt3 = parts[3] || "";
        let opt4 = parts[4] || "";
        let ansRaw = parts[5] || parts[1]; // fallback

        // Clean leading question numbers like "1. "
        qText = qText.replace(/^(\d+[\.\)]\s*|Q\d+[:\.\s]\s*)/i, "").trim();

        let correctAnswer = opt1;
        const ansUpper = ansRaw.toUpperCase().trim();

        if (ansUpper === 'A' || ansUpper === '1' || ansUpper === 'OPTION A' || ansUpper === 'OPTION 1') correctAnswer = opt1;
        else if (ansUpper === 'B' || ansUpper === '2' || ansUpper === 'OPTION B' || ansUpper === 'OPTION 2') correctAnswer = opt2;
        else if (ansUpper === 'C' || ansUpper === '3' || ansUpper === 'OPTION C' || ansUpper === 'OPTION 3') correctAnswer = opt3;
        else if (ansUpper === 'D' || ansUpper === '4' || ansUpper === 'OPTION D' || ansUpper === 'OPTION 4') correctAnswer = opt4;
        else {
          // Direct text match
          const match = [opt1, opt2, opt3, opt4].find(o => o.toLowerCase() === ansRaw.toLowerCase());
          correctAnswer = match || ansRaw || opt1;
        }

        questions.push({
          round: defaultRound,
          question: qText,
          option1: opt1,
          option2: opt2,
          option3: opt3,
          option4: opt4,
          correctAnswer: correctAnswer
        });
      } else {
        errors.push(`Row ${idx + 1}: Insufficient columns (expected Question + 4 Options + Answer).`);
      }
    });

    return { questions, errors, totalDetected: questions.length };
  }

  // --- Block-based Parser (Standard Q&A format) ---
  // Strategy: Group lines into Question blocks
  const blocks = [];
  let currentBlock = [];

  const isQuestionStart = (line) => {
    // Matches: "1. ", "1) ", "Q1: ", "Q1. ", "Question 1: ", "1 - "
    return /^(\d+[\.\)]\s+|Q\d+[:\.\s]\s+|Question\s+\d+[:\.\s]\s+|\d+\s*-\s+)/i.test(line);
  };

  const isOptionLine = (line) => {
    // Matches: "A. ", "A) ", "a. ", "a) ", "A - ", "*A. ", "(A) ", "[A] "
    return /^(\*|\[x\]|\(\*\)|\(✓\))?\s*(\([A-D]\)|\[[A-D]\]|[A-D][\.\)\-\:]|[1-4][\.\)\-\:])\s+/i.test(line);
  };

  const isAnswerLine = (line) => {
    // Matches: "Answer: ", "Ans: ", "Correct: ", "Correct Answer: "
    return /^(answer|ans|correct|correct\s+answer)\s*[:\-\=]/i.test(line);
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isQuestionStart(line)) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
        currentBlock = [];
      }
      currentBlock.push(line);
    } else if (currentBlock.length > 0) {
      currentBlock.push(line);
    } else {
      // First line might not have a number, treat as question start
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  // Process each block
  blocks.forEach((block, bIdx) => {
    let qTextLines = [];
    let options = [];
    let detectedAnswer = null;
    let asteriskAnswer = null;

    for (let i = 0; i < block.length; i++) {
      const line = block[i];

      if (isAnswerLine(line)) {
        const rawAns = line.replace(/^(answer|ans|correct|correct\s+answer)\s*[:\-\=]\s*/i, "").trim();
        detectedAnswer = rawAns;
      } else if (isOptionLine(line)) {
        // Check if marked with asterisk or [x] as correct
        const hasMarker = /^(\*|\[x\]|\(\*\)|\(✓\))/i.test(line) || /\s*(\*|\[x\]|\(✓\))$/.test(line);
        
        // Strip marker & prefix (e.g., "*A. Red Sea" -> "Red Sea")
        let cleanOpt = line
          .replace(/^(\*|\[x\]|\(\*\)|\(✓\))\s*/i, "")
          .replace(/^(\([A-D]\)|\[[A-D]\]|[A-D][\.\)\-\:]|[1-4][\.\)\-\:])\s*/i, "")
          .replace(/\s*(\*|\[x\]|\(✓\))$/i, "")
          .trim();

        if (hasMarker) {
          asteriskAnswer = cleanOpt;
        }

        options.push(cleanOpt);
      } else {
        if (options.length === 0) {
          qTextLines.push(line);
        } else {
          // If we already have options, it might be extra line for an option or answer
          if (options.length > 0) {
            options[options.length - 1] += " " + line;
          }
        }
      }
    }

    // Clean question prompt
    let qPrompt = qTextLines.join(" ")
      .replace(/^(\d+[\.\)]\s+|Q\d+[:\.\s]\s+|Question\s+\d+[:\.\s]\s+|\d+\s*-\s+)/i, "")
      .trim();

    if (!qPrompt) {
      errors.push(`Question block ${bIdx + 1}: Missing question text.`);
      return;
    }

    if (options.length < 2) {
      errors.push(`Question "${qPrompt.slice(0, 35)}...": Needs at least 2 options (found ${options.length}).`);
      return;
    }

    // Pad to 4 options if 2 or 3 provided
    const opt1 = options[0] || "None of the above";
    const opt2 = options[1] || "All of the above";
    const opt3 = options[2] || "None of the above";
    const opt4 = options[3] || "All of the above";

    // Resolve correct answer
    let finalCorrectAnswer = asteriskAnswer || opt1;

    if (detectedAnswer) {
      const ansClean = detectedAnswer.toUpperCase().trim();
      if (ansClean === 'A' || ansClean === '1' || ansClean === 'OPTION A' || ansClean === 'OPTION 1') {
        finalCorrectAnswer = opt1;
      } else if (ansClean === 'B' || ansClean === '2' || ansClean === 'OPTION B' || ansClean === 'OPTION 2') {
        finalCorrectAnswer = opt2;
      } else if (ansClean === 'C' || ansClean === '3' || ansClean === 'OPTION C' || ansClean === 'OPTION 3') {
        finalCorrectAnswer = opt3;
      } else if (ansClean === 'D' || ansClean === '4' || ansClean === 'OPTION D' || ansClean === 'OPTION 4') {
        finalCorrectAnswer = opt4;
      } else {
        // Direct text match
        const match = [opt1, opt2, opt3, opt4].find(o => o.toLowerCase() === detectedAnswer.toLowerCase());
        finalCorrectAnswer = match || detectedAnswer || opt1;
      }
    }

    questions.push({
      round: defaultRound,
      question: qPrompt,
      option1: opt1,
      option2: opt2,
      option3: opt3,
      option4: opt4,
      correctAnswer: finalCorrectAnswer
    });
  });

  return {
    questions,
    errors,
    totalDetected: questions.length
  };
}
