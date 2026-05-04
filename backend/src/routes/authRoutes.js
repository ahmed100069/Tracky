import { Router } from "express";
import { login, loginValidation, signup, signupValidation } from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post("/signup", signupValidation, validate, signup);
router.post("/login", loginValidation, validate, login);

export default router;
