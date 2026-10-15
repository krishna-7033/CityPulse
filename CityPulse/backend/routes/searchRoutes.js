
const express = require("express");
const router = express.Router();

const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { searchYouTube } = require("../services/youtubeService");

router.get("/", authMiddleware, async (req, res) => {
    try {
        const topic = String(req.query.q || "").trim();

        if (!topic || topic.length > 200) {
            return res.status(400).json({
                message: "Enter a valid search topic",
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: { lastSearchedTopic: topic } },
            { returnDocument: "after", runValidators: true }
        );

        const subscription = user.subscription || {};

        const isPremiumMember =
            subscription.plan === "plus" &&
            subscription.status === "active" &&
            (
                !subscription.expiresAt ||
                new Date(subscription.expiresAt) > new Date()
            );


        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        console.log("Updated user:", user._id);
        console.log("Saved topic:", user.lastSearchedTopic);

        const videos = await searchYouTube(topic, {
            includeSummaries: isPremiumMember,
        });

        return res.json({
            topic,
            count: videos.length,
            videos,
        });
    } catch (error) {
        console.error("Search error:", error);

        return res.status(500).json({
            message: "Failed to search news",
        });
    }
});

module.exports = router;
