const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 80,
        },

        lastSearchedTopic: {
            type: String,
            default: "",
            trim: true,
            maxlength: 200,
        },

        googleId: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
        },
        
        profilePicture: {
            type: String,
            default: "",
        },


        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },


        password: {
            type: String,
            required: function () {
                return !this.googleId;
            },
            select: false,
        },


        preferences: {
            cities: { type: [String], default: [] },
            categories: { type: [String], default: [] },
            language: { type: String, default: "en" },
        },

        subscription: {
            plan: {
                type: String,
                enum: ["free", "plus"],
                default: "free",
            },

            status: {
                type: String,
                enum: [
                    "inactive",
                    "active",
                    "cancelled",
                    "expired",
                ],
                default: "inactive",
            },

            expiresAt: {
                type: Date,
                default: null,
            },
        },
    },
    { timestamps: true }
);

userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function (candidate) {
    return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);
