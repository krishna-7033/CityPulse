
const express = require("express");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const User = require("../models/User");

const router = express.Router();
const googleClient = new OAuth2Client();

router.post("/google", async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                message: "Google credential is required",
            });
        }

        if (!process.env.GOOGLE_CLIENT_ID || !process.env.JWT_SECRET) {
            return res.status(500).json({
                message: "Authentication is not configured",
            });
        }

        // Verify the credential with Google
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload || !payload.sub || !payload.email || !payload.email_verified) {
            return res.status(401).json({
                message: "Google account could not be verified",
            });
        }

        const googleId = payload.sub;
        const email = payload.email.toLowerCase();
        const name = payload.name || email.split("@")[0];
        const profilePicture = payload.picture || "";

        // Find an existing Google account
        let user = await User.findOne({ googleId });

        if (!user) {
            // Don't automatically link a password account by email alone
            const existingEmailUser = await User.findOne({ email });

            if (existingEmailUser) {
                return res.status(409).json({
                    message:
                        "An account with this email already exists. Sign in using your existing method first.",
                });
            }

            user = await User.create({
                googleId,
                name,
                email,
                profilePicture,
            });
        }

        const token = jwt.sign(
            { id: user._id.toString() },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.json({
            message: "Google sign-in successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture || "",
                lastSearchedTopic: user.lastSearchedTopic,
                preferences: user.preferences,
                subscription: user.subscription,
            },
        });
    } catch (error) {
        console.error("Google authentication error:", error.message);

        return res.status(401).json({
            message: "Google authentication failed",
        });
    }
});

const authMiddleware = require("../middleware/authMiddleware");

// Restore the logged-in user's profile
router.get("/me", authMiddleware, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        return res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                profilePicture: user.profilePicture || "",
                lastSearchedTopic: user.lastSearchedTopic,
                preferences: user.preferences,
                subscription: user.subscription,
            },
        });
    } catch (error) {
        console.error("Profile retrieval error:", error);

        return res.status(500).json({
            message: "Failed to retrieve profile",
        });
    }
});


module.exports = router;
