const HospitalSuggestionService = require("./hospital/HospitalSuggestionService");

const hospitalSuggestionService = new HospitalSuggestionService();

const suggestHospitals = (...args) =>
  hospitalSuggestionService.suggestHospitals(...args);

module.exports = {
  suggestHospitals,
  hospitalSuggestionService,
  HospitalSuggestionService,
};
