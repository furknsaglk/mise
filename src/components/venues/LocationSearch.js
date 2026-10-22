"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import styles from "./LocationSearch.module.css";

// Searches any country, city, neighborhood, street or venue worldwide.
// Fetches suggestions 300 ms after typing stops; arrow keys + Enter to pick.
export default function LocationSearch({ onSelect, onLocate, locating }) {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setPlaces([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/geocode?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          setPlaces(data.places ?? []);
          setActive(0);
          setOpen(true);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close the list on outside click
  useEffect(() => {
    const close = (e) => !boxRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);

  const choose = (place) => {
    onSelect(place);
    setQuery("");
    setPlaces([]);
    setOpen(false);
  };

  const onKeyDown = (e) => {
    if (!open || !places.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % places.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + places.length) % places.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(places[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={styles.wrap} ref={boxRef}>
      <div className={styles.field}>
        <Icon name="pin" size={18} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => places.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Ülke, şehir, mahalle ya da sokak…"
          aria-label="Konum ara"
          aria-expanded={open}
          aria-controls="location-results"
          role="combobox"
          autoComplete="off"
        />
        {loading && <span className={styles.spinner} aria-hidden />}
        <button type="button" className={styles.locate} onClick={onLocate} disabled={locating} title="Konumumu kullan">
          <Icon name="compass" size={16} />
          <span>{locating ? "Bulunuyor…" : "Konumum"}</span>
        </button>
      </div>

      {open && (
        <ul id="location-results" className={styles.results} role="listbox">
          {places.length === 0 && !loading && <li className={styles.none}>Sonuç bulunamadı</li>}
          {places.map((place, i) => (
            <li
              key={place.id + i}
              role="option"
              aria-selected={i === active}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(place)}
            >
              <span className={styles.name}>{place.name}</span>
              {place.detail && <span className={styles.detail}>{place.detail}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
