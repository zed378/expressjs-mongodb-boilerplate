const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const usersSchema = new Schema(
  {
    username: {
      type: String,
      min: [3, "Make sure your usernama 3 letter long minimum"],
      max: [24, "Make sure your usernama 24 letter long maximum"],
      required: false,
    },
    firstName: {
      type: String,
      required: false,
    },
    lastName: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: false,
    },
    password: {
      type: String,
      required: false,
    },
    picture: {
      type: String,
      required: false,
      default: "default.svg",
    },
    role: {
      type: String,
      required: false,
      enum: ["Admin", "Authenticated"],
      default: "Authenticated",
    },
    isActive: {
      type: Boolean,
      required: false,
      default: false,
    },
    token: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

const userModel = mongoose.model("users", usersSchema);
module.exports = { userModel };
