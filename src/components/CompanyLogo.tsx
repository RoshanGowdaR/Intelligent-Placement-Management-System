import React, { useState } from "react";
import { Building2 } from "lucide-react";

// Curated high-res vector and brand logos for major companies
export const KNOWN_COMPANY_LOGOS: Record<string, string> = {
  google: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
  microsoft: "https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg",
  amazon: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg",
  tcs: "https://upload.wikimedia.org/wikipedia/commons/9/9b/TATA_Consultancy_Services_Logo.svg",
  "tata consultancy services": "https://upload.wikimedia.org/wikipedia/commons/9/9b/TATA_Consultancy_Services_Logo.svg",
  tata: "https://upload.wikimedia.org/wikipedia/commons/9/9b/TATA_Consultancy_Services_Logo.svg",
  infosys: "https://upload.wikimedia.org/wikipedia/commons/9/95/Infosys_logo.svg",
  wipro: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Wipro_Logo_RGB_Silver_Combined.svg",
  accenture: "https://upload.wikimedia.org/wikipedia/commons/c/cd/Accenture.svg",
  ibm: "https://upload.wikimedia.org/wikipedia/commons/5/51/IBM_logo.svg",
  oracle: "https://upload.wikimedia.org/wikipedia/commons/5/50/Oracle_logo.svg",
  meta: "https://upload.wikimedia.org/wikipedia/commons/7/7b/Meta_Platforms_Inc._logo.svg",
  apple: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
  cisco: "https://upload.wikimedia.org/wikipedia/commons/0/08/Cisco_logo_blue_2016.svg",
  intel: "https://upload.wikimedia.org/wikipedia/commons/7/7d/Intel_logo_%282020%29.svg",
  cognizant: "https://upload.wikimedia.org/wikipedia/commons/4/43/Cognizant_logo_2022.svg",
  capgemini: "https://upload.wikimedia.org/wikipedia/commons/9/9d/Capgemini_201x_logo.svg",
  zoho: "https://upload.wikimedia.org/wikipedia/commons/a/a0/Zoho_Corporation_2023_logo.svg",
  flipkart: "https://upload.wikimedia.org/wikipedia/en/7/7a/Flipkart_logo.svg",
};

// Secondary CDN backup URLs in case Wikimedia blocks hotlinking or rate-limits
export const SECONDARY_COMPANY_LOGOS: Record<string, string> = {
  tcs: "https://companiesmarketcap.com/img/company-logos/512/TCS.NS.png",
  "tata consultancy services": "https://companiesmarketcap.com/img/company-logos/512/TCS.NS.png",
  tata: "https://companiesmarketcap.com/img/company-logos/512/TCS.NS.png",
  google: "https://companiesmarketcap.com/img/company-logos/512/GOOG.png",
  microsoft: "https://companiesmarketcap.com/img/company-logos/512/MSFT.png",
  amazon: "https://companiesmarketcap.com/img/company-logos/512/AMZN.png",
  infosys: "https://companiesmarketcap.com/img/company-logos/512/INFY.png",
  wipro: "https://companiesmarketcap.com/img/company-logos/512/WIT.png",
};

export function getCompanyLogoUrl(name?: string | null, customUrl?: string | null): string | null {
  if (customUrl && customUrl.trim().length > 0) return customUrl.trim();
  if (!name) return null;
  const clean = name.trim().toLowerCase();
  
  for (const [key, url] of Object.entries(KNOWN_COMPANY_LOGOS)) {
    if (clean === key || clean.includes(key)) {
      return url;
    }
  }
  return null;
}

export function getSecondaryLogoUrl(name?: string | null): string | null {
  if (!name) return null;
  const clean = name.trim().toLowerCase();
  for (const [key, url] of Object.entries(SECONDARY_COMPANY_LOGOS)) {
    if (clean === key || clean.includes(key)) {
      return url;
    }
  }
  return null;
}

// Built-in inline SVG vectors that render with zero network requests if external CDNs fail
function renderInlineBrandVector(name?: string | null) {
  if (!name) return null;
  const clean = name.trim().toLowerCase();

  // TCS vector badge (Official TATA blue typography)
  if (clean === "tcs" || clean.includes("tata") || clean.includes("consultancy")) {
    return (
      <svg viewBox="0 0 100 48" className="w-full h-full p-0.5" fill="none" xmlns="http://www.w3.org/2000/svg">
        <text x="50%" y="42%" textAnchor="middle" dominantBaseline="middle" fill="#005696" fontFamily="Arial, Helvetica, sans-serif" fontWeight="900" fontSize="18" letterSpacing="3">TATA</text>
        <text x="50%" y="78%" textAnchor="middle" dominantBaseline="middle" fill="#1e293b" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="6.5" letterSpacing="0.4">CONSULTANCY SERVICES</text>
      </svg>
    );
  }

  // Microsoft 4-color square vector
  if (clean.includes("microsoft")) {
    return (
      <svg viewBox="0 0 24 24" className="w-full h-full p-1" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="1" y="1" width="10" height="10" fill="#F25022" />
        <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
        <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
        <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
      </svg>
    );
  }

  // Google 4-color G
  if (clean.includes("google")) {
    return (
      <svg viewBox="0 0 24 24" className="w-full h-full p-1" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
      </svg>
    );
  }

  // Amazon curved arrow
  if (clean.includes("amazon")) {
    return (
      <svg viewBox="0 0 24 24" className="w-full h-full p-1" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M13.9 12.8c-1.8 1.4-4.5 2.1-6.8 2.1-3.2 0-6.1-1.2-8.3-3.2-.2-.2 0-.5.2-.3 2.5 1.5 5.5 2.3 8.6 2.3 2 0 4.3-.5 6.4-1.6.4-.2.7.3.3.7z" fill="#FF9900"/>
        <path d="M15.4 11.2c-.2-.3-1.5-.1-2.1 0-.2 0-.2-.2 0-.3.9-.7 2.4-.5 2.6-.2.2.3 0 1.9-.8 2.6-.2.1-.3 0-.2-.2.3-.5.7-1.5.5-1.9z" fill="#FF9900"/>
        <text x="5" y="11" fill="#1e293b" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="12">a</text>
      </svg>
    );
  }

  return null;
}

interface CompanyLogoProps {
  name?: string | null;
  logoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  showFallbackText?: boolean;
}

// Substantially enlarged dimensions for high visibility across dashboards & rosters
const SIZE_STYLES = {
  xs: "h-7 w-7 min-w-[28px] text-xs rounded-lg p-0.5",
  sm: "h-10 w-10 min-w-[40px] text-sm rounded-xl p-1",
  md: "h-12 w-12 min-w-[48px] text-base rounded-xl p-1.5",
  lg: "h-16 w-16 min-w-[64px] text-lg rounded-2xl p-2",
  xl: "h-20 w-20 min-w-[80px] text-xl rounded-2xl p-2.5",
  "2xl": "h-24 w-24 min-w-[96px] text-2xl rounded-3xl p-3",
};

const IMG_SIZE_STYLES = {
  xs: "max-h-5 max-w-5",
  sm: "max-h-8 max-w-8",
  md: "max-h-10 max-w-10",
  lg: "max-h-13 max-w-13",
  xl: "max-h-16 max-w-16",
  "2xl": "max-h-20 max-w-20",
};

export default function CompanyLogo({
  name,
  logoUrl,
  size = "md",
  className = "",
}: CompanyLogoProps) {
  // Failover stage: 0 = primary url, 1 = secondary cdn url, 2 = vector svg or monogram
  const [failoverStage, setFailoverStage] = useState(0);

  const primaryUrl = getCompanyLogoUrl(name, logoUrl);
  const secondaryUrl = getSecondaryLogoUrl(name);

  let activeUrl: string | null = null;
  if (failoverStage === 0 && primaryUrl) {
    activeUrl = primaryUrl;
  } else if (failoverStage <= 1 && secondaryUrl && secondaryUrl !== primaryUrl) {
    activeUrl = secondaryUrl;
  }

  const handleImageError = () => {
    setFailoverStage((prev) => prev + 1);
  };

  const inlineVector = renderInlineBrandVector(name);
  const initial = (name || "C").trim().charAt(0).toUpperCase();

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden border border-slate-200/90 dark:border-border/80 bg-white shadow-sm transition-transform ${SIZE_STYLES[size]} ${className}`}
      title={name || "Company"}
    >
      {activeUrl ? (
        <img
          src={activeUrl}
          alt={name ? `${name} logo` : "Company logo"}
          className={`object-contain w-auto h-auto transition-transform ${IMG_SIZE_STYLES[size]}`}
          onError={handleImageError}
          loading="lazy"
        />
      ) : inlineVector ? (
        <div className="flex h-full w-full items-center justify-center">
          {inlineVector}
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5 font-bold font-display text-primary">
          {initial ? <span>{initial}</span> : <Building2 className="h-4 w-4" />}
        </div>
      )}
    </div>
  );
}
