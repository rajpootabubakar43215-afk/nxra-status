import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Wifi, Server, Users, Globe, Clock, Copy, Check,
  Lock, Monitor, RefreshCw, Crown, Flame, BarChart3, Zap, Search, Filter, Swords, Target,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { fetchMasterlist, type CodServer } from "@/lib/codApi";
import { parseCodString, stripCodCodes } from "@/lib/codColor";
import { getMapImage } from "@/lib/mapImages";
import { trackNxraPlayers } from "@/lib/trackNxra";
import nxraLogo from "@/assets/nxra-logo.png";

// Strip control chars (\x00-\x1F, \x7F), quote-like chars, and stray markers
const JUNK_RE = /[\x00-\x1F\x7F"“”„«»'`*]/g;
function cleanName(v: string) {
  return stripCodCodes(v || "").replace(JUNK_RE, "").replace(/\s+/g, " ").trim();
}
function cleanCodValue(v: string) {
  // Preserve color codes (^ + digit) but remove control/quote junk
  return (v || "").replace(JUNK_RE, "").replace(/\s+/g, " ").trim();
}

function CodName({ value, className }: { value: string; className?: string }) {
  const parts = parseCodString(cleanCodValue(value));
  return (
    <span className={className}>
      {parts.map((p, i) => (
        <span key={i} style={{ color: p.color }}>{p.text}</span>
      ))}
    </span>
  );
}

const GT_COLORS: Record<string, string> = {
  sd: "bg-red-900/60 text-red-300 border-red-700/50",
  dm: "bg-orange-900/60 text-orange-300 border-orange-700/50",
  tdm: "bg-blue-900/60 text-blue-300 border-blue-700/50",
  hq: "bg-purple-900/60 text-purple-300 border-purple-700/50",
  ctf: "bg-emerald-900/60 text-emerald-300 border-emerald-700/50",
  bel: "bg-yellow-900/60 text-yellow-300 border-yellow-700/50",
  bas: "bg-cyan-900/60 text-cyan-300 border-cyan-700/50",
  re: "bg-pink-900/60 text-pink-300 border-pink-700/50",
};
const gtClass = (gt: string) =>
  GT_COLORS[(gt || "").toLowerCase()] || "bg-zinc-800 text-zinc-300 border-zinc-700";

function CountryFlag({ iso }: { iso: string }) {
  const code = (iso || "").toUpperCase();
  if (!code || code.length !== 2) return <Globe className="w-3.5 h-3.5 text-zinc-500" />;
  const cp = [...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return <span className="text-sm leading-none">{String.fromCodePoint(...cp)}</span>;
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="text-zinc-500 hover:text-orange-400 transition"
      title="Copy"
    >
      {done ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function PlayerGauge({ cur, max }: { cur: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (cur / max) * 100) : 0;
  const r = 28;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  const color = cur === 0 ? "#3f3f46" : pct > 75 ? "#ef4444" : pct > 40 ? "#eab308" : "#22c55e";
  return (
    <div className="relative w-[72px] h-[72px] shrink-0">
      <svg className="w-[72px] h-[72px] -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={r} stroke="#27272a" strokeWidth="5" fill="none" />
        <circle cx="36" cy="36" r={r} stroke={color} strokeWidth="5" fill="none"
          strokeLinecap="round" strokeDasharray={`${dash} ${c}`}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold text-zinc-100 leading-none">{cur}</span>
        <span className="text-[10px] text-zinc-500 leading-none mt-0.5">/{max}</span>
      </div>
      {cur > 0 && (
        <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-zinc-900 animate-pulse" />
      )}
    </div>
  );
}

function trophy(rank: number) {
  if (rank === 0) return "🏆";
  if (rank === 1) return "🥈";
  if (rank === 2) return "🥉";
  return null;
}

function ServerCard({ s, featured }: { s: CodServer; featured?: boolean }) {
  const cur = s.clients || 0;
  const max = s.sv_maxclients || 0;
  const pct = max > 0 ? Math.min(100, (cur / max) * 100) : 0;
  const pings = (s.playerinfo || []).map((p) => parseInt(p.ping, 10)).filter((n) => !isNaN(n) && n > 0);
  const avgPing = pings.length ? Math.round(pings.reduce((a, b) => a + b, 0) / pings.length) : null;
  const isPrivate = !!s.pswrd;
  const mapImg = getMapImage("cod", s.mapname || "");

  const ranked = [...(s.playerinfo || [])]
    .map((p, idx) => ({ ...p, _i: idx, _s: parseInt(p.score, 10) || 0 }))
    .sort((a, b) => b._s - a._s);

  const totalKills = ranked.reduce((a, p) => a + Math.max(0, p._s), 0);

  return (
    <div className={`group relative bg-gradient-to-br from-zinc-900/80 via-zinc-900/50 to-black/80 border rounded-2xl overflow-hidden transition shadow-xl shadow-black/40 ${featured ? "border-orange-500/60 ring-1 ring-orange-500/30 shadow-orange-900/30" : "border-zinc-800/80 hover:border-orange-700/40"
      }`}>
      <div className="h-[3px] bg-gradient-to-r from-red-500 via-orange-400 to-emerald-400" />
      {featured && (
        <div className="absolute top-2 right-2 z-10 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 backdrop-blur flex items-center gap-1">
          <Flame className="w-3 h-3" /> Hot
        </div>
      )}
      <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.08),transparent_60%)]" />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {mapImg && (
            <div className="relative shrink-0">
              <img src={mapImg} alt={s.mapname}
                className="w-28 h-20 object-cover rounded-lg border border-zinc-800"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-white/5" />
              <span className="absolute bottom-1 left-1 right-1 text-[9px] font-bold text-white uppercase tracking-wider bg-black/70 px-1.5 py-0.5 rounded text-center truncate">
                {s.mapname}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${gtClass(s.g_gametype)}`}>
                {s.g_gametype || "—"}
              </span>
              {isPrivate && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-zinc-800 text-zinc-400 border-zinc-700 inline-flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Private
                </span>
              )}
              <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-emerald-950/50 text-emerald-400 border-emerald-800/60 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ONLINE
              </span>
            </div>
            <h3 className="text-lg font-bold mb-1.5 truncate">
              <CodName value={s.sv_hostname || "Unnamed"} />
            </h3>
            <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap">
              <span className="flex items-center gap-1.5">
                <CountryFlag iso={s.country_isocode} />
                <span className="uppercase font-mono">{s.country_isocode || "N/A"}</span>
                {s.city_name && <span className="text-zinc-600">· {s.city_name}</span>}
              </span>
            </div>
          </div>
          <PlayerGauge cur={cur} max={max} />
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
          <MiniStat label="Capacity" value={`${pct.toFixed(0)}%`} bar={pct} />
          <MiniStat label="Avg Ping" value={avgPing !== null ? `${avgPing}ms` : "—"} accent="text-yellow-400" />
          <MiniStat label="Kills" value={String(totalKills)} accent="text-red-400" />
          <MiniStat label="Version" value={`v${s.shortversion || "1.0"}`} accent="text-zinc-300" />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-1.5 flex-1 min-w-0">
            <Server className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="font-mono text-xs text-zinc-300 truncate">{s.ip}:{s.port}</span>
            <CopyBtn text={`${s.ip}:${s.port}`} />
          </div>
        </div>
      </div>

      {ranked.length > 0 ? (
        <div className="border-t border-zinc-800/60 bg-black/40">
          <div className="px-5 py-2.5 flex items-center justify-between border-b border-zinc-800/40">
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-semibold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5 text-orange-400" />
              Players Online
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">{ranked.length} active</span>
          </div>
          <div className="divide-y divide-zinc-800/40">
            {ranked.map((p, rank) => {
              const t = trophy(rank);
              return (
                <div key={rank} className="px-5 py-2 flex items-center gap-3 text-xs hover:bg-zinc-900/40">
                  <span className="w-6 text-center font-mono text-zinc-600">#{rank + 1}</span>
                  <span className="flex-1 min-w-0 truncate flex items-center gap-1.5">
                    {t && <span className="text-sm">{t}</span>}
                    <CodName value={p.name} />
                  </span>
                  <span className="font-mono text-emerald-400 font-bold w-16 text-right">{p._s}</span>
                  <span className="font-mono text-yellow-400 w-14 text-right">{p.ping}ms</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="border-t border-zinc-800/60 bg-black/40 px-5 py-4 text-center text-xs text-zinc-600">
          No players currently online
        </div>
      )}

      <div className="px-5 py-2 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <Monitor className="w-3 h-3" /> CoD 1.1 | CoDExtended
        </span>
        <span className="font-mono">NXRA Network</span>
      </div>
    </div>
  );
}

function MiniStat({ label, value, bar, accent }: { label: string; value: string; bar?: number; accent?: string }) {
  return (
    <div className="bg-zinc-950/70 border border-zinc-800 rounded-lg p-2.5">
      <div className="text-[10px] uppercase text-zinc-500 tracking-wider mb-1 truncate">{label}</div>
      <div className={`font-mono font-bold ${accent || "text-zinc-100"}`}>{value}</div>
      {bar !== undefined && (
        <div className="h-1 mt-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-orange-400" style={{ width: `${bar}%` }} />
        </div>
      )}
    </div>
  );
}

export default function Nxr4() {
  const { data, isLoading, error, dataUpdatedAt, isFetching, refetch } = useQuery({
    queryKey: ["nxr4-servers"],
    queryFn: () => fetchMasterlist("cod", "1.1"),
    refetchInterval: 15000,
  });

  useEffect(() => {
    void trackNxraPlayers();
    const interval = setInterval(() => {
      void trackNxraPlayers();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const allServers = data?.servers ?? [];
  const nxr4Servers = useMemo(
    () => allServers.filter((s) => cleanName(s.sv_hostname).toLowerCase().includes("nxr4")),
    [allServers],
  );

  // Sort: servers with players first (by player count desc), empty ones after
  const sortedServers = useMemo(() => {
    return [...nxr4Servers].sort((a, b) => (b.clients || 0) - (a.clients || 0));
  }, [nxr4Servers]);

  // Filters
  const [search, setSearch] = useState("");
  const [gtFilter, setGtFilter] = useState<string>("all");
  const [onlyActive, setOnlyActive] = useState(false);

  const availableGametypes = useMemo(
    () => Array.from(new Set(nxr4Servers.map((s) => (s.g_gametype || "").toLowerCase()).filter(Boolean))),
    [nxr4Servers],
  );

  const filteredServers = useMemo(() => {
    return sortedServers.filter((s) => {
      if (onlyActive && (s.clients || 0) === 0) return false;
      if (gtFilter !== "all" && (s.g_gametype || "").toLowerCase() !== gtFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hit =
          cleanName(s.sv_hostname).toLowerCase().includes(q) ||
          (s.mapname || "").toLowerCase().includes(q) ||
          `${s.ip}:${s.port}`.includes(q) ||
          (s.playerinfo || []).some((p) => stripCodCodes(p.name).toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [sortedServers, gtFilter, onlyActive, search]);

  // Stats
  const totalPlayers = nxr4Servers.reduce((a, s) => a + (s.clients || 0), 0);
  const totalSlots = nxr4Servers.reduce((a, s) => a + (s.sv_maxclients || 0), 0);
  const activeServers = nxr4Servers.filter((s) => (s.clients || 0) > 0).length;
  const locations = new Set(nxr4Servers.map((s) => s.country_isocode).filter(Boolean)).size;

  // Top scorer across whole network (current session)
  const topScorer = useMemo(() => {
    let best: { name: string; score: number; server: string } | null = null;
    for (const s of nxr4Servers) {
      for (const p of s.playerinfo || []) {
        const sc = parseInt(p.score, 10) || 0;
        if (!best || sc > best.score) {
          best = { name: p.name, score: sc, server: cleanName(s.sv_hostname) };
        }
      }
    }
    return best;
  }, [nxr4Servers]);

  // Tick for "Xs ago"
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const secsAgo = dataUpdatedAt ? Math.max(0, Math.floor((Date.now() - dataUpdatedAt) / 1000)) : 0;

  return (
    <div className="min-h-screen bg-[#06060a] text-zinc-200 relative" style={{ fontFamily: "Rajdhani, system-ui, sans-serif" }}>
      <div className="fixed inset-0 pointer-events-none opacity-40">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px]" />
      </div>

      <header className="relative border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl z-10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={nxraLogo} alt="NXRA"
                className="w-12 h-12 rounded-lg object-cover bg-black shadow-lg shadow-orange-900/40 ring-1 ring-orange-500/30" />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#06060a] animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none tracking-wide">
                <span className="bg-gradient-to-r from-orange-300 via-yellow-200 to-orange-400 bg-clip-text text-transparent">NXRA</span>
                <span className="text-zinc-600 font-normal mx-1.5">|</span>
                <span className="text-zinc-100">Server Dashboard</span>
              </h1>
              <p className="text-xs text-zinc-500 mt-1 tracking-wider uppercase">Call of Duty 1.1 — Real-time Monitor</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <NavLink
              to="/"
              className="text-xs px-3 py-2 rounded-full border border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:text-zinc-100"
              activeClassName="bg-orange-500/20 border-orange-500/60 text-orange-300"
            >
              Servers
            </NavLink>
            <NavLink
              to="/top-players"
              className="text-xs px-3 py-2 rounded-full border border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:text-zinc-100"
              activeClassName="bg-orange-500/20 border-orange-500/60 text-orange-300"
            >
              Top Players
            </NavLink>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800">
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-zinc-400">Master:</span>
              <span className={error ? "text-red-400 font-semibold" : "text-emerald-400 font-semibold"}>
                {error ? "Offline" : "Online"}
              </span>
            </span>
            <button onClick={() => refetch()}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-zinc-900/80 border border-zinc-800 hover:border-orange-700/50 transition">
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin text-orange-400" : "text-zinc-400"}`} />
              <span className="font-mono text-zinc-400">{secsAgo}s</span>
            </button>
          </div>
        </div>

        <div className="container mx-auto px-6 py-3 border-t border-zinc-900 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          <Stat icon={<Server className="w-4 h-4 text-red-400" />} label="NXRA Servers" value={String(nxr4Servers.length)} />
          <Stat icon={<Flame className="w-4 h-4 text-orange-400" />} label="Active Now" value={`${activeServers}/${nxr4Servers.length}`} />
          <Stat icon={<Users className="w-4 h-4 text-emerald-400" />} label="Players" value={`${totalPlayers}/${totalSlots}`} />
          <Stat icon={<Globe className="w-4 h-4 text-blue-400" />} label="Locations" value={String(locations)} />
          <Stat icon={<Clock className="w-4 h-4 text-zinc-400" />} label="Updated" value={`${secsAgo}s ago`} />
        </div>
      </header>

      <main className="relative container mx-auto px-6 py-6 space-y-6 z-10">
        {/* Top scorer spotlight */}
        {topScorer && topScorer.score > 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-transparent p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-600 flex items-center justify-center shadow-lg shadow-yellow-900/40 shrink-0">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] uppercase tracking-[0.2em] text-yellow-400/80 font-semibold">Network MVP · Live</div>
              <div className="text-lg font-bold truncate">
                <CodName value={topScorer.name} /> <span className="text-zinc-500">on</span>{" "}
                <CodName value={topScorer.server} className="text-zinc-400" />
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[10px] uppercase text-zinc-500 tracking-wider">Score</div>
              <div className="font-mono font-black text-2xl text-yellow-400 leading-none flex items-center gap-1">
                <Swords className="w-5 h-5" /> {topScorer.score}
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search server, map, IP, or player…"
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm placeholder-zinc-600 focus:outline-none focus:border-orange-600/60 transition"
            />
          </div>
          <button
            onClick={() => setOnlyActive((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold uppercase tracking-wider transition ${onlyActive
              ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
              : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
          >
            <Target className="w-3.5 h-3.5" /> Active Only
          </button>
        </div>

        {/* Gametype chips */}
        {availableGametypes.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-zinc-500" />
            <Chip active={gtFilter === "all"} onClick={() => setGtFilter("all")}>All</Chip>
            {availableGametypes.map((gt) => (
              <Chip key={gt} active={gtFilter === gt} onClick={() => setGtFilter(gt)}>
                {gt.toUpperCase()}
              </Chip>
            ))}
          </div>
        )}

        {isLoading && <p className="text-zinc-500">Loading…</p>}
        {error && <p className="text-red-400">Failed to load servers.</p>}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filteredServers.map((s, i) => (
            <ServerCard key={`${s.ip}:${s.port}`} s={s} featured={i === 0 && (s.clients || 0) > 0} />
          ))}
        </div>

        {!isLoading && filteredServers.length === 0 && (
          <p className="text-zinc-500 text-center py-12">No NXRA servers match your filters.</p>
        )}

        <footer className="text-center text-xs text-zinc-500 pt-4 pb-8 space-y-1">
          <p className="flex items-center justify-center gap-1.5">
            <BarChart3 className="w-3 h-3" />
            Data from <a href="https://codservers.net" target="_blank" rel="noreferrer" className="text-orange-400 hover:underline">codservers.net</a>
          </p>
          <p className="text-zinc-600">NXRA Gaming Community · Auto-refreshing every 15s</p>
          {dataUpdatedAt > 0 && (
            <p className="text-zinc-700 font-mono">Last fetch: {new Date(dataUpdatedAt).toLocaleString()}</p>
          )}
        </footer>
      </main>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-zinc-900/40 border border-zinc-800/60 rounded-lg px-3 py-2">
      {icon}
      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-[10px] uppercase tracking-wider text-zinc-500 truncate">{label}</span>
        <span className="text-zinc-100 font-bold font-mono">{value}</span>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition ${active
        ? "bg-orange-500/20 border-orange-500/60 text-orange-300"
        : "bg-zinc-900/60 border-zinc-800 text-zinc-500 hover:text-zinc-200"
        }`}
    >
      {children}
    </button>
  );
}
