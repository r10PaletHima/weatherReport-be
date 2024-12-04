const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const pool = require('../models/db');
const router = express.Router();

// Fetch weather data
router.get('/weather', auth, async (req, res) => {
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

        // Log the search
        await pool.execute(
            'INSERT INTO logs (user_id, query) VALUES (?, ?)',
            [userId, query]
        );

        res.json(response.data);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching weather data', error: err.message });
    }
});

// Fetch search logs
router.get('/logs', auth, async (req, res) => {
    const userId = req.user.id;

    try {
        const [logs] = await pool.execute('SELECT * FROM logs WHERE user_id = ?', [userId]);
        res.json(logs);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching logs', error: err.message });
    }
});

module.exports = router;
