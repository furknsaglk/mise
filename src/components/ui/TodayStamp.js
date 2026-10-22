"use client";

import { useEffect, useState } from "react";

// Shows today's date like a newspaper masthead: "SALI · 21 EKİM"
export default function TodayStamp({ className }) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const d = new Date();
    const weekday = d.toLocaleDateString("tr-TR", { weekday: "long" });
    const day = d.toLocaleDateString("tr-TR", { day: "numeric", month: "long" });
    setLabel(`${weekday} · ${day}`.toLocaleUpperCase("tr-TR"));
  }, []);

  return <span className={className}>{label || " "}</span>;
}
