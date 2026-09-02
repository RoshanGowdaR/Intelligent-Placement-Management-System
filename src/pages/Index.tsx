import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { LandingHero } from "@/components/landing/LandingHero";
import { LandingFeatures } from "@/components/landing/LandingFeatures";
import { LandingCTA } from "@/components/landing/LandingCTA";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { AnimatedBackground } from "@/components/3d/AnimatedBackground";

export default function Index() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate(role === "admin" ? "/admin" : "/dashboard", { replace: true });
    }
  }, [user, role, loading, navigate]);

  if (loading) return null;

  return (
    <div className="relative min-h-screen overflow-hidden text-foreground">
      <AnimatedBackground />
      <div className="relative z-10">
        <LandingNav />
        <LandingHero />
        <LandingFeatures />
        <LandingCTA />
        <LandingFooter />
      </div>
    </div>
  );
}
