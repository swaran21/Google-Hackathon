/**
 * AI Triage Service — Emergency Severity Classification
 *
 * In a real production system, this would call Google Gemini API.
 * For the hackathon, we use a sophisticated rule-based classifier
 * that mimics AI output format. The Gemini API integration point
 * is clearly marked for future upgrade.
 *
 * Severity Levels:
 *   1 - Low       (non-urgent, can wait)
 *   2 - Moderate  (needs attention within 30 min)
 *   3 - High      (needs attention within 15 min)
 *   4 - Critical  (life-threatening, needs immediate response)
 *   5 - Extreme   (mass casualty / cardiac arrest / severe trauma)
 */

// Keywords that indicate higher severity
const SEVERITY_KEYWORDS = {
  extreme: ['cardiac arrest', 'not breathing', 'unconscious', 'severe bleeding', 'heart attack', 'drowning', 'electrocution', 'gunshot', 'stabbing', 'multiple victims', 'collapsed building'],
  critical: ['chest pain', 'difficulty breathing', 'stroke symptoms', 'severe burn', 'head injury', 'spinal injury', 'allergic reaction', 'seizure', 'choking', 'poisoning'],
  high: ['fracture', 'deep cut', 'fall from height', 'moderate burn', 'asthma attack', 'diabetic emergency', 'high fever', 'abdominal pain'],
  moderate: ['minor burn', 'sprain', 'minor cut', 'dizziness', 'nausea', 'mild pain', 'anxiety'],
};

// Base severity by emergency type
const TYPE_BASE_SEVERITY = {
  cardiac: 5,
  stroke: 5,
  breathing: 4,
  accident: 3,
  fire: 4,
  flood: 3,
  other: 2,
};

// Equipment recommendation based on severity
const EQUIPMENT_RECOMMENDATION = {
  5: 'critical_care',
  4: 'critical_care',
  3: 'advanced',
  2: 'basic',
  1: 'basic',
};

/**
 * Classify emergency severity based on type and description.
 *
 * @param {string} type - Emergency type (cardiac, accident, etc.)
 * @param {string} description - Free text description
 * @returns {Object} { severity, confidence, reasoning, recommendedEquipment, responseLevel }
 */
const VITAL_THRESHOLDS = {
  critical: {
    spo2Max: 90,
    systolicBpMax: 90,
    heartRateMin: 40,
    heartRateMax: 130,
  },
  high: {
    spo2Max: 94,
    systolicBpMax: 100,
    heartRateMin: 50,
    heartRateMax: 120,
  },
};

const parseVitals = (vitals = {}) => ({
  heartRate: Number(vitals?.heartRate),
  spo2: Number(vitals?.spo2),
  systolicBp: Number(vitals?.systolicBp),
});

const inferVitalsSeverity = (vitals = {}) => {
  const parsed = parseVitals(vitals);

  let inferredSeverity = 1;
  const indicators = [];

  if (Number.isFinite(parsed.spo2) && parsed.spo2 <= VITAL_THRESHOLDS.critical.spo2Max) {
    inferredSeverity = Math.max(inferredSeverity, 5);
    indicators.push(`low oxygen saturation (${parsed.spo2})`);
  } else if (Number.isFinite(parsed.spo2) && parsed.spo2 <= VITAL_THRESHOLDS.high.spo2Max) {
    inferredSeverity = Math.max(inferredSeverity, 4);
    indicators.push(`reduced oxygen saturation (${parsed.spo2})`);
  }

  if (
    Number.isFinite(parsed.systolicBp) &&
    parsed.systolicBp <= VITAL_THRESHOLDS.critical.systolicBpMax
  ) {
    inferredSeverity = Math.max(inferredSeverity, 5);
    indicators.push(`low systolic BP (${parsed.systolicBp})`);
  } else if (
    Number.isFinite(parsed.systolicBp) &&
    parsed.systolicBp <= VITAL_THRESHOLDS.high.systolicBpMax
  ) {
    inferredSeverity = Math.max(inferredSeverity, 4);
    indicators.push(`borderline systolic BP (${parsed.systolicBp})`);
  }

  if (
    Number.isFinite(parsed.heartRate) &&
    (parsed.heartRate <= VITAL_THRESHOLDS.critical.heartRateMin ||
      parsed.heartRate >= VITAL_THRESHOLDS.critical.heartRateMax)
  ) {
    inferredSeverity = Math.max(inferredSeverity, 5);
    indicators.push(`critical heart rate (${parsed.heartRate})`);
  } else if (
    Number.isFinite(parsed.heartRate) &&
    (parsed.heartRate <= VITAL_THRESHOLDS.high.heartRateMin ||
      parsed.heartRate >= VITAL_THRESHOLDS.high.heartRateMax)
  ) {
    inferredSeverity = Math.max(inferredSeverity, 4);
    indicators.push(`elevated heart rate risk (${parsed.heartRate})`);
  }

  return {
    severity: inferredSeverity,
    indicators,
  };
};

const classifyEmergency = (type, description = '', options = {}) => {
  const desc = String(description || '').toLowerCase();

  // Start with base severity from type
  let severity = TYPE_BASE_SEVERITY[type] || 2;
  let matchedKeywords = [];

  // Scan description for severity keywords
  for (const [level, keywords] of Object.entries(SEVERITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (desc.includes(keyword)) {
        matchedKeywords.push({ keyword, level });
        const keywordSeverity = level === 'extreme' ? 5 : level === 'critical' ? 4 : level === 'high' ? 3 : 2;
        severity = Math.max(severity, keywordSeverity);
      }
    }
  }

  const vitalsInference = inferVitalsSeverity(options?.vitals || {});
  severity = Math.max(severity, vitalsInference.severity);

  // Clamp to 1-5
  severity = Math.min(5, Math.max(1, severity));

  // Calculate confidence (higher when more keywords matched)
  const confidence = Math.min(
    0.98,
    0.68 +
      matchedKeywords.length * 0.08 +
      vitalsInference.indicators.length * 0.05,
  );

  // Generate reasoning (mimics AI response format)
  const responseLevel = severity >= 4 ? 'IMMEDIATE' : severity >= 3 ? 'URGENT' : 'STANDARD';
  const reasoning = generateReasoning(
    type,
    severity,
    matchedKeywords,
    vitalsInference.indicators,
  );

  return {
    severity,
    severityLabel: ['', 'Low', 'Moderate', 'High', 'Critical', 'Extreme'][severity],
    confidence: Math.round(confidence * 100) / 100,
    reasoning,
    responseLevel,
    recommendedEquipment: EQUIPMENT_RECOMMENDATION[severity],
    matchedIndicators: [
      ...matchedKeywords.map((k) => k.keyword),
      ...vitalsInference.indicators,
    ],
    timestamp: new Date().toISOString(),

    // Mark this as the integration point for Gemini API
    // In production: replace classifyEmergency() with a call to
    // Gemini API: POST https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent
    aiModel: 'ResQNet-Triage-v1 (Rule-based | Gemini-ready)',
  };
};

function generateReasoning(type, severity, keywords, vitalsIndicators = []) {
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  let reasoning = `Emergency type "${typeLabel}" classified as severity ${severity}/5. `;

  if (keywords.length > 0) {
    reasoning += `Detected critical indicators: ${keywords.map((k) => `"${k.keyword}"`).join(', ')}. `;
  }

  if (vitalsIndicators.length > 0) {
    reasoning += `Vitals risk factors: ${vitalsIndicators.join(', ')}. `;
  }

  if (severity >= 4) {
    reasoning += 'Recommending critical care ambulance with advanced life support equipment. Immediate hospital notification required.';
  } else if (severity >= 3) {
    reasoning += 'Recommending advanced ambulance. Priority routing enabled.';
  } else {
    reasoning += 'Standard response protocol. Basic life support unit sufficient.';
  }

  return reasoning;
}

module.exports = { classifyEmergency };
