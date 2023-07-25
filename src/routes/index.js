const express = require("express");

const router = express.Router();

const { getMessage, addMessage } = require("../controller");

const { register, login, logout, verify, activation } = require("../auth");
// auth
router.post("/register", register);
router.post("/login", login);
router.post("/logout", logout);
router.post("/verify", verify);
router.get("/activation", activation);

const { updateUserName, updatePict } = require("../controller/user");
const { profileImg } = require("../middleware");
// user
router.post("/username", updateUserName);
router.post("/profile", profileImg("picture"), updatePict);

router.get("/message", getMessage);
router.get("/add", addMessage);

module.exports = router;
