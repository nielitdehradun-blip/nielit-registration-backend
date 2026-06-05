const mongoose = require("mongoose");

const registerSchema = new mongoose.Schema(
    {
        studentId: {
            type: String,
            unique: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },

        age: {
            type: Number,
            required: true,
        },

        gender: {
            type: String,
            required: true,
        },

        city: {
            type: String,
            trim: true,
        },

        state: {
            type: String,
            trim: true,
        },

        address: {
            type: String,
            trim: true,
        },

        qualification: {
            type: String,
            trim: true,
        },

        phone: {
            type: String,
            required: true,
        },

        parentPhone: {
            type: String,
        },

        whatsapp: {
            type: String,
            required: true,
        },

        email: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
        },

        category: {
            type: String,
        },

        course: {
            type: String,
            required: true,
        },

        photo: {
            type: String,
            default: "",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model(
    "Register",
    registerSchema
);