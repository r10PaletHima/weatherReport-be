const express = require("express");
const axios = require("axios");
const auth = require("../middleware/auth");
const pool = require("../models/db");
const router = express.Router();

// Function to get geolocation from IP
const getGeoLocationFromIP = async (ip) => {
  const apiKey = process.env.GEOLOCATION_API_KEY; // Set this in your .env file
  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}`);
    if (response.data.status === "fail") {
      return { latitude: null, longitude: null };
    }
    const { lat, lon } = response.data;
    return { latitude: lat, longitude: lon };
  } catch (error) {
    console.error("Error fetching geolocation:", error);
    return { latitude: null, longitude: null };
  }
};

// Fetch weather data
router.get("/weather", auth, async (req, res) => {
  const { city, lat, lon } = req.query;
  const userId = req.user.id;
  const apiKey = process.env.WEATHER_API_KEY;

  try {
    const query = city || `${lat},${lon}`;
    const baseUrl = `http://api.weatherstack.com/current`;
    const response = await axios.get(baseUrl, {
      params: {
        access_key: apiKey,
        query: query,
      },
    });

    // Capture IP address from the request object
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    // Get latitude and longitude based on IP
    const { latitude, longitude } = await getGeoLocationFromIP(ip);

    // Log the search
    await pool.execute(
      "INSERT INTO logs (user_id, query, latitude, longitude) VALUES (?, ?, ?, ?)",
      [userId, query, latitude, longitude]
    );

    res.json(response.data);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching weather data", error: err.message });
  }
});

// Fetch search logs
router.get("/logs", auth, async (req, res) => {
  try {
    // Fetch all logs with user information
    const [logs] = await pool.execute(
      `SELECT 
         logs.id as log_id, 
         logs.query as log_query, 
         logs.timestamp as log_timestamp, 
         logs.latitude, 
         logs.longitude,
         users.username as user_username,
         users.first_name as user_first_name,
         users.last_name as user_last_name,
         users.email as user_email
       FROM logs
       JOIN users ON logs.user_id = users.id`
    );

    // If no logs are found, return an empty array
    if (logs.length === 0) {
      return res.status(404).json({ message: "No logs found" });
    }

    // Return the logs in the response
    res.json({
      logs, // All logs with user information
    });
  } catch (err) {
    res.status(500).json({
      message: "Error fetching logs",
      error: err.message,
    });
  }
});

module.exports = router;
