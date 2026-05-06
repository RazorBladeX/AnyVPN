export interface IpLookupResult {
  ip: string;
  country?: string;
  city?: string;
  region?: string;
  flagCountry?: string;
}

type IpApiResponse = {
  status?: string;
  query?: string;
  country?: string;
  countryCode?: string;
  city?: string;
  regionName?: string;
  message?: string;
};

type IpApiCoResponse = {
  ip?: string;
  country_name?: string;
  country_code?: string;
  city?: string;
  region?: string;
};

export async function lookupPublicIp(serviceUrl?: string) {
  return lookupIp(undefined, serviceUrl);
}

export async function lookupHostLocation(host: string) {
  return lookupIp(host);
}

async function lookupIp(host?: string, serviceUrl?: string): Promise<IpLookupResult> {
  const primaryUrl = host
    ? `http://ip-api.com/json/${encodeURIComponent(host)}?fields=status,message,country,countryCode,regionName,city,query`
    : "http://ip-api.com/json/?fields=status,message,country,countryCode,regionName,city,query";

  try {
    const response = await fetch(serviceUrl || primaryUrl);
    if (!response.ok) throw new Error(`IP lookup failed with HTTP ${response.status}.`);
    const data = (await response.json()) as IpApiResponse & IpApiCoResponse;
    if ("status" in data && data.status && data.status !== "success") {
      throw new Error(data.message || "IP lookup provider returned an error.");
    }
    const ip = data.query || data.ip;
    if (!ip) throw new Error("IP lookup provider did not return an IP address.");
    return {
      ip,
      country: data.country || data.country_name,
      city: data.city,
      region: data.regionName || data.region,
      flagCountry: data.countryCode || data.country_code
    };
  } catch {
    const fallbackUrl = host ? `https://ipapi.co/${encodeURIComponent(host)}/json/` : "https://ipapi.co/json/";
    const fallback = await fetch(fallbackUrl);
    if (!fallback.ok) throw new Error(`Fallback IP lookup failed with HTTP ${fallback.status}.`);
    const data = (await fallback.json()) as IpApiCoResponse;
    if (!data.ip) throw new Error("Fallback IP lookup did not return an IP address.");
    return {
      ip: data.ip,
      country: data.country_name,
      city: data.city,
      region: data.region,
      flagCountry: data.country_code
    };
  }
}
