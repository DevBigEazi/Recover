export async function generateContent(prompt: string, maxRetries = 2): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not defined in the environment variables.");
  }

  let lastError: Error | null = null;
  let delay = 1000; // start with 1 second delay

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        console.warn(`Retrying Gemini API call (attempt ${attempt}/${maxRetries}) after ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // double the delay for next attempt
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              maxOutputTokens: 150,
              temperature: 0.7,
            },
          }),
        }
      );

      if (response.status === 429) {
        throw new Error("Gemini rate limit exceeded (Too Many Requests).");
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API error status:", response.status, errorText);
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      return text.replace(/^["'`\s]+|["'`\s]+$/g, "").trim();

    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`Attempt ${attempt} failed:`, lastError.message);
      
      // Only retry if we haven't reached the limit and it's a rate limit or server busy error
      if (attempt < maxRetries && (lastError.message.includes("rate limit") || lastError.message.includes("429") || lastError.message.includes("Too Many Requests"))) {
        continue;
      }
      break;
    }
  }

  // If all attempts fail and it was due to rate limits, map to friendly copy
  if (lastError && (lastError.message.includes("rate limit") || lastError.message.includes("Too Many Requests"))) {
    throw new Error("The AI is currently busy. Please wait a moment and try again, or feel free to type.");
  }
  throw lastError || new Error("AI failed to generate response.");
}
