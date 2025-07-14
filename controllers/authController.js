const User = require("../models/User");
const { generateToken } = require("../utils/generateToken");
const bcrypt = require("bcrypt");
const { sendEmail } = require("../utils/sendEmail");

const registerUser = async (req, res) => {
  const {
    firstName, lastName, email, password,
    role, age, country,
    interests, customInterest, handsOnPractice, remoteLabAccess
  } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      firstName, lastName, email,
      password: hashedPassword,
      role, age, country,
      interests, customInterest, handsOnPractice, remoteLabAccess
    });

    const html = `
      <h2>Welcome to ForthTech, ${firstName}!</h2>
      <p>Your account has been created with the following details:</p>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Password:</strong> ${password}</li>
      </ul>
      <p>Please keep this information safe.</p>
      <p>Happy learning!</p>
    `;

    await sendEmail(
      email,
      "Welcome to ForthTech - Your Account Details",
      html
    );

    res.status(201).json({
      _id: user._id,
      firstName: user.firstName,
      email: user.email,
      role: user.role,
      message: "Registered successfully. Please check your email for login details."
    });
  } catch (err) {
    console.error("Registration failed:", err);
    res.status(500).json({ message: "Server error. Please try again." });
  }
};

const loginUser = async (req, res) => {
  const { email, password, role } = req.body;

  const user = await User.findOne({ email });

  if (user && await bcrypt.compare(password, user.password)) {
    if (role && user.role !== role) {
      return res.status(401).json({ message: "Role mismatch" });
    }

    const token = generateToken(user._id);
    user.token = token;
    await user.save();

    return res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      profileImage:user.profileImage,
      token
    });
  } else {
    res.status(401).json({ message: "Invalid email or password" });
  }
};

module.exports = {
  registerUser,
  loginUser
};