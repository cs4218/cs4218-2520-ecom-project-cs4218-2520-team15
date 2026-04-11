import express from "express";
import { 
    seedDatabase, 
    teardownDatabase, 
    checkSeededUsers, 
    checkSeededOrders,
    seedSpikeDatabase,
    getSpikeTestUsers
} from "../controllers/testController.js";

const router = express.Router();

router.post("/seed", seedDatabase);
router.post("/teardown", teardownDatabase);
router.get("/users", checkSeededUsers);
router.get("/orders", checkSeededOrders);
router.post("/spike-seed", seedSpikeDatabase);
router.get("/spike-users", getSpikeTestUsers);

export default router;