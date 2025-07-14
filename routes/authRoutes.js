const express = require("express");
const { body } = require("express-validator");
const { registerUser, loginUser } = require("../controllers/authController");
const validateRequest = require("../middlewares/validateRequest");

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

module.exports = router;
