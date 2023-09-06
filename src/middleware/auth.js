const jwt = require("jsonwebtoken");
require("dotenv").config();
const secret = process.env.SECRET;

exports.auth = (req, res, next) => {
  const authHeader = req.header("Authorization");
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(400).send({
      message: "Access Denied",
    });
  }

  try {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) {
        res.status(400).send({
          message: "Invalid Token. Relogin, please!",
        });
      } else {
        req.user = decoded;
        next();
      }
    });
  } catch (error) {
    res.status(400).send({
      message: "Invalid Token. Relogin, please!",
    });
  }
};
