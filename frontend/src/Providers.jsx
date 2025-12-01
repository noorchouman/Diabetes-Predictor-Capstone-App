// src/Providers.jsx
import React, { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";

/** 
 * NOTE: Doctors/providers are NOT saved in the database.
 * This is hardcoded demo data for demonstration purposes only.
 * In a production system, this would be fetched from a database or external API.
 */
const PROVIDERS = [
  {
    name: "Dr. Lina Haddad",
    specialty: "Endocrinology",
    city: "Beirut",
    zip: "1001",
    phone: "(01) 555-1030",
    address: "12 Hamra St., Beirut",
    website: "https://example.com/haddad",
  },
  {
    name: "Dr. Rami Khalil",
    specialty: "Internal Medicine",
    city: "Jounieh",
    zip: "2002",
    phone: "(09) 555-7742",
    address: "45 Sea Rd., Jounieh",
  },
  {
    name: "Dr. Rana Saade",
    specialty: "Family Medicine",
    city: "Beirut",
    zip: "1002",
    phone: "(01) 555-6621",
    address: "8 Verdun Ave., Beirut",
  },
  {
    name: "Dr. Omar Nassar",
    specialty: "Endocrinology",
    city: "Tripoli",
    zip: "3001",
    phone: "(06) 555-1123",
    address: "27 Mina Blvd., Tripoli",
  },
];

export default function Providers() {
  const [params] = useSearchParams();
  const seedCity = params.get("city") || "";
  const seedZip = params.get("zip") || "";

  // Initial query from URL, if present
  const [query, setQuery] = useState(seedCity || seedZip);

  const results = useMemo(() => {
    const q = (query || "").toLowerCase().trim();
    if (!q) return PROVIDERS;

    return PROVIDERS.filter((p) => {
      const name = p.name.toLowerCase();
      const city = p.city.toLowerCase();
      const zip = (p.zip || "").toLowerCase();
      const specialty = (p.specialty || "").toLowerCase();

      // 🔍 match if query is in name OR city OR zip OR specialty
      return (
        name.includes(q) ||
        city.includes(q) ||
        zip.includes(q) ||
        specialty.includes(q)
      );
    });
  }, [query]);

  return (
    <div className="max-w-5xl mx-auto px-5 py-10">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl md:text-3xl font-semibold">
          Find healthcare professionals
        </h1>
        <p className="text-gray-500 text-sm md:text-base">
          Search by city, ZIP/postal code, or doctor name.
        </p>
      </header>

      <div className="card p-4 md:p-5 mb-6">
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-center">
          <input
            className="input text-sm md:text-base"
            placeholder="e.g., Beirut, 1001, Endocrinology…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Link to="/" className="btn text-sm">
            ← Back to predictor
          </Link>
        </div>
        {query && (
          <p className="mt-2 text-xs text-gray-500">
            Showing matches for <span className="font-medium">“{query}”</span>.
          </p>
        )}
      </div>

      <div className="space-y-3">
        {results.map((p, i) => (
          <div key={i} className="card p-5 md:p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <p className="text-gray-600 text-sm">{p.specialty}</p>
                <p className="text-gray-600 text-sm">
                  {p.address} • {p.city}
                  {p.zip ? ` ${p.zip}` : ""}
                </p>
                {p.website && (
                  <a
                    className="text-sm text-blue-600 underline mt-1 inline-block"
                    href={p.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Website
                  </a>
                )}
              </div>
              <a
                className="btn btn-primary whitespace-nowrap"
                href={`tel:${p.phone.replace(/[^\d+]/g, "")}`}
              >
                Call {p.phone}
              </a>
            </div>
          </div>
        ))}

        {results.length === 0 && (
          <div className="card p-5 text-gray-500 text-sm">
            No providers match that search. Try another city, ZIP code, or
            doctor name.
          </div>
        )}
      </div>
    </div>
  );
}
