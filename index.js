const express = require("express");
const cors = require("cors");
const router = require("./src/routes/");
require("dotenv").config();
const connectDB = require("./config/dbConnection");
const { template } = require("./src/model");

// security
const mongoSanitize = require("express-mongo-sanitize");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const xss = require("xss-clean");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// register upload paths
app.use("/uploads", express.static(__dirname + "uploads"));

app.set("trust proxy", 1);
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

app.use(mongoSanitize());
app.use(limiter);
app.use(helmet());
app.use(xss());

app.use("/api/v1", router);
app.get("/", async (req, res) => {
  res.send(template);
});

const port = process.env.PORT;

connectDB();
app.listen(port, () => console.debug(`Server running on port: ${port}`));
