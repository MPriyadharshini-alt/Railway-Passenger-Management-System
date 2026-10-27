// Exact Indian Railway Passenger Travel Classes and Price Ranges specified by user:
// Sleeper (SL): ₹200–₹600
// 3A: ₹500–₹1,200
// 2A: ₹800–₹1,800
// 1A: ₹1,200–₹2,500
// CC: ₹300–₹800
// EC: ₹700–₹1,500

export const TRAVEL_CLASSES = {
  SL: {
    code: 'SL',
    name: 'Sleeper',
    fullName: 'Sleeper Class (SL)',
    min: 200,
    max: 600,
    defaultFare: 420,
    rangeLabel: '₹200–₹600',
    description: 'Reserved non-AC berths with open windows'
  },
  '3A': {
    code: '3A',
    name: 'AC 3 Tier',
    fullName: 'AC 3 Tier (3A)',
    min: 500,
    max: 1200,
    defaultFare: 950,
    rangeLabel: '₹500–₹1,200',
    description: 'Air-conditioned 3-tier berths with complimentary bedding'
  },
  '2A': {
    code: '2A',
    name: 'AC 2 Tier',
    fullName: 'AC 2 Tier (2A)',
    min: 800,
    max: 1800,
    defaultFare: 1480,
    rangeLabel: '₹800–₹1,800',
    description: 'Spacious air-conditioned 2-tier curtained berths'
  },
  '1A': {
    code: '1A',
    name: 'AC 1st Class',
    fullName: 'AC First Class (1A)',
    min: 1200,
    max: 2500,
    defaultFare: 2200,
    rangeLabel: '₹1,200–₹2,500',
    description: 'Premium private lockable cabins and coupes'
  },
  CC: {
    code: 'CC',
    name: 'AC Chair Car',
    fullName: 'AC Chair Car (CC)',
    min: 300,
    max: 800,
    defaultFare: 560,
    rangeLabel: '₹300–₹800',
    description: 'Air-conditioned pushback seating for daytime express'
  },
  EC: {
    code: 'EC',
    name: 'Exec Chair Car',
    fullName: 'Executive Chair Car (EC)',
    min: 700,
    max: 1500,
    defaultFare: 1280,
    rangeLabel: '₹700–₹1,500',
    description: 'Premium spacious 2x2 executive seating with meals'
  }
};

// Returns standard classes configured for a specific train service
export function getAvailableClassesForTrain(train) {
  const name = (train?.trainName || '').toLowerCase();
  const isDayTrain = name.includes('vande bharat') || name.includes('shatabdi') || name.includes('deccan queen') || name.includes('intercity');
  
  if (isDayTrain) {
    return ['CC', 'EC'];
  }
  if (name.includes('rajdhani') || name.includes('duronto') || name.includes('tejas')) {
    return ['3A', '2A', '1A'];
  }
  return ['SL', '3A', '2A'];
}

// Computes calibrated class fare strictly bounded inside the exact user ranges
export function getFareForClass(train, classCode) {
  const cls = TRAVEL_CLASSES[classCode] || TRAVEL_CLASSES['SL'];
  const base = Number(train?.fare || cls.defaultFare);

  let computed = base;
  if (classCode === 'SL') {
    computed = Math.round(base * 0.45);
  } else if (classCode === '3A') {
    computed = Math.round(base);
  } else if (classCode === '2A') {
    computed = Math.round(base * 1.52);
  } else if (classCode === '1A') {
    computed = Math.round(base * 2.25);
  } else if (classCode === 'CC') {
    computed = Math.round(base);
  } else if (classCode === 'EC') {
    computed = Math.round(base * 2.05);
  }

  // Strictly clamp inside exact user defined range
  if (computed < cls.min) computed = cls.min;
  if (computed > cls.max) computed = cls.max;

  return computed;
}
