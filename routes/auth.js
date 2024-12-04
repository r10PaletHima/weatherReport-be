const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../models/db");
const router = express.Router();

// Signup route
router.post("/signup", async (req, res) => {
  const { username, password, email, firstName, lastName, phoneNumber } =
    req.body;

  // Validate the input data
  if (!username || !password || !email) {
    return res
      .status(400)
      .json({ message: "Username, password, and email are required" });
  }

  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    const [result] = await pool.execute(
      "INSERT INTO users (username, password, email, first_name, last_name, phone_number) VALUES (?, ?, ?, ?, ?, ?)",
      [username, hashedPassword, email, firstName, lastName, phoneNumber]
    );

    // Send the response
    res.status(201).json({ message: "User created", userId: result.insertId });
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error });
  }
});

// Login route
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const [users] = await pool.execute(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );
    if (users.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user = users[0];
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Error logging in", error });
  }
});

module.exports = router;
