const { GoogleGenerativeAI } = require("@google/generative-ai");
const { randomUUID } = require("crypto");

/**
 * AI Triage Service — Gemini-first with deterministic fallback.
 */

// Keywords that indicate higher severity
const SEVERITY_KEYWORDS = {
  extreme: [
    "cardiac arrest",
    "not breathing",
    "unconscious",
    "severe bleeding",
    "heart attack",
    "drowning",
    "electrocution",
    "gunshot",
    "stabbing",
    "multiple victims",
    "collapsed building",
  ],
  critical: [
    "chest pain",
    "difficulty breathing",
    "stroke symptoms",
    "severe burn",
    "head injury",
    "spinal injury",
    "allergic reaction",
    "seizure",
    "choking",
    "poisoning",
  ],
  high: [
    "fracture",
    "deep cut",
    "fall from height",
    "moderate burn",
    "asthma attack",
    "diabetic emergency",
    "high fever",
    "abdominal pain",
  ],
  moderate: [
    "minor burn",
    "sprain",
    "minor cut",
    "dizziness",
    "nausea",
    "mild pain",
    "anxiety",
  ],
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
  5: "critical_care",
  4: "critical_care",
  3: "advanced",
  2: "basic",
  1: "basic",
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

  if (
    Number.isFinite(parsed.spo2) &&
    parsed.spo2 <= VITAL_THRESHOLDS.critical.spo2Max
  ) {
    inferredSeverity = Math.max(inferredSeverity, 5);
    indicators.push(`low oxygen saturation (${parsed.spo2})`);
  } else if (
    Number.isFinite(parsed.spo2) &&
    parsed.spo2 <= VITAL_THRESHOLDS.high.spo2Max
  ) {
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

const EQUIPMENT_ENUM = new Set(["basic", "advanced", "critical_care"]);
const RESPONSE_LEVEL_ENUM = new Set(["STANDARD", "URGENT", "IMMEDIATE"]);

const TRIAGE_LOG_PREFIX = "[AI-TRIAGE]";
const DEFAULT_GEMINI_MODEL_CANDIDATES = [
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.5-flash-8b",
];

const shouldDebugLog = () => {
  const raw = String(process.env.TRIAGE_DEBUG || "")
    .toLowerCase()
    .trim();
  return ["1", "true", "yes", "on"].includes(raw);
};

const triageLog = (level, context, extra = {}) => {
  const payload = {
    at: new Date().toISOString(),
    ...context,
    ...extra,
  };
  const line = `${TRIAGE_LOG_PREFIX} ${JSON.stringify(payload)}`;

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  if (shouldDebugLog()) {
    console.log(line);
  }
};

const previewText = (value = "", limit = 220) => {
  const compact = String(value || "").replace(/\s+/g, " ").trim();
  if (compact.length <= limit) return compact;
  return `${compact.slice(0, limit)}...`;
};

const getModelCandidates = () => {
  const primary = String(process.env.GEMINI_MODEL || "").trim();
  const fromList = String(process.env.GEMINI_MODEL_CANDIDATES || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return Array.from(
    new Set([primary, ...fromList, ...DEFAULT_GEMINI_MODEL_CANDIDATES]),
  ).filter(Boolean);
};

const coerceNumber = (value, min, max, fallback) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
};

const toStringArray = (value, limit = 8) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, limit);
};

const normalizeRoleGuidance = (value = {}) => {
  return {
    userSteps: toStringArray(value?.userSteps, 10),
    ambulanceChecklist: toStringArray(value?.ambulanceChecklist, 10),
    hospitalPrep: toStringArray(value?.hospitalPrep, 10),
    requiredDoctorSpecialties: toStringArray(
      value?.requiredDoctorSpecialties,
      8,
    ),
    likelyTreatments: toStringArray(value?.likelyTreatments, 8),
  };
};

const normalizeGeminiPayload = (raw, fallback) => {
  const severity = coerceNumber(raw?.severity, 1, 5, fallback.severity);
  const confidence = coerceNumber(raw?.confidence, 0, 1, fallback.confidence);
  const recommendedEquipment = EQUIPMENT_ENUM.has(raw?.recommendedEquipment)
    ? raw.recommendedEquipment
    : fallback.recommendedEquipment;
  const responseLevel = RESPONSE_LEVEL_ENUM.has(raw?.responseLevel)
    ? raw.responseLevel
    : fallback.responseLevel;

  const bedType =
    raw?.hospitalPreferences?.bedType === "icu" ? "icu" : "general";

  return {
    severity,
    severityLabel:
      String(raw?.severityLabel || "").trim() ||
      ["", "Low", "Moderate", "High", "Critical", "Extreme"][severity],
    confidence: Math.round(confidence * 100) / 100,
    reasoning: String(raw?.reasoning || fallback.reasoning || "").trim(),
    responseLevel,
    recommendedEquipment,
    matchedIndicators: toStringArray(raw?.matchedIndicators, 12),
    recommendedProtocols: toStringArray(raw?.recommendedProtocols, 8),
    potentialComplications: toStringArray(raw?.potentialComplications, 8),
    hospitalPreferences: {
      requiredSpecialties: toStringArray(
        raw?.hospitalPreferences?.requiredSpecialties,
        8,
      ),
      treatmentCapabilities: toStringArray(
        raw?.hospitalPreferences?.treatmentCapabilities,
        8,
      ),
      bedType,
    },
    roleGuidance: normalizeRoleGuidance(raw?.roleGuidance || {}),
  };
};

const extractJsonFromGeminiText = (text) => {
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    // Ignore and try markdown fenced JSON extraction below.
  }

  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) {
    try {
      return JSON.parse(fenced[1]);
    } catch {
      return null;
    }
  }

  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    try {
      return JSON.parse(text.slice(firstBrace, lastBrace + 1));
    } catch {
      return null;
    }
  }

  return null;
};

const getGeminiPrompt = ({ type, description, vitals }) => {
  return [
    "You are an emergency triage model for a live ambulance dispatch system.",
    "Return ONLY valid JSON. No markdown or prose outside JSON.",
    "",
    "Input:",
    `- emergencyType: ${type || "other"}`,
    `- description: ${String(description || "").trim() || "N/A"}`,
    `- vitals: ${JSON.stringify(vitals || {})}`,
    "",
    "JSON schema:",
    "{",
    '  "severity": 1-5,',
    '  "severityLabel": "Low|Moderate|High|Critical|Extreme",',
    '  "confidence": 0-1,',
    '  "reasoning": "short clinical summary",',
    '  "responseLevel": "STANDARD|URGENT|IMMEDIATE",',
    '  "recommendedEquipment": "basic|advanced|critical_care",',
    '  "matchedIndicators": ["string"],',
    '  "recommendedProtocols": ["string"],',
    '  "potentialComplications": ["string"],',
    '  "hospitalPreferences": {',
    '    "requiredSpecialties": ["string"],',
    '    "treatmentCapabilities": ["string"],',
    '    "bedType": "general|icu"',
    "  },",
    '  "roleGuidance": {',
    '    "userSteps": ["string"],',
    '    "ambulanceChecklist": ["string"],',
    '    "hospitalPrep": ["string"],',
    '    "requiredDoctorSpecialties": ["string"],',
    '    "likelyTreatments": ["string"]',
    "  }",
    "}",
    "",
    "Rules:",
    "- Prioritize severe breathing/cardiac/neuro red flags.",
    "- Keep recommendations operational for ambulance + hospital teams.",
    "- Confidence must reflect ambiguity in description/vitals.",
  ].join("\n");
};

const classifyEmergencyRuleBased = (type, description = "", options = {}) => {
  const desc = String(description || "").toLowerCase();

  // Start with base severity from type
  let severity = TYPE_BASE_SEVERITY[type] || 2;
  let matchedKeywords = [];

  // Scan description for severity keywords
  for (const [level, keywords] of Object.entries(SEVERITY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (desc.includes(keyword)) {
        matchedKeywords.push({ keyword, level });
        const keywordSeverity =
          level === "extreme"
            ? 5
            : level === "critical"
              ? 4
              : level === "high"
                ? 3
                : 2;
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
  const responseLevel =
    severity >= 4 ? "IMMEDIATE" : severity >= 3 ? "URGENT" : "STANDARD";
  const reasoning = generateReasoning(
    type,
    severity,
    matchedKeywords,
    vitalsInference.indicators,
  );

  return {
    severity,
    severityLabel: ["", "Low", "Moderate", "High", "Critical", "Extreme"][
      severity
    ],
    confidence: Math.round(confidence * 100) / 100,
    reasoning,
    responseLevel,
    recommendedEquipment: EQUIPMENT_RECOMMENDATION[severity],
    matchedIndicators: [
      ...matchedKeywords.map((k) => k.keyword),
      ...vitalsInference.indicators,
    ],
    recommendedProtocols:
      severity >= 4
        ? [
            "Activate critical transport protocol",
            "Pre-alert nearest capable hospital",
          ]
        : ["Stabilize patient and monitor vitals continuously"],
    potentialComplications:
      severity >= 4
        ? ["Respiratory failure", "Hemodynamic instability"]
        : ["Condition escalation if delayed"],
    hospitalPreferences: {
      requiredSpecialties:
        type === "cardiac"
          ? ["Cardiology", "Critical Care"]
          : type === "stroke"
            ? ["Neurology", "Critical Care"]
            : ["Emergency Medicine"],
      treatmentCapabilities:
        severity >= 4
          ? ["Advanced airway", "Critical care stabilization"]
          : ["Emergency stabilization"],
      bedType: severity >= 4 ? "icu" : "general",
    },
    roleGuidance: {
      userSteps:
        severity >= 4
          ? [
              "Keep patient airway open and monitor breathing continuously",
              "Do not give food or water",
              "Keep emergency contact ready and clear the path for responders",
            ]
          : [
              "Keep patient calm and seated or in recovery position",
              "Monitor symptoms and avoid unnecessary movement",
            ],
      ambulanceChecklist:
        severity >= 4
          ? [
              "Carry advanced airway kit and oxygen support",
              "Prepare cardiac monitor and rapid stabilization drugs",
              "Coordinate with receiving hospital for immediate handoff",
            ]
          : [
              "Carry standard trauma and vitals monitoring kit",
              "Prepare basic stabilization supplies",
            ],
      hospitalPrep:
        severity >= 4
          ? [
              "Alert emergency and critical care teams",
              "Prepare ICU triage bay and rapid diagnostics",
            ]
          : ["Prepare emergency intake bay and baseline monitoring"],
      requiredDoctorSpecialties:
        type === "cardiac"
          ? ["Cardiologist", "Emergency Physician"]
          : type === "stroke"
            ? ["Neurologist", "Emergency Physician"]
            : ["Emergency Physician"],
      likelyTreatments:
        severity >= 4
          ? ["Advanced stabilization", "Critical care admission"]
          : ["Emergency observation and stabilization"],
    },
    traceId: String(options?.traceId || ""),
    timestamp: new Date().toISOString(),

    // Mark this as the integration point for Gemini API
    // In production: replace classifyEmergency() with a call to
    // Gemini API: POST https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent
    aiModel: "ResQNet-Triage-v1 (Rule-based fallback)",
  };
};

const classifyEmergency = async (type, description = "", options = {}) => {
  const traceId = String(options?.traceId || randomUUID());
  const fallback = classifyEmergencyRuleBased(type, description, {
    ...options,
    traceId,
  });
  const apiKey = process.env.GEMINI_API_KEY;
  const modelCandidates = getModelCandidates();
  const hasVitals =
    options?.vitals && typeof options.vitals === "object"
      ? Object.keys(options.vitals).length > 0
      : false;
  const context = {
    traceId,
    event: "triage",
    emergencyType: type || "other",
    descriptionLength: String(description || "").trim().length,
    hasVitals,
    hasApiKey: Boolean(apiKey),
    candidates: modelCandidates,
  };

  triageLog("info", context, { status: "start" });

  if (!apiKey) {
    triageLog("warn", context, {
      status: "fallback",
      reason: "GEMINI_API_KEY missing",
      model: fallback.aiModel,
    });
    return fallback;
  }

  if (!modelCandidates.length) {
    triageLog("warn", context, {
      status: "fallback",
      reason: "No Gemini models configured",
      model: fallback.aiModel,
    });
    return {
      ...fallback,
      aiModel: "Gemini (config-fallback)",
    };
  }

  try {
    const client = new GoogleGenerativeAI(apiKey);

    const prompt = getGeminiPrompt({
      type,
      description,
      vitals: options?.vitals || {},
    });
    const attemptErrors = [];

    for (const modelName of modelCandidates) {
      triageLog("info", context, {
        status: "model-attempt",
        model: modelName,
      });

      try {
        const model = client.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        const text = result?.response?.text?.() || "";
        const parsed = extractJsonFromGeminiText(text);

        triageLog("info", context, {
          status: "gemini-response",
          model: modelName,
          textLength: text.length,
          parsed: Boolean(parsed),
          preview: previewText(text),
        });

        if (!parsed) {
          attemptErrors.push(`${modelName}: parse-failed`);
          continue;
        }

        const normalized = normalizeGeminiPayload(parsed, fallback);

        triageLog("info", context, {
          status: "success",
          model: modelName,
          severity: normalized.severity,
          confidence: normalized.confidence,
        });

        return {
          ...normalized,
          traceId,
          timestamp: new Date().toISOString(),
          aiModel: modelName,
        };
      } catch (error) {
        attemptErrors.push(`${modelName}: ${error?.message || "unknown"}`);
        triageLog("warn", context, {
          status: "model-attempt-failed",
          model: modelName,
          error: error?.message || "unknown",
        });
      }
    }

    const parseOnlyFailures = attemptErrors.every((entry) =>
      entry.endsWith("parse-failed"),
    );

    triageLog("warn", context, {
      status: "fallback",
      reason: parseOnlyFailures
        ? "Unable to parse Gemini JSON payload"
        : "All Gemini model attempts failed",
      attempts: attemptErrors,
    });

    return {
      ...fallback,
      traceId,
      aiModel: parseOnlyFailures
        ? `${modelCandidates[0]} (parse-fallback)`
        : `${modelCandidates[0]} (error-fallback)`,
    };
  } catch (error) {
    triageLog("error", context, {
      status: "fallback",
      reason: "Gemini request failed",
      error: error?.message || "unknown",
    });
    return {
      ...fallback,
      traceId,
      aiModel: `${modelCandidates[0] || "Gemini"} (error-fallback)`,
    };
  }
};

function generateReasoning(type, severity, keywords, vitalsIndicators = []) {
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  let reasoning = `Emergency type "${typeLabel}" classified as severity ${severity}/5. `;

  if (keywords.length > 0) {
    reasoning += `Detected critical indicators: ${keywords.map((k) => `"${k.keyword}"`).join(", ")}. `;
  }

  if (vitalsIndicators.length > 0) {
    reasoning += `Vitals risk factors: ${vitalsIndicators.join(", ")}. `;
  }

  if (severity >= 4) {
    reasoning +=
      "Recommending critical care ambulance with advanced life support equipment. Immediate hospital notification required.";
  } else if (severity >= 3) {
    reasoning += "Recommending advanced ambulance. Priority routing enabled.";
  } else {
    reasoning +=
      "Standard response protocol. Basic life support unit sufficient.";
  }

  return reasoning;
}

module.exports = { classifyEmergency };
