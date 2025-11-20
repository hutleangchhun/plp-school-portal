import React from "react";

export default function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
    className="bg-white rounded-sm border border-gray-200 p-4"  
    >
      <p className="text-base font-semibold text-gray-700">{label}</p>

      {payload.map((entry, index) => (
        <div key={index} style={{ marginTop: 4 }}>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              backgroundColor: entry.color,
              borderRadius: "50%",
              marginRight: 8
            }}
          ></span>
          <span className="text-sm text-gray-700">
            {entry.name}: <strong>{entry.value}</strong>
          </span>
        </div>
      ))}
    </div>
  );
}
