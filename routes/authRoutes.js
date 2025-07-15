const express = require("express");
const { body } = require("express-validator");
const { registerUser, loginUser, startFreeTrial,updateProfile } = require("../controllers/authController");
const validateRequest = require("../middlewares/validateRequest");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register",
  body("firstName").notEmpty(),
  body("lastName").notEmpty(),
  body("email").isEmail(),
  body("password").isLength({ min: 8 }),
  validateRequest,
  registerUser
);

router.post("/login",
  body("email").isEmail(),
  body("password").notEmpty(),
  validateRequest,
  loginUser
);

router.patch("/start-trial", protect, startFreeTrial);
router.patch("/profile", protect, updateProfile);
module.exports = router;
