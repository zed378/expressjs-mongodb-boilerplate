const express = require("express");

const router = express.Router();
// middleware
const { auth } = require("../middleware/auth");

const { getMessage, addMessage } = require("../controller");

const {
  register,
  login,
  logout,
  verify,
  activation,
  sendOTP,
  resetPassword,
} = require("../auth");
// auth
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify", verify);
router.get("/activation", activation);
router.post("/otp", sendOTP);
router.post("/reset", resetPassword);

const { updateUserName, updatePict } = require("../controller/user");
const { profileImg } = require("../middleware/upload");
// user
router.post("/username", auth, updateUserName);
router.post("/profile", auth, profileImg("picture"), updatePict);

// static respond / dummy api
router.get("/message", getMessage);
router.post("/add", addMessage);

module.exports = router;
