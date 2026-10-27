const express = require('express');
const router = express.Router();
const Train = require('../models/Train');
const { requireAuth } = require('../middleware/auth');

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/trains/stations - get distinct station list
router.get('/stations', requireAuth, async (req, res) => {
  try {
    const sources = await Train.distinct('source');
    const destinations = await Train.distinct('destination');
    const stationSet = new Set([...sources, ...destinations]);
    res.json({ stations: Array.from(stationSet).sort() });
  } catch (err) {
    console.error('Error fetching stations:', err);
    res.status(500).json({ message: 'Failed to retrieve stations.' });
  }
});

// GET /api/trains/search - Search matching trains
router.get('/search', requireAuth, async (req, res) => {
  try {
    const { source, destination, journeyDate } = req.query;

    if (!source || !source.trim()) {
      return res.status(400).json({ message: 'Source station is required.' });
    }

    if (!destination || !destination.trim()) {
      return res.status(400).json({ message: 'Destination station is required.' });
    }

    if (source.trim().toLowerCase() === destination.trim().toLowerCase()) {
      return res.status(400).json({ message: 'Source and destination stations cannot be the same.' });
    }

    const query = {
      source: { $regex: escapeRegex(source.trim()), $options: 'i' },
      destination: { $regex: escapeRegex(destination.trim()), $options: 'i' }
    };

    if (journeyDate && journeyDate.trim()) {
      // Match exact date or any date >= specified
      query.journeyDate = { $gte: journeyDate.trim() };
    }

    const trains = await Train.find(query).sort({ departureTime: 1 });

    return res.json(trains);
  } catch (err) {
    console.error('Train search error:', err);
    return res.status(500).json({ message: 'Server error while searching trains.' });
  }
});

// GET /api/trains - list all trains
router.get('/', requireAuth, async (req, res) => {
  try {
    const trains = await Train.find().sort({ createdAt: 1 });
    res.json(trains);
  } catch (err) {
    console.error('Error fetching trains:', err);
    res.status(500).json({ message: 'Failed to retrieve trains.' });
  }
});

// GET /api/trains/:id - single train details
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const train = await Train.findById(req.params.id);
    if (!train) {
      return res.status(404).json({ message: 'Train not found.' });
    }
    return res.json(train);
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(404).json({ message: 'Train not found.' });
    }
    console.error('Error fetching train by id:', err);
    return res.status(500).json({ message: 'Server error retrieving train details.' });
  }
});

// GET /api/trains/:id/status - Simulated operational status
router.get('/:id/status', requireAuth, async (req, res) => {
  try {
    const trainId = req.params.id;
    let train;

    // Try by MongoDB ID first, then by train number
    try {
      train = await Train.findById(trainId);
    } catch (_) {
      train = await Train.findOne({ trainNumber: trainId.toUpperCase() });
    }

    if (!train) {
      return res.status(404).json({ message: 'Train not found.' });
    }

    // Static route waypoints for known trains (demonstration data — not live GPS)
    const routeMap = {
      '12952': ['New Delhi', 'Mathura', 'Kota Junction', 'Vadodara', 'Mumbai Central'],
      '22436': ['New Delhi', 'Aligarh', 'Kanpur Central', 'Prayagraj', 'Varanasi'],
      '12007': ['Bangalore', 'Bangarapet', 'Jolarpettai', 'Katpadi', 'Chennai Central'],
      '12626': ['New Delhi', 'Bhopal', 'Nagpur', 'Chennai Central'],
      '12124': ['Pune', 'Lonavala', 'Kalyan', 'Dadar', 'Mumbai Central'],
      '20901': ['Mumbai Central', 'Surat', 'Vadodara', 'Ahmedabad'],
      '12245': ['Howrah', 'Kharagpur', 'Bhubaneswar', 'Visakhapatnam', 'Bangalore'],
      '12954': ['Mumbai Central', 'Surat', 'Vadodara', 'Kota Junction', 'New Delhi'],
      '12028': ['Chennai Central', 'Katpadi', 'Jolarpettai', 'Bangalore'],
      '12301': ['Howrah', 'Asansol', 'Gaya', 'Allahabad', 'Kanpur Central', 'New Delhi']
    };

    const routeStations = routeMap[train.trainNumber] || [train.source, 'Midway Point', train.destination];

    return res.json({
      trainId: train._id,
      trainNumber: train.trainNumber,
      trainName: train.trainName,
      source: train.source,
      destination: train.destination,
      departureTime: train.departureTime,
      arrivalTime: train.arrivalTime,
      journeyDate: train.journeyDate,
      status: train.status,
      currentStation: train.currentStation || train.source,
      delayMinutes: train.delayMinutes || 0,
      routeStations,
      dataSource: 'SIMULATED',
      dataSourceLabel: 'Simulated Train Operations Data (Not Live GPS)',
      lastUpdated: new Date().toISOString()
    });
  } catch (err) {
    console.error('Error fetching train status:', err);
    return res.status(500).json({ message: 'Server error retrieving train status.' });
  }
});

module.exports = router;
