import { useEffect, useMemo, useState } from "react";
import { DevicePerformance, getDevicePerformance, shouldUseSimpleEffects } from "@/utils/performance";

export type PerformanceTier = DevicePerformance;

export const usePerformanceTier = () => {
  const [tier, setTier] = useState<DevicePerformance>(() => getDevicePerformance());
  const [simpleEffects, setSimpleEffects] = useState<boolean>(() => shouldUseSimpleEffects());
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updatePerformance = () => {
      setTier(getDevicePerformance());
      setSimpleEffects(shouldUseSimpleEffects());
    };

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    updatePerformance();
    handleResize();

    window.addEventListener("resize", handleResize);
    window.addEventListener("focus", updatePerformance);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("focus", updatePerformance);
    };
  }, []);

  const isLow = useMemo(() => tier === "low" || simpleEffects, [tier, simpleEffects]);

  return {
    tier,
    simpleEffects,
    isLow,
    isMobile,
  };
};

