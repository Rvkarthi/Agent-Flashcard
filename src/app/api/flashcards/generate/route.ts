import { NextRequest, NextResponse } from "next/server";
import { generateFlashcardsFromText } from "@/lib/flashcard-generator";
import { GenerationOptions, Flashcard } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, docName, options } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Text content is required for flashcard generation" },
        { status: 400 }
      );
    }

    const generationOptions: GenerationOptions = {
      cardCount: options?.cardCount || 10,
      difficulty: options?.difficulty || "mixed",
      style: options?.style || "comprehensive",
      includeMnemonics: options?.includeMnemonics ?? true,
      includeMultipleChoice: options?.includeMultipleChoice ?? true,
    };

    // If an OpenAI API key is configured in the environment, we query it
    const openAiApiKey = process.env.OPENAI_API_KEY;

    if (openAiApiKey) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openAiApiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `You are an elite study coach and flashcard generation AI. Convert the document text into exactly ${generationOptions.cardCount} high-impact flashcards.
Output JSON schema:
{
  "cards": [
    {
      "front": "string question or prompt",
      "back": "string answer with key context",
      "category": "concept" | "qa" | "true_false" | "multiple_choice" | "mnemonic",
      "difficulty": "easy" | "medium" | "hard",
      "options": ["opt1", "opt2", "opt3", "opt4"] (only if category is multiple_choice or true_false),
      "correctOptionIndex": 0,
      "explanation": "concise explanation",
      "tags": ["tag1", "tag2"]
    }
  ]
}`,
              },
              {
                role: "user",
                content: `Document: ${docName}\n\nContent:\n${text.slice(0, 12000)}`,
              },
            ],
            temperature: 0.3,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const parsed = JSON.parse(data.choices[0].message.content);
          if (parsed && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
            const enriched = parsed.cards.map((c: Partial<Flashcard>, idx: number) => ({
              ...c,
              id: `card_llm_${Date.now()}_${idx}`,
              mastered: false,
              reviewCount: 0,
              easeFactor: 2.5,
              intervalDays: 1,
            }));
            return NextResponse.json({
              success: true,
              cards: enriched,
              source: "llm_openai",
            });
          }
        }
      } catch (llmErr) {
        console.warn("LLM API call failed, falling back to local NLP generator", llmErr);
      }
    }

    // Default & High Performance Local Heuristic NLP Generator
    const cards = generateFlashcardsFromText(
      text,
      docName || "Study Notes",
      generationOptions
    );

    return NextResponse.json({
      success: true,
      cards,
      source: "local_heuristic_nlp",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Flashcard generation failed";
    console.error("Flashcard generation error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
