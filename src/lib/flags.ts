const countryToFlag: Record<string, string> = {
  "United States": "US",
  "United Kingdom": "GB",
  Canada: "CA",
  Germany: "DE",
  France: "FR",
  Netherlands: "NL",
  Japan: "JP",
  Singapore: "SG",
  Australia: "AU"
};

export function flagForCountry(country?: string | null) {
  if (country && /^[A-Z]{2}$/.test(country)) {
    return country
      .split("")
      .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join("");
  }
  const code = country ? countryToFlag[country] : undefined;
  if (!code) return "??";
  return code
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}
