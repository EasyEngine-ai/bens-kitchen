/**
 * Cloudflare Pages Function: AI Cooking Assistant
 * Proxies conversation to OpenAI with recipe knowledge context.
 * URL: /api/chat
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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function onRequestPost(context) {
  const apiKey = context.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "API key not configured" },
      { status: 500, headers: CORS_HEADERS }
    );
  }

  try {
    const body = await context.request.json();
    const { messages, catalog, recipeContext } = body;

    if (!messages || !Array.isArray(messages)) {
      return Response.json(
        { error: "messages array required" },
        { status: 400, headers: CORS_HEADERS }
      );
    }

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
      return Response.json(
        { error: "AI service error" },
        { status: 502, headers: CORS_HEADERS }
      );
    }

    const data = await response.json();
    const reply =
      data.choices?.[0]?.message?.content ||
      "Sorry, I couldn't generate a response.";

    return Response.json({ reply }, { headers: CORS_HEADERS });
  } catch (err) {
    console.error("Chat function error:", err);
    return Response.json(
      { error: "Internal error" },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
