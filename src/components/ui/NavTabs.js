"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import styles from "./NavTabs.module.css";

const TABS = [
  { href: "/", label: "Keşfet", icon: "compass" },
  { href: "/plan", label: "Günün Menüsü", icon: "ticket" },
];

// variant="top"   → menu in the header on desktop
// variant="bottom" → floating menu at the bottom of the screen on phones
export default function NavTabs({ variant = "top" }) {
  const pathname = usePathname();

  return (
    <nav className={styles[variant]} aria-label="Ana menü">
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={styles.tab}
            data-active={active || undefined}
            aria-current={active ? "page" : undefined}
          >
            <Icon name={tab.icon} size={18} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
