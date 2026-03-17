import express from "express";
import { seedDatabase, teardownDatabase } from "../controllers/testController.js";

const router = express.Router();

router.post("/seed", seedDatabase);
router.post("/teardown", teardownDatabase);

export default router;