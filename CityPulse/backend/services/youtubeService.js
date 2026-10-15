const axios = require("axios");
const {
    classifyNews,
    generateStorySummary,
} = require("./aiService");

const SEARCH_QUERIES = [
  (city) => `${city} news`,
  (city) => `${city} latest news`,
  (city) => `${city} today news`,
];

const GENERIC_BLOCKED_PATTERNS = [
  /\bfatafat\b/i,
  /\bff tips?\b/i,
  /\bbaji\b/i,
  /\bbaji tips?\b/i,
  /\bmatka\b/i,
  /\bsatta\b/i,
  /\bbetting\b/i,
  /\bgambling\b/i,
  /\bcasino\b/i,
  /\blottery\b/i,

  /\bcooking\b/i,
  /\brecipe\b/i,
  /\blyrics\b/i,
  /\bfull song\b/i,
  /\bmusic video\b/i,
  /\bdance video\b/i,

  /\bshopping\b/i,
  /\bwholesale\b/i,
  /\bproduct review\b/i,
  /\bunboxing\b/i,
  /\bdiscount\b/i,
  /\boffer\b/i,

  /\bhoroscope\b/i,
  /\bastrology\b/i,

  /\bgameplay\b/i,
  /\bwalkthrough\b/i,
];

const NEWS_SIGNALS = [
  "news",
  "breaking",
  "latest",
  "update",
  "updates",
  "report",
  "live",
  "police",
  "traffic",
  "weather",
  "rain",
  "flood",
  "fire",
  "accident",
  "crime",
  "court",
  "government",
  "minister",
  "official",
  "protest",
  "election",
  "rally",
  "hospital",
  "school",
  "college",
  "metro",
  "railway",
  "airport",
  "road",
  "transport",
  "power",
  "water",
];

const normalizeText = (text = "") => {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const tokenize = (text = "") => {
  return new Set(
    normalizeText(text)
      .split(" ")
      .filter((word) => word.length > 2),
  );
};

const similarity = (textA, textB) => {
  const a = tokenize(textA);
  const b = tokenize(textB);

  if (!a.size || !b.size) return 0;

  let intersection = 0;

  for (const word of a) {
    if (b.has(word)) {
      intersection++;
    }
  }

  const union = new Set([...a, ...b]).size;

  return intersection / union;
};

const isObviouslyIrrelevant = (video) => {
  const text = `${video.title} ${video.description}`;

  return GENERIC_BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
};

const calculateNewsScore = (video, city) => {
  const title = normalizeText(video.title);
  const description = normalizeText(video.description);

  let score = 0;

  const cityName = normalizeText(city);

  if (title.includes(cityName)) {
    score += 30;
  }

  if (description.includes(cityName)) {
    score += 10;
  }

  for (const signal of NEWS_SIGNALS) {
    if (title.includes(signal)) {
      score += 5;
    }
  }

  for (const signal of NEWS_SIGNALS) {
    if (description.includes(signal)) {
      score += 2;
    }
  }

  const ageHours =
    (Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60);

  if (ageHours <= 3) {
    score += 20;
  } else if (ageHours <= 6) {
    score += 15;
  } else if (ageHours <= 12) {
    score += 10;
  } else if (ageHours <= 24) {
    score += 5;
  }

  return score;
};

const removeDuplicateVideos = (videos) => {
  const seen = new Set();

  return videos.filter((video) => {
    if (seen.has(video.videoId)) {
      return false;
    }

    seen.add(video.videoId);
    return true;
  });
};

const removeSimilarStories = (videos) => {
  const selected = [];

  for (const video of videos) {
    const duplicate = selected.some((existing) => {
      return similarity(existing.title, video.title) >= 0.65;
    });

    if (!duplicate) {
      selected.push(video);
    }
  }

  return selected;
};

const limitChannelRepetition = (videos, maxPerChannel = 2) => {
  const channelCount = {};

  return videos.filter((video) => {
    const channel = video.channel;

    channelCount[channel] = (channelCount[channel] || 0) + 1;

    return channelCount[channel] <= maxPerChannel;
  });
};


const groupStories = (videos) => {
    const stories = new Map();

    for (const video of videos) {
        if (!stories.has(video.storyKey)) {
            stories.set(video.storyKey, {
                storyKey: video.storyKey,
                title: video.storyTitle || video.title,
                category: video.category,
                confidence: video.confidence,
                publishedAt: video.publishedAt,
                sources: []
            });
        }

        const story = stories.get(video.storyKey);

        story.sources.push({
            videoId: video.videoId,
            title: video.title,
            description: video.description,
            channel: video.channel,
            thumbnail: video.thumbnail,
            publishedAt: video.publishedAt
        });

        if (
            new Date(video.publishedAt) >
            new Date(story.publishedAt)
        ) {
            story.publishedAt = video.publishedAt;
        }
    }

    return Array.from(stories.values());
};



const searchYouTube = async (city, { includeSummaries = false } = {}) => {
  try {
    const results = await Promise.all(
      SEARCH_QUERIES.map((createQuery) =>
        axios.get("https://www.googleapis.com/youtube/v3/search", {
          params: {
            part: "snippet",
            q: createQuery(city),
            type: "video",
            order: "date",
            maxResults: 12,
            publishedAfter: new Date(
              Date.now() - 24 * 60 * 60 * 1000,
            ).toISOString(),
            regionCode: "IN",
            key: process.env.YOUTUBE_API_KEY,
          },
        }),
      ),
    );

    const allVideos = results.flatMap((response) =>
      response.data.items.map((item) => ({
        videoId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        channel: item.snippet.channelTitle,
        thumbnail:
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.medium?.url ||
          item.snippet.thumbnails.default?.url,
        publishedAt: item.snippet.publishedAt,
      })),
    );

    let videos = removeDuplicateVideos(allVideos);

    videos = videos.filter((video) => !isObviouslyIrrelevant(video));

    videos = videos.map((video) => ({
      ...video,
      newsScore: calculateNewsScore(video, city),
    }));

    videos.sort((a, b) => {
      return (
        b.newsScore - a.newsScore ||
        new Date(b.publishedAt) - new Date(a.publishedAt)
      );
    });

    videos = removeSimilarStories(videos);

    videos = limitChannelRepetition(videos, 2);

    videos.sort((a, b) => {
      return (
        b.newsScore - a.newsScore ||
        new Date(b.publishedAt) - new Date(a.publishedAt)
      );
    });

    const candidates = videos.slice(0, 20);

    const classifications = await classifyNews(candidates, city);

    let classifiedVideos;

    if (classifications.length === 0) {
      classifiedVideos = candidates.map((video) => ({
        ...video,
        isLocalNews: true,
        category: "other",
        storyKey: `fallback-${video.videoId}`,
        confidence: 0,
      }));
    } else {
      classifiedVideos = candidates
        .map((video, index) => {
          const classification = classifications.find(
            (item) => item.index === index,
          );

          return {
            ...video,
            isLocalNews: classification?.isLocalNews ?? false,
            category: classification?.category ?? "other",
            storyKey: classification?.storyKey ?? `story-${index}`,
            confidence: classification?.confidence ?? 0,
          };
        })
        .filter((video) => video.isLocalNews);
    }

      let stories = groupStories(classifiedVideos);

      stories.sort((a, b) => {
          return new Date(b.publishedAt) - new Date(a.publishedAt);
      });

      stories = stories.slice(0, 10);


    // Free users and guests receive stories without AI summaries.
    if (!includeSummaries) {
      return stories;
    }

    // Generate AI summaries only for premium members.
    const storiesWithSummaries = await Promise.all(
      stories.map(async (story) => {
        const summary = await generateStorySummary(story);

        return {
          ...story,
          summary,
        };
      }),
    );

    return storiesWithSummaries;

  } catch (error) {
    console.error("YouTube API Error:", error.response?.data || error.message);

    throw new Error("Failed to fetch YouTube news");
  }
};

module.exports = {
  searchYouTube,
};
