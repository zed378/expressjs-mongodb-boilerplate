require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Import the mongoose module

    // Set `strictQuery: false` to globally opt into filtering by properties that aren't in the schema
    // Included because it removes preparatory warnings for Mongoose 7.
    // See: https://mongoosejs.com/docs/migrating_to_6.html#strictquery-is-removed-and-replaced-by-strict
    mongoose.set("strictQuery", false);

    // Define the database URL to connect to.
    const mongoDB = process.env.DB_URL;

    // Wait for database to connect, logging an error if there is a problem
    main().catch((err) => console.log(err));
    async function main() {
      await mongoose
        .connect(mongoDB, {
          useNewUrlParser: true,
        })
        .then(() => {
          console.log("Connected to the database!");
        })
        .catch((err) => {
          console.log("Cannot connect to the database!", err);
          process.exit();
        });
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports = connectDB;
