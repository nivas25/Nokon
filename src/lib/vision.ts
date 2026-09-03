export async function extractDetailsFromImage(base64Image: string): Promise<{
  sellerHandle: string | null;
  itemCode: string | null;
  size: string | null;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY missing");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert AI extraction assistant. 
The user is providing a screenshot of a YouTube Shorts reel from a fashion store. 
You must extract the following 3 things if available in the text overlay, caption, or anywhere on the screen:
1. sellerHandle: The YouTube handle (e.g., 'sareedidi'). Do not include the '@'.
2. itemCode: The ID/code of the item (e.g., '14' or '101').
3. size: Any size mentioned.

Return ONLY a raw JSON object in this exact format, with null if missing. Do NOT use markdown code blocks like \`\`\`json.
{"sellerHandle": "string", "itemCode": "string", "size": "string"}`
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 200,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI API Error:", errorText);
    throw new Error("Failed to extract details from image");
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  try {
    const parsed = JSON.parse(content.trim());
    return {
      sellerHandle: parsed.sellerHandle || null,
      itemCode: parsed.itemCode || null,
      size: parsed.size || null,
    };
  } catch (e) {
    console.error("Failed to parse OpenAI JSON:", content);
    return { sellerHandle: null, itemCode: null, size: null };
  }
}
