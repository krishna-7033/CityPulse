
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");
const { searchYouTube } = require("./services/youtubeService");
const searchRoutes = require("./routes/searchRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/search", searchRoutes);
app.use("/api/auth", authRoutes);

// Health check
app.get("/", (req, res) => {
    res.json({
        message: "CityPulse API is running"
    });
});

// Fetch news for a city
app.get("/api/news/:city", async (req, res) => {
    try {
        const city = req.params.city?.trim();

        if (!city) {
            return res.status(400).json({
                error: "City is required"
            });
        }

        const videos = await searchYouTube(city);

        return res.json({
            city,
            count: videos.length,
            videos
        });
    } catch (error) {
        console.error("News API error:", error);

        return res.status(500).json({
            error: "Failed to fetch news"
        });
    }
});

// Connect MongoDB before starting the server
const startServer = async () => {
    try {
        await connectDB();

        const PORT = process.env.PORT || 5000;

        app.listen(PORT, () => {
            console.log(`CityPulse backend running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("Failed to start CityPulse:", error.message);
        process.exit(1);
    }
};

startServer();
