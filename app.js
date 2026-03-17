import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import cors from "cors";
import authRoutes from './routes/authRoute.js'
import categoryRoutes from './routes/categoryRoutes.js'
import productRoutes from './routes/productRoutes.js'

// configure env
dotenv.config();

const app = express();

// middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/product", productRoutes);

// rest api

app.get('/', (req, res) => {
    res.send("<h1>Welcome to ecommerce app</h1>");
});

export default app;