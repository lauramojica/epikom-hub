"use client";
import { useEffect, useState } from "react";

/* ── Quotes: arte, cine, poesía, creatividad ── */
const QUOTES: { text: string; author: string }[] = [
  { text: "El arte no reproduce lo visible; hace visible.", author: "Paul Klee" },
  { text: "La creatividad es la inteligencia divirtiéndose.", author: "Albert Einstein" },
  { text: "Todo lo que puedes imaginar es real.", author: "Pablo Picasso" },
  { text: "El cine es la escritura moderna cuya tinta es la luz.", author: "Jean Cocteau" },
  { text: "No hagas nada por obligación. Hazlo por asombro.", author: "Anónimo" },
  { text: "Si puedes soñarlo, puedes hacerlo.", author: "Walt Disney" },
  { text: "Roba como artista: nada es completamente original.", author: "Austin Kleon" },
  { text: "Lo simple es la máxima sofisticación.", author: "Leonardo da Vinci" },
  { text: "Un pueblo sin poesía es un pueblo sin memoria.", author: "Julia de Burgos" },
  { text: "Hay que tener el caos dentro para dar a luz una estrella danzarina.", author: "Nietzsche" },
  { text: "El detalle no es el detalle: el detalle hace el diseño.", author: "Charles Eames" },
  { text: "Filmar es escribir con la cámara.", author: "Alexandre Astruc" },
  { text: "La perfección se logra cuando no queda nada que quitar.", author: "Saint-Exupéry" },
  { text: "Escribe con el corazón, edita con la cabeza.", author: "Anónimo" },
  { text: "Un buen plano vale más que mil explicaciones.", author: "Akira Kurosawa" },
  { text: "La disciplina es el puente entre metas y logros.", author: "Jim Rohn" },
  { text: "Yo no busco, encuentro.", author: "Pablo Picasso" },
  { text: "Lo que no se nombra no existe.", author: "George Steiner" },
  { text: "El caribe no se explica, se siente.", author: "Anónimo" },
  { text: "Cada día es una hoja en blanco. Ensúciala bien.", author: "Anónimo" },
  { text: "La luz es el primer maquillaje.", author: "Roger Deakins" },
  { text: "Haz cosas buenas y déjalas en el camino.", author: "Refrán" },
  { text: "Empieza donde estás. Usa lo que tienes.", author: "Arthur Ashe" },
  { text: "La calma también es productividad.", author: "Anónimo" },
  { text: "Nada grande se hizo nunca sin entusiasmo.", author: "Ralph Waldo Emerson" },
  { text: "El color es un poder que influye directamente en el alma.", author: "Kandinsky" },
  { text: "Escribir es fácil: solo hay que mirar la página hasta sangrar.", author: "Gene Fowler" },
  { text: "Confía en el proceso, incluso cuando no lo veas.", author: "Anónimo" },
  { text: "Menos, pero mejor.", author: "Dieter Rams" },
  { text: "La isla entera es un plató. Solo hay que mirarla.", author: "Anónimo" },
  { text: "El talento gana partidos, el equipo gana campeonatos.", author: "Michael Jordan" },
];

/* Índice determinístico del día (todos ven la misma al abrir) */
function quoteIndexOfTheDay() {
  const now = new Date();
  const key = Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Puerto_Rico", year: "numeric", month: "2-digit", day: "2-digit" })
      .format(now).replace(/-/g, "")
  );
  return key % QUOTES.length;
}

/* Códigos WMO de Open-Meteo → emoji + texto */
function weatherInfo(code: number): { icon: string; label: string } {
  if (code === 0) return { icon: "☀️", label: "Despejado" };
  if (code <= 2) return { icon: "🌤️", label: "Parcialmente nublado" };
  if (code === 3) return { icon: "☁️", label: "Nublado" };
  if (code <= 48) return { icon: "🌫️", label: "Neblina" };
  if (code <= 57) return { icon: "🌦️", label: "Llovizna" };
  if (code <= 67) return { icon: "🌧️", label: "Lluvia" };
  if (code <= 77) return { icon: "🌨️", label: "Nieve" };
  if (code <= 82) return { icon: "🌧️", label: "Aguaceros" };
  if (code <= 99) return { icon: "⛈️", label: "Tormenta" };
  return { icon: "🌡️", label: "—" };
}

export default function DailyWidget({ userName }: { userName?: string }) {
  const [now, setNow] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
  const [qIndex, setQIndex] = useState(quoteIndexOfTheDay);
  const [spin, setSpin] = useState(false);
  const quote = QUOTES[qIndex];

  const nextQuote = () => {
    setSpin(true);
    setQIndex((i) => (i + 1) % QUOTES.length);
    setTimeout(() => setSpin(false), 400);
  };

  // Reloj vivo
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Clima de Bayamón, PR (Open-Meteo: sin API key)
  useEffect(() => {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=18.3989&longitude=-66.1614&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=America%2FPuerto_Rico")
      .then((r) => r.json())
      .then((d) => {
        if (d?.current) setWeather({ temp: Math.round(d.current.temperature_2m), code: d.current.weather_code });
      })
      .catch(() => {});
  }, []);

  const time = new Intl.DateTimeFormat("es-PR", {
    hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Puerto_Rico",
  }).format(now);

  const dateLong = new Intl.DateTimeFormat("es-PR", {
    weekday: "long", day: "numeric", month: "long", timeZone: "America/Puerto_Rico",
  }).format(now);

  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: "America/Puerto_Rico" }).format(now));
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const w = weather ? weatherInfo(weather.code) : null;

  return (
    <div className="bg-surface border border-line rounded-xl overflow-hidden">
      <div className="flex flex-col md:flex-row">
        {/* Reloj + clima */}
        <div className="p-5 md:border-r border-line md:w-64 flex-shrink-0">
          <p className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1">
            {greeting}{userName ? `, ${userName.split(" ")[0]}` : ""}
          </p>
          <p className="font-mono text-3xl font-700 text-ink tabular-nums leading-none">{time}</p>
          <p className="text-xs text-muted capitalize mt-1.5">{dateLong}</p>
          {w && weather && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line">
              <span className="text-xl">{w.icon}</span>
              <div>
                <p className="font-mono text-sm font-600 text-ink tabular-nums">{weather.temp}°F</p>
                <p className="text-[10px] text-muted">{w.label} · Bayamón</p>
              </div>
            </div>
          )}
        </div>

        {/* Quote del día */}
        <div className="p-5 flex-1 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-2">
            <p className="font-mono text-[10px] text-primary uppercase tracking-widest">
              {qIndex === quoteIndexOfTheDay() ? "Quote del día" : "Otra más"}
            </p>
            <button
              onClick={nextQuote}
              title="Dame otra"
              className="w-6 h-6 rounded-lg border border-line flex items-center justify-center text-muted hover:text-primary hover:border-primary/40 transition-all"
            >
              <svg
                width="11" height="11" viewBox="0 0 12 12" fill="none"
                style={{ transition: "transform 0.4s cubic-bezier(0.22,1,0.36,1)", transform: spin ? "rotate(360deg)" : "rotate(0deg)" }}
              >
                <path d="M10.5 6a4.5 4.5 0 1 1-1.32-3.18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M10.5 1.5V4H8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <blockquote key={qIndex} className="text-ink leading-snug animate-card-in" style={{ fontSize: "clamp(15px, 2vw, 19px)" }}>
            <span className="text-primary/40 font-display text-2xl leading-none mr-1">&ldquo;</span>
            {quote.text}
          </blockquote>
          <p key={`a-${qIndex}`} className="font-mono text-[11px] text-muted mt-2 animate-card-in">— {quote.author}</p>
        </div>
      </div>
    </div>
  );
}
