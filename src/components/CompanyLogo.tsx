import React, { useState } from "react";
import { Building2 } from "lucide-react";

// Curated high-res vector and brand logos for major companies
export const KNOWN_COMPANY_LOGOS: Record<string, string> = {
  google: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
  microsoft: "https://upload.wikimedia.org/wikipedia/commons/9/96/Microsoft_logo_%282012%29.svg",
  amazon: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg",
  tcs: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Tata_Consultancy_Services_Logo.svg",
  "tata consultancy services": "https://upload.wikimedia.org/wikipedia/commons/b/b1/Tata_Consultancy_Services_Logo.svg",
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

interface CompanyLogoProps {
  name?: string | null;
  logoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  showFallbackText?: boolean;
}

const SIZE_STYLES = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
  xl: "h-14 w-14 text-lg",
};

const IMG_SIZE_STYLES = {
  xs: "max-h-3.5 max-w-3.5",
  sm: "max-h-5 max-w-5",
  md: "max-h-6 max-w-6",
  lg: "max-h-8 max-w-8",
  xl: "max-h-10 max-w-10",
};

export default function CompanyLogo({
  name,
  logoUrl,
  size = "md",
  className = "",
}: CompanyLogoProps) {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = !imgError ? getCompanyLogoUrl(name, logoUrl) : null;
  const initial = (name || "C").trim().charAt(0).toUpperCase();

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-xl overflow-hidden border border-border/60 bg-white/95 dark:bg-card shadow-sm ${SIZE_STYLES[size]} ${className}`}
      title={name || "Company"}
    >
      {resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt={name ? `${name} logo` : "Company logo"}
          className={`object-contain transition-transform p-0.5 ${IMG_SIZE_STYLES[size]}`}
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/10 font-bold text-primary">
          {initial ? <span>{initial}</span> : <Building2 className="h-4 w-4" />}
        </div>
      )}
    </div>
  );
}
