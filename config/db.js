import mongoose from "mongoose";
import colors from "colors";

const connectDB = async () => {
  try {
    const url =
      process.env.USE_TEST_DB == "true" && process.env.MONGO_TEST_URL
        ? process.env.MONGO_TEST_URL
        : process.env.MONGO_URL;
    const conn = await mongoose.connect(url);
    console.log(
      `Connected To Mongodb Database ${conn.connection.host}`.bgMagenta.white,
    );
  } catch (error) {
    console.log(`Error in Mongodb ${error}`.bgRed.white);
  }
};

export default connectDB;
