import { Flashcard, GenerationOptions, CardCategory, CardDifficulty } from "@/types";

export function generateFlashcardsFromText(
  text: string,
  docName: string,
  options: GenerationOptions
): Flashcard[] {
  const cards: Flashcard[] = [];
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // 1. Identify Sections, Headings, and Key Concept Pairs
  const extractedConcepts: {
    term: string;
    definition: string;
    context: string;
    tag: string;
  }[] = [];

  let currentHeading = docName.replace(/\.[^/.]+$/, "").replace(/_/g, " ");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for Markdown headings
    if (line.startsWith("#")) {
      currentHeading = line.replace(/^#+\s*/, "").replace(/[^\w\s-]/g, "");
      continue;
    }

    // Check for bold terms: **Term**: Definition or **Term** - Definition
    const boldMatch = line.match(/^\s*(?:[-*]\s*)?\*\*([^*]+)\*\*[:\s–—-]+(.+)$/);
    if (boldMatch) {
      extractedConcepts.push({
        term: boldMatch[1].trim(),
        definition: boldMatch[2].trim(),
        context: currentHeading,
        tag: currentHeading.split(" ")[0] || "General",
      });
      continue;
    }

    // Check for numbered list or bullet with colon: Term: Definition
    const colonMatch = line.match(/^\s*(?:[-*]|\d+\.)\s*([^:–—]+)[:–—](.+)$/);
    if (colonMatch && colonMatch[1].length < 50 && colonMatch[2].length > 15) {
      extractedConcepts.push({
        term: colonMatch[1].trim().replace(/^\*+|\*+$/g, ""),
        definition: colonMatch[2].trim(),
        context: currentHeading,
        tag: currentHeading.split(" ")[0] || "Core",
      });
      continue;
    }

    // Check for definition sentences: "X is / refers to / represents Y"
    const defSentenceMatch = line.match(
      /^([A-Z][a-zA-Z0-9\s()_-]{2,35})\s+(?:is an?|refers to|represents|is defined as|provides)\s+(.+)$/
    );
    if (defSentenceMatch && defSentenceMatch[1].split(" ").length <= 4) {
      extractedConcepts.push({
        term: defSentenceMatch[1].trim(),
        definition: defSentenceMatch[0].trim(),
        context: currentHeading,
        tag: currentHeading.split(" ")[0] || "Concept",
      });
    }
  }

  // If few specific concepts matched, fall back to paragraph sentences
  if (extractedConcepts.length < 3) {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 30 && s.length < 280);

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const words = sentence.split(" ");
      const subject = words.slice(0, 3).join(" ").replace(/[^\w\s]/g, "");
      extractedConcepts.push({
        term: subject || `Key Concept ${i + 1}`,
        definition: sentence,
        context: currentHeading,
        tag: currentHeading.split(" ")[0] || "Key Fact",
      });
    }
  }

  const targetCount = Math.min(options.cardCount || 10, Math.max(extractedConcepts.length, 6));

  // 2. Synthesize diverse card types
  let cardCounter = 0;

  for (let i = 0; i < extractedConcepts.length && cards.length < targetCount; i++) {
    const concept = extractedConcepts[i];
    cardCounter++;

    // Determine category based on index and options
    let category: CardCategory = "concept";
    const mod = cardCounter % 4;

    if (options.includeMultipleChoice && mod === 1 && extractedConcepts.length >= 4) {
      category = "multiple_choice";
    } else if (mod === 2) {
      category = "qa";
    } else if (mod === 3) {
      category = "true_false";
    } else if (options.includeMnemonics && mod === 0 && concept.term.length > 3) {
      category = "mnemonic";
    } else {
      category = "concept";
    }

    // Determine difficulty
    let difficulty: CardDifficulty = "medium";
    if (options.difficulty === "easy") difficulty = "easy";
    else if (options.difficulty === "hard") difficulty = "hard";
    else {
      // Mixed
      difficulty = cardCounter % 3 === 0 ? "hard" : cardCounter % 2 === 0 ? "easy" : "medium";
    }

    if (category === "concept") {
      cards.push({
        id: `card_${Date.now()}_${cardCounter}`,
        front: `What is ${concept.term}?`,
        back: concept.definition,
        category: "concept",
        difficulty,
        tags: [concept.tag, concept.context].filter(Boolean),
        mastered: false,
        reviewCount: 0,
        easeFactor: 2.5,
        intervalDays: 1,
        explanation: `Under section "${concept.context}": ${concept.term} plays a fundamental role.`,
      });
    } else if (category === "qa") {
      cards.push({
        id: `card_${Date.now()}_${cardCounter}`,
        front: `Explain the significance and operation of ${concept.term} in ${concept.context}.`,
        back: `${concept.definition}\n\nKey Takeaway: Understanding this mechanism is essential for mastering ${concept.context}.`,
        category: "qa",
        difficulty: "hard",
        tags: [concept.tag, "Deep Dive"],
        mastered: false,
        reviewCount: 0,
        easeFactor: 2.5,
        intervalDays: 1,
        explanation: `Crucial knowledge point extracted from study notes.`,
      });
    } else if (category === "true_false") {
      const isTrue = cardCounter % 2 === 1;
      const front = isTrue
        ? `True or False: ${concept.term} is directly characterized by: "${concept.definition.slice(0, 110)}..."`
        : `True or False: ${concept.term} operates inversely to standard expectations and requires zero coordination with ${concept.context}.`;

      cards.push({
        id: `card_${Date.now()}_${cardCounter}`,
        front,
        back: isTrue
          ? `TRUE. ${concept.term} indeed represents: ${concept.definition}`
          : `FALSE. ${concept.term} does not operate inversely; rather: ${concept.definition}`,
        category: "true_false",
        options: ["True", "False"],
        correctOptionIndex: isTrue ? 0 : 1,
        difficulty: "easy",
        tags: [concept.tag, "Verification"],
        mastered: false,
        reviewCount: 0,
        easeFactor: 2.5,
        intervalDays: 1,
        explanation: concept.definition,
      });
    } else if (category === "multiple_choice") {
      // Pick 3 distractors from other concepts
      const otherConcepts = extractedConcepts.filter((_, idx) => idx !== i);
      const distractors = otherConcepts
        .slice(0, 3)
        .map((c) => c.definition.slice(0, 95) + (c.definition.length > 95 ? "..." : ""));

      while (distractors.length < 3) {
        distractors.push(`Alternative non-applicable mechanism in ${concept.context}`);
      }

      const correctOption =
        concept.definition.slice(0, 95) +
        (concept.definition.length > 95 ? "..." : "");

      const allOptions = [correctOption, ...distractors].sort(() => 0.5 - Math.random());
      const correctIdx = allOptions.indexOf(correctOption);

      cards.push({
        id: `card_${Date.now()}_${cardCounter}`,
        front: `Which of the following best describes "${concept.term}"?`,
        back: `Correct answer: ${correctOption}\n\nFull definition: ${concept.definition}`,
        category: "multiple_choice",
        options: allOptions,
        correctOptionIndex: correctIdx,
        difficulty: "medium",
        tags: [concept.tag, "Quiz"],
        mastered: false,
        reviewCount: 0,
        easeFactor: 2.5,
        intervalDays: 1,
        explanation: `Section reference: ${concept.context}.`,
      });
    } else if (category === "mnemonic") {
      const letters = concept.term
        .split(" ")
        .map((w) => w[0]?.toUpperCase())
        .filter(Boolean)
        .join("");

      cards.push({
        id: `card_${Date.now()}_${cardCounter}`,
        front: `Memory Mnemonic for ${concept.term}`,
        back: `💡 Recall Anchor [${letters || "KEY"}]:\nRemember "${concept.term}" by associating it with: ${concept.definition.slice(0, 120)}...`,
        category: "mnemonic",
        difficulty: "easy",
        tags: [concept.tag, "Mnemonic"],
        mastered: false,
        reviewCount: 0,
        easeFactor: 2.5,
        intervalDays: 1,
        explanation: `Mnemonics enhance memory retention via spaced repetition.`,
      });
    }
  }

  // Ensure minimum cards if document was very concise
  if (cards.length === 0) {
    cards.push({
      id: `card_${Date.now()}_default`,
      front: `Key Takeaway from ${docName}`,
      back: text.slice(0, 300) || "Comprehensive study material reviewed.",
      category: "concept",
      difficulty: "easy",
      tags: ["Overview"],
      mastered: false,
      reviewCount: 0,
      easeFactor: 2.5,
      intervalDays: 1,
      explanation: "Synthesized from uploaded document.",
    });
  }

  return cards;
}
