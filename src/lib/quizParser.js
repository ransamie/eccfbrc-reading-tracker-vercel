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
  const isTabular = lines.length > 0 && lines.every(l => l.includes('\t') || (l.includes('|') && l.split('|').length >= 4));

  if (isTabular) {
    lines.forEach((line, idx) => {
      if (/^(question|round|q_text|id)\b/i.test(line)) return;

      const delimiter = line.includes('\t') ? '\t' : '|';
      const parts = line.split(delimiter).map(p => p.trim()).filter(Boolean);

      if (parts.length >= 4) {
        let qText = parts[0].replace(/^(\d+[\.\)\:\-]\s*|Q\d+[:\.\s]\s*)/i, "").trim();
        let opt1 = parts[1] || "";
        let opt2 = parts[2] || "";
        let opt3 = parts[3] || "";
        let opt4 = parts[4] || "";
        let ansRaw = parts[5] || parts[1];

        let correctAnswer = opt1;
        const ansUpper = String(ansRaw).toUpperCase().trim();

        if (ansUpper === 'A' || ansUpper === '1' || ansUpper === 'OPTION A') correctAnswer = opt1;
        else if (ansUpper === 'B' || ansUpper === '2' || ansUpper === 'OPTION B') correctAnswer = opt2;
        else if (ansUpper === 'C' || ansUpper === '3' || ansUpper === 'OPTION C') correctAnswer = opt3;
        else if (ansUpper === 'D' || ansUpper === '4' || ansUpper === 'OPTION D') correctAnswer = opt4;
        else {
          const match = [opt1, opt2, opt3, opt4].find(o => o.toLowerCase() === String(ansRaw).toLowerCase());
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
      }
    });

    if (questions.length > 0) {
      return { questions, errors, totalDetected: questions.length };
    }
  }

  // --- Block-based Q&A Parser ---
  const isQuestionStart = (line) => {
    // Matches: "1. ", "1)", "1: ", "1.Who", "Q1: ", "Question 1: ", "1 - "
    return /^(\d+[\.\)\:\-]\s*|Q\d+[:\.\s]\s*|Question\s+\d+[:\.\s]\s*)/i.test(line);
  };

  const isOptionLine = (line) => {
    // Matches: "A. ", "A) ", "A: ", "(A) ", "[A] ", "Option A: ", "*A. " (strictly avoids confusing numbers like 1. with options)
    return /^(\*|\[x\]|\(\*\)|\(✓\))?\s*(\([A-D]\)|\[[A-D]\]|[A-D][\.\)\-\:]|Option\s+[A-D][\:\.\-]?)\s*/i.test(line);
  };

  const isAnswerLine = (line) => {
    // Matches: "Answer: ", "Ans: ", "Correct: ", "Correct Answer: "
    return /^(answer|ans|correct|correct\s+answer)\s*[:\-\=]/i.test(line);
  };

  // Split into raw question blocks
  const blocks = [];
  let currentBlock = [];

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
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  // Parse each block
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
        const hasMarker = /^(\*|\[x\]|\(\*\)|\(✓\))/i.test(line) || /\s*(\*|\[x\]|\(✓\))$/.test(line);
        
        let cleanOpt = line
          .replace(/^(\*|\[x\]|\(\*\)|\(✓\))\s*/i, "")
          .replace(/^(\([A-D]\)|\[[A-D]\]|[A-D][\.\)\-\:]|Option\s+[A-D][\:\.\-]?)\s*/i, "")
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
          // If already reading options, extra line attaches to previous option
          if (options.length > 0) {
            options[options.length - 1] += " " + line;
          }
        }
      }
    }

    // Clean question prompt (remove leading numbers like "1. ", "2.Who", "Q1: ")
    let qPrompt = qTextLines.join(" ")
      .replace(/^(\d+[\.\)\:\-]\s*|Q\d+[:\.\s]\s*|Question\s+\d+[:\.\s]\s*)/i, "")
      .trim();

    if (!qPrompt) {
      errors.push(`Question block ${bIdx + 1}: Missing question text.`);
      return;
    }

    if (options.length < 2) {
      errors.push(`Question "${qPrompt.slice(0, 35)}...": Needs at least 2 options (found ${options.length}).`);
      return;
    }

    const opt1 = options[0] || "None of the above";
    const opt2 = options[1] || "All of the above";
    const opt3 = options[2] || "None of the above";
    const opt4 = options[3] || "All of the above";

    let finalCorrectAnswer = asteriskAnswer || opt1;

    if (detectedAnswer) {
      const ansClean = detectedAnswer.toUpperCase().trim();
      if (ansClean === 'A' || ansClean === '1' || ansClean === 'OPTION A') {
        finalCorrectAnswer = opt1;
      } else if (ansClean === 'B' || ansClean === '2' || ansClean === 'OPTION B') {
        finalCorrectAnswer = opt2;
      } else if (ansClean === 'C' || ansClean === '3' || ansClean === 'OPTION C') {
        finalCorrectAnswer = opt3;
      } else if (ansClean === 'D' || ansClean === '4' || ansClean === 'OPTION D') {
        finalCorrectAnswer = opt4;
      } else {
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
