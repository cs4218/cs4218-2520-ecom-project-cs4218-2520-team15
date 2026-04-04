import express from "express";
import {
  checkSeededOrders,
  checkSeededUsers,
  seedDatabase,
  seedStressTestData,
  teardownDatabase,
} from "../controllers/testController.js";

const router = express.Router();

router.post("/seed", seedDatabase);
router.post("/seed/stress", seedStressTestData);
router.post("/teardown", teardownDatabase);
router.get("/users", checkSeededUsers);
router.get("/orders", checkSeededOrders);

export default router;
