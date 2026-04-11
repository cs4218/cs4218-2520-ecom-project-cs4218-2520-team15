import express from "express";
import { seedDatabase, teardownDatabase, checkSeededUsers, checkSeededOrders, seedPerformanceDatabase } from "../controllers/testController.js";

const router = express.Router();

router.post("/seed", seedDatabase);
router.post("/performance-seed", seedPerformanceDatabase);
router.post("/teardown", teardownDatabase);
router.get("/users", checkSeededUsers);
router.get("/orders", checkSeededOrders);

export default router;