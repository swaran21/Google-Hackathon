import { useMemo, useState } from "react";

function formatCost(currency, amount) {
  if (!Number.isFinite(amount)) return "N/A";
  if (currency === "INR") {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  return `${currency} ${amount}`;
}

function renderHospitalCoordinates(entry) {
  const hospitalLat = entry?.hospital?.location?.coordinates?.[1];
  const hospitalLng = entry?.hospital?.location?.coordinates?.[0];
  if (Number.isFinite(hospitalLat) && Number.isFinite(hospitalLng)) {
    return `${hospitalLat.toFixed(4)}, ${hospitalLng.toFixed(4)}`;
  }

  return "Coordinates unavailable";
}

export default function HospitalSuggestionsPanel({
  suggestedHospitals,
  selectingHospitalId,
  onSelectHospital,
}) {
  const [sortField, setSortField] = useState("score");
  const [sortDirection, setSortDirection] = useState("desc");

  const recommendedHospitalEntry = useMemo(
    () => suggestedHospitals.find((entry) => entry.recommended),
    [suggestedHospitals],
  );

  const sortedHospitals = useMemo(() => {
    const list = [...(suggestedHospitals || [])];

    list.sort((a, b) => {
      const aCost = Number.isFinite(a.cheapestTreatmentCost)
        ? a.cheapestTreatmentCost
        : Number.POSITIVE_INFINITY;
      const bCost = Number.isFinite(b.cheapestTreatmentCost)
        ? b.cheapestTreatmentCost
        : Number.POSITIVE_INFINITY;

      let compare = 0;
      if (sortField === "distance") {
        compare = (a.distance || 0) - (b.distance || 0);
      } else if (sortField === "cost") {
        compare = aCost - bCost;
      } else {
        compare = (a.score || 0) - (b.score || 0);
      }

      return sortDirection === "asc" ? compare : -compare;
    });

    return list;
  }, [suggestedHospitals, sortField, sortDirection]);

  return (
    <div
      className="neu-card"
      style={{
        padding: "24px",
        borderRadius: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "16px" }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap" }}
      >
        <h3
          style={{
            fontSize: "12px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            color: "#22c55e" }}
        >
          Hospitals Within 5km Radius
        </h3>
        {recommendedHospitalEntry && (
          <span
            style={{
              padding: "6px 12px",
              borderRadius: "9999px",
              background: "var(--bg-card)",
              border: "1px solid var(--bg-card)",
              color: "#22c55e",
              fontSize: "10px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.12em" }}
          >
            Recommended: {recommendedHospitalEntry.hospital.name}
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap" }}
      >
        <span
          style={{
            fontSize: "10px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "var(--text-muted)" }}
        >
          Sort Hospitals
        </span>
        <select
          value={sortField}
          onChange={(e) => setSortField(e.target.value)}
          style={{
            borderRadius: "10px",
            border: "1px solid transparent",
            background: "var(--bg-input)",
            color: "var(--text-primary)",
            padding: "8px 10px",
            fontSize: "12px",
            fontWeight: 700,
            fontFamily: "var(--font-family)" }}
        >
          <option value="score">Recommended Score</option>
          <option value="distance">Distance</option>
          <option value="cost">Treatment Cost</option>
        </select>
        <button
          onClick={() =>
            setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
          }
          className="neu-button"
          style={{
            borderRadius: "10px",
            border: "1px solid transparent",
            background: "var(--bg-card)",
            color: "var(--text-secondary)",
            padding: "8px 12px",
            fontSize: "11px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontFamily: "var(--font-family)" }}
        >
          {sortDirection === "asc" ? "Asc ↑" : "Desc ↓"}
        </button>
      </div>

      {sortedHospitals.length === 0 ? (
        <div
          style={{
            padding: "16px",
            borderRadius: "14px",
            background: "var(--bg-card)",
            color: "var(--text-secondary)" }}
        >
          No hospitals in 5km matched the selected emergency problem category.
          Try another emergency type or update location.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {sortedHospitals.map((entry) => {
            const hospital = entry.hospital;
            const isSelecting = selectingHospitalId === hospital._id;
            const treatmentPreview = (entry.matchingTreatments || []).slice(
              0,
              3,
            );
            const lowestCost = Number.isFinite(entry.cheapestTreatmentCost)
              ? formatCost(
                  treatmentPreview[0]?.currency || "INR",
                  entry.cheapestTreatmentCost,
                )
              : null;

            return (
              <div
                key={hospital._id}
                style={{
                  padding: "16px",
                  borderRadius: "16px",
                  border: `1px solid ${entry.recommended ? "var(--bg-card)" : "transparent"}`,
                  background: entry.recommended
                    ? "var(--bg-card)"
                    : "var(--bg-card)" }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "16px",
                    flexWrap: "wrap" }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px" }}
                    >
                      <span style={{ fontSize: "1rem", fontWeight: 800 }}>
                        {hospital.name}
                      </span>
                      {entry.recommended && (
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            padding: "3px 8px",
                            borderRadius: "9999px",
                            background: "var(--bg-card)",
                            color: "#22c55e" }}
                        >
                          Best Match
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--text-secondary)" }}
                    >
                      {hospital.address}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontFamily: "monospace",
                        color: "var(--text-muted)" }}
                    >
                      Lat/Lng: {renderHospitalCoordinates(entry)}
                    </span>
                    {treatmentPreview.length > 0 ? (
                      <div
                        style={{
                          marginTop: "6px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px" }}
                      >
                        <span
                          style={{
                            fontSize: "10px",
                            color: "var(--text-muted)",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em" }}
                        >
                          Matching Treatments
                        </span>
                        {treatmentPreview.map((treatment) => (
                          <div
                            key={`${hospital._id}-${treatment.name}`}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: "10px",
                              fontSize: "11px",
                              color: "var(--text-secondary)" }}
                          >
                            <span>{treatment.name}</span>
                            <span style={{ fontWeight: 700 }}>
                              {formatCost(
                                treatment.currency,
                                treatment.costMin,
                              )}{" "}
                              -{" "}
                              {formatCost(
                                treatment.currency,
                                treatment.costMax,
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span style={{ fontSize: "11px", color: "#fca5a5" }}>
                        No mapped treatment-cost package for this emergency
                        type.
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "8px" }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 800,
                        color: "#3b82f6" }}
                    >
                      {entry.distance} km
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: lowestCost ? "#22c55e" : "var(--text-muted)" }}
                    >
                      {lowestCost ? `From ${lowestCost}` : "Cost unavailable"}
                    </span>
                    <button
                      onClick={() =>
                        onSelectHospital && onSelectHospital(hospital._id)
                      }
                      disabled={!!selectingHospitalId}
                      className="neu-button"
                      style={{
                        padding: "10px 14px",
                        borderRadius: "12px",
                        border: "none",
                        background: "#2563eb",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: "12px",
                        opacity: selectingHospitalId ? 0.7 : 1,
                        fontFamily: "var(--font-family)" }}
                    >
                      {isSelecting ? "Assigning..." : "Select Hospital"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
