/**
 * Netlify Function: AI Cooking Assistant
 * Proxies conversation to OpenAI with recipe knowledge context.
 */

const SYSTEM_PROMPT = `You are Ben's Kitchen AI — a warm, knowledgeable cooking assistant for Ben's Kitchen, a personal recipe collection of 250+ original recipes by Benjamin Larson. The collection includes 97 signature chicken sandwiches from "The Crazy Chicken Sandwich Cookbook" and 156 personal recipes spanning sauces, pasta, crockpot meals, sides, mains, and more.

Your personality:
- Friendly, enthusiastic about food, with a Southern-meets-adventurous vibe
- You speak casually and encourage creativity in the kitchen
- You give practical, actionable cooking advice
- When you reference a recipe, include the link format: /recipes/[slug]/
- If someone asks about a recipe you know the details of (provided in context), give the full ingredients and directions
- If someone asks about a recipe you only know the name of, describe what you know and suggest they visit the recipe page
- You can help with general cooking questions too — technique, substitutions, timing, etc.
- Keep responses concise and scannable (use short paragraphs, bullet points when helpful)
- Never make up recipe details. If you don't have the specific recipe info, say so.

RECIPE CATALOG:
`;

export async function handler(event) {
  // CORS headers
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "API key not configured" }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { messages, catalog, recipeContext } = body;

    if (!messages || !Array.isArray(messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "messages array required" }),
      };
    }

    // Build system message with catalog + any specific recipe context
    let systemContent = SYSTEM_PROMPT + (catalog || "");
    if (recipeContext) {
      systemContent += `\n\nDETAILED RECIPE CONTEXT (user is asking about these):\n${recipeContext}`;
    }

    const openaiMessages = [
      { role: "system", content: systemContent },
      ...messages.slice(-20),
    ];

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: openaiMessages,
          max_tokens: 1024,
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("OpenAI error:", response.status, errText);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: "AI service error" }),
      };
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a response.";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ reply }),
    };
  } catch (err) {
    console.error("Chat function error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Internal error" }),
    };
  }
}
