const CLASS_MULTIPLIERS = {
  SL: 0.45,
  '3A': 1.0,
  '2A': 1.52,
  '1A': 2.25,
  CC: 1.0,
  EC: 2.05
};

const CLASS_RANGES = {
  SL: { min: 200, max: 600 },
  '3A': { min: 500, max: 1200 },
  '2A': { min: 800, max: 1800 },
  '1A': { min: 1200, max: 2500 },
  CC: { min: 300, max: 800 },
  EC: { min: 700, max: 1500 }
};

function calculateFare(baseFare, travelClass, seatCount) {
  const multiplier = CLASS_MULTIPLIERS[travelClass];
  const range = CLASS_RANGES[travelClass];
  if (!multiplier || !range) throw new Error('Unsupported travel class.');
  const unitFare = Math.min(range.max, Math.max(range.min, Math.round(baseFare * multiplier)));
  return Number((unitFare * seatCount).toFixed(2));
}

module.exports = { CLASS_MULTIPLIERS, calculateFare };
