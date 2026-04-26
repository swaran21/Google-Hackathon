const Hospital = require("../../models/Hospital");
const { haversine } = require("../../utils/haversine");

const TYPE_SPECIALTY_KEYWORDS = {
  cardiac: ["cardio", "heart"],
  stroke: ["neuro", "brain"],
  breathing: ["pulmo", "respiratory"],
  accident: ["trauma", "ortho", "surgery"],
  fire: ["burn", "trauma"],
  flood: ["emergency", "general medicine", "infectious"],
  other: ["emergency", "general"],
};

const TYPE_TREATMENT_KEYWORDS = {
  cardiac: ["cardiac", "heart", "angioplasty", "ecg", "icu"],
  stroke: ["stroke", "neurology", "ct", "thrombolysis", "neuro"],
  breathing: ["respiratory", "ventilation", "oxygen", "pulmonary"],
  accident: ["trauma", "fracture", "surgery", "orthopedic"],
  fire: ["burn", "skin graft", "critical care"],
  flood: ["infection", "fever", "dehydration", "emergency"],
  other: ["emergency", "general", "observation"],
};

class HospitalSuggestionService {
  constructor({ hospitalModel = Hospital, haversineFn = haversine } = {}) {
    this.hospitalModel = hospitalModel;
    this.haversineFn = haversineFn;
  }

  normalize(value) {
    return String(value || "")
      .toLowerCase()
      .trim();
  }

  tokenizeText(value = "") {
    return this.normalize(value)
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 2);
  }

  descriptionKeywords(description = "") {
    const tokens = this.tokenizeText(description);
    return Array.from(new Set(tokens)).slice(0, 40);
  }

  matchKeywordScore(candidates = [], keywords = []) {
    if (!keywords.length || !candidates.length) return 0;

    const normalizedCandidates = candidates.map((entry) => this.normalize(entry));
    const matched = keywords.filter((keyword) =>
      normalizedCandidates.some((candidate) => candidate.includes(keyword)),
    );

    if (!keywords.length) return 0;
    return matched.length / keywords.length;
  }

  hasSpecialtyMatch(specialties = [], type = "other") {
    const typeKeywords =
      TYPE_SPECIALTY_KEYWORDS[type] || TYPE_SPECIALTY_KEYWORDS.other;
    const normalized = specialties.map((specialty) =>
      this.normalize(specialty),
    );

    return normalized.some((specialty) =>
      typeKeywords.some((keyword) => specialty.includes(keyword)),
    );
  }

  treatmentMatchesType(treatment = {}, type = "other") {
    const treatmentTypes = Array.isArray(treatment.emergencyTypes)
      ? treatment.emergencyTypes.map((entry) => this.normalize(entry))
      : [];

    if (treatmentTypes.includes(this.normalize(type))) return true;
    if (this.normalize(type) === "other" && treatmentTypes.includes("other")) {
      return true;
    }

    const treatmentName = this.normalize(treatment.name);
    const typeKeywords =
      TYPE_TREATMENT_KEYWORDS[type] || TYPE_TREATMENT_KEYWORDS.other;

    return typeKeywords.some((keyword) => treatmentName.includes(keyword));
  }

  getMatchingTreatments(treatments = [], type = "other") {
    return treatments
      .filter((treatment) => this.treatmentMatchesType(treatment, type))
      .sort((a, b) => (a.costMin || 0) - (b.costMin || 0))
      .map((treatment) => ({
        name: treatment.name,
        emergencyTypes: treatment.emergencyTypes || [],
        costMin: treatment.costMin,
        costMax: treatment.costMax,
        currency: treatment.currency || "INR",
        notes: treatment.notes || "",
      }));
  }

  hospitalMatchesEmergencyCategory(hospital, type = "other") {
    const matchingTreatments = this.getMatchingTreatments(
      hospital.treatments,
      type,
    );
    const specialtyMatch = this.hasSpecialtyMatch(hospital.specialties, type);

    return specialtyMatch || matchingTreatments.length > 0;
  }

  scoreHospital(hospital, lat, lng, emergencyType, context = {}) {
    const [hLng, hLat] = hospital.location.coordinates;
    const distance = this.haversineFn(lat, lng, hLat, hLng);

    const proximityScore = 1 / (1 + distance);
    const bedScore =
      hospital.totalBeds > 0 ? hospital.availableBeds / hospital.totalBeds : 0;
    const icuScore =
      hospital.icuTotal > 0 ? hospital.icuAvailable / hospital.icuTotal : 0;

    const specialtyScore = this.hasSpecialtyMatch(
      hospital.specialties,
      emergencyType,
    )
      ? 1
      : 0;

    const matchingTreatments = this.getMatchingTreatments(
      hospital.treatments,
      emergencyType,
    );
    const treatmentScore = matchingTreatments.length > 0 ? 1 : 0;

    const cheapestTreatmentCost =
      matchingTreatments.length > 0
        ? Math.min(
            ...matchingTreatments.map((treatment) => treatment.costMin || 0),
          )
        : null;

    const averageTreatmentCost =
      matchingTreatments.length > 0
        ? Math.round(
            matchingTreatments.reduce(
              (sum, treatment) =>
                sum + ((treatment.costMin || 0) + (treatment.costMax || 0)) / 2,
              0,
            ) / matchingTreatments.length,
          )
        : null;

    const costScore =
      cheapestTreatmentCost === null
        ? 0.25
        : 1 / (1 + cheapestTreatmentCost / 100000);

    const triagePreferences = context.triageResult?.hospitalPreferences || {};
    const requiredSpecialties = Array.isArray(triagePreferences.requiredSpecialties)
      ? triagePreferences.requiredSpecialties
      : [];
    const treatmentCapabilities = Array.isArray(
      triagePreferences.treatmentCapabilities,
    )
      ? triagePreferences.treatmentCapabilities
      : [];
    const potentialComplications = Array.isArray(
      context.triageResult?.potentialComplications,
    )
      ? context.triageResult.potentialComplications
      : [];

    const hospitalSpecialties = Array.isArray(hospital.specialties)
      ? hospital.specialties
      : [];
    const hospitalTreatments = Array.isArray(hospital.treatments)
      ? hospital.treatments.map((entry) => entry.name || "")
      : [];

    const descriptionTokens = this.descriptionKeywords(context.description || "");

    const specialtyPreferenceScore = this.matchKeywordScore(
      hospitalSpecialties,
      requiredSpecialties.map((item) => this.normalize(item)),
    );

    const capabilityPreferenceScore = this.matchKeywordScore(
      hospitalTreatments,
      treatmentCapabilities.map((item) => this.normalize(item)),
    );

    const complicationPreparednessScore = this.matchKeywordScore(
      [...hospitalSpecialties, ...hospitalTreatments],
      potentialComplications.map((item) => this.normalize(item)),
    );

    const descriptionScore = this.matchKeywordScore(
      [...hospitalSpecialties, ...hospitalTreatments],
      descriptionTokens,
    );

    const score =
      0.25 * proximityScore +
      0.15 * bedScore +
      0.1 * icuScore +
      0.1 * specialtyScore +
      0.05 * treatmentScore +
      0.05 * costScore +
      0.12 * descriptionScore +
      0.08 * specialtyPreferenceScore +
      0.06 * capabilityPreferenceScore +
      0.04 * complicationPreparednessScore;

    return {
      hospital,
      distance: Math.round(distance * 100) / 100,
      score: Math.round(score * 1000) / 1000,
      proximityScore: Math.round(proximityScore * 1000) / 1000,
      bedScore: Math.round(bedScore * 1000) / 1000,
      icuScore: Math.round(icuScore * 1000) / 1000,
      specialtyScore,
      treatmentScore,
      costScore: Math.round(costScore * 1000) / 1000,
      descriptionScore: Math.round(descriptionScore * 1000) / 1000,
      specialtyPreferenceScore: Math.round(specialtyPreferenceScore * 1000) / 1000,
      capabilityPreferenceScore: Math.round(capabilityPreferenceScore * 1000) / 1000,
      complicationPreparednessScore:
        Math.round(complicationPreparednessScore * 1000) / 1000,
      matchingTreatments,
      cheapestTreatmentCost,
      averageTreatmentCost,
      coordinates: {
        latitude: Math.round(hLat * 1000000) / 1000000,
        longitude: Math.round(hLng * 1000000) / 1000000,
      },
    };
  }

  async suggestHospitals(lat, lng, type = "other", options = {}) {
    const emergencyType = this.normalize(type || "other");
    const radiusKm =
      typeof options.radiusKm === "number" ? options.radiusKm : null;
    const limit = typeof options.limit === "number" ? options.limit : 3;

    const hospitals = await this.hospitalModel.find({
      emergencyDepartment: true,
      isActive: true,
    });

    if (hospitals.length === 0) return [];

    const scopedHospitals = hospitals.filter((hospital) => {
      if (radiusKm === null) return true;
      const [hLng, hLat] = hospital.location.coordinates;
      const distance = this.haversineFn(lat, lng, hLat, hLng);
      return distance <= radiusKm;
    });

    if (scopedHospitals.length === 0) return [];

    const hasDescription = this.normalize(options.description || "").length > 0;

    const categoryMatchedHospitals = hasDescription
      ? scopedHospitals
      : scopedHospitals.filter((hospital) =>
          this.hospitalMatchesEmergencyCategory(hospital, emergencyType),
        );

    if (categoryMatchedHospitals.length === 0) return [];

    const scored = categoryMatchedHospitals
      .map((hospital) =>
        this.scoreHospital(hospital, lat, lng, emergencyType, {
          description: options.description || "",
          triageResult: options.triageResult || null,
        }),
      )
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map((entry, index) => ({
      ...entry,
      recommended: index === 0,
    }));
  }
}

module.exports = HospitalSuggestionService;
