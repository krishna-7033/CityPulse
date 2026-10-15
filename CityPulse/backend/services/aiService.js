const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

const classifyNews = async (videos, city) => {
    if (!videos.length) {
        return [];
    }

    const prompt = `
You are the news classification engine for CityPulse, a local news aggregation platform.

The user searched for: "${city}"

Your task is to analyze the YouTube videos below and determine which ones are genuinely relevant local news for the user's search.

IMPORTANT RULES:

1. Understand the user's search exactly as written.
2. If the search contains a specific location such as "Kishanganj Bihar" or "Kishanganj Delhi", use that full context.
3. Do not assume that every occurrence of a city name refers to the same geographic location.
4. Reject videos that are clearly about another location.
5. Reject gambling, betting, lottery, shopping, products, recipes, music, astrology, gaming and unrelated viral content.
6. Political content may be classified as news when it reports an event, speech, government action, rally, policy development or other factual event.
7. Do not evaluate political viewpoints or use partisan language.
8. Do not merge unrelated incidents simply because they mention the same city, politician, organization or general topic.

STORY CLUSTERING:

Use the same storyKey when multiple videos are reporting the same underlying real-world event.

Examples:
- Same incident reported by News18 and ABP → same storyKey.
- Same police action reported by several channels → same storyKey.
- A direct update about the same incident → same storyKey.

Use different storyKeys when:
- The incidents are different.
- The locations are different.
- The people/events are different.
- One video is broad commentary while another reports a specific incident.
- A regional issue contains several unrelated incidents.
- Two videos only share a topic but are not reporting the same event.

STORY TITLE:

Generate a clean CityPulse storyTitle.

The storyTitle must:
- Be short and factual.
- Usually be 6–14 words.
- Clearly describe the underlying event.
- Be understandable without seeing the original YouTube title.
- Remove hashtags, emojis, clickbait, "see more", presenter names and promotional wording.
- Avoid sensational or opinionated language.
- Preserve important location and event information.
- Do not invent facts that are not supported by the provided video information.

CATEGORY must be one of:

public_safety, government, politics, transport, weather, education, health, business, crime, infrastructure, sports, environment, community, other

Return ONLY valid JSON in this exact structure:

[
  {
    "index": 0,
    "isLocalNews": true,
    "category": "crime",
    "storyKey": "example-story-key",
    "storyTitle": "Clean factual story title",
    "confidence": 0.95
  }
]

VIDEOS:

${videos
            .map(
                (video, index) => `
VIDEO ${index}
Title: ${video.title}
Description: ${video.description || "No description"}
Channel: ${video.channel}
Published: ${video.publishedAt}
`,
            )
            .join("\n")}
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            },
        });

        return JSON.parse(response.text);
    } catch (error) {
        console.error("Gemini classification error:", error.message);
        return [];
    }
};


const generateStorySummary = async (story) => {
    if (!story || !story.sources || story.sources.length === 0) {
        return "No summary is available for this story.";
    }

    const sourceInformation = story.sources
        .map(
            (source, index) => `
SOURCE ${index + 1}
Title: ${source.title}
Description: ${source.description || "No description available"}
Channel: ${source.channel}
Published: ${source.publishedAt}
`,
        )
        .join("\n");

    const prompt = `
You are the factual news summarization engine for CityPulse.

Create a concise summary of the local news story below using ONLY the information contained in the provided sources.

STORY TITLE:
${story.title}

CATEGORY:
${story.category}

SOURCE INFORMATION:
${sourceInformation}

STRICT RULES:

1. Do NOT invent facts.
2. Do NOT infer details that are not explicitly supported by the sources.
3. Do NOT add names, numbers, dates, locations, causes, quotes or events that are not present in the sources.
4. Combine information from multiple sources when they describe the same event.
5. If sources contain slightly different information, use cautious wording rather than choosing an unsupported version.
6. If the available information is insufficient, clearly say that the available reports provide limited details.
7. Keep the tone factual, neutral and non-sensational.
8. Do not express political opinions.
9. Do not praise or criticize any person, organization, government or political party.
10. Do not mention YouTube unless it is necessary to explain the source.
11. Do not begin with phrases such as "According to the sources".
12. Write 2–4 sentences.
13. Target approximately 40–80 words.
14. The summary should read naturally as a CityPulse news summary.

Return ONLY the summary text.
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt,
        });

        const summary = response.text?.trim();

        if (!summary) {
            return "A summary is not available for this story.";
        }

        return summary;
    } catch (error) {
        console.error("Gemini story summary error:", error.message);

        return "A summary is not available for this story.";
    }
};


module.exports = {
    classifyNews,
    generateStorySummary,
};