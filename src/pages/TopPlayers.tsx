import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Trophy, Users, Clock, Server, Activity } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type PlayerActivity = Database["public"]["Tables"]["nxr4_player_activity"]["Row"];

function formatDuration(ms: number) {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const seconds = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const minutes = totalMinutes % 60;
    const totalHours = Math.floor(totalMinutes / 60);
    const hours = totalHours % 24;
    const days = Math.floor(totalHours / 24);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

function formatTimestamp(value: string | null | undefined) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString();
}

function isRecentlyActive(value: string | null | undefined) {
    if (!value) return false;
    const ts = new Date(value).getTime();
    return ts >= Date.now() - 15 * 60 * 1000;
}

export default function TopPlayers() {
    const { data, error, isLoading, isFetching, refetch, dataUpdatedAt } = useQuery<
        PlayerActivity[] | null
    >({
        queryKey: ["top-players"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("nxr4_player_activity")
                .select(
                    "id, display_name, first_seen, last_seen, last_server, sightings, total_score"
                )
                .order("total_score", { ascending: false })
                .limit(10);
            if (error) throw error;
            return data;
        },
        refetchInterval: 15000,
    });

    const rows = data ?? [];
    const activeCount = useMemo(
        () => rows.filter((row) => isRecentlyActive(row.last_seen)).length,
        [rows],
    );

    const totalScore = useMemo(
        () => rows.reduce((sum, row) => sum + (row.total_score ?? 0), 0),
        [rows],
    );

    const secsAgo = dataUpdatedAt ? Math.max(0, Math.floor((Date.now() - dataUpdatedAt) / 1000)) : 0;

    return (
        <div className="min-h-screen bg-[#06060a] text-zinc-200 relative" style={{ fontFamily: "Rajdhani, system-ui, sans-serif" }}>
            <div className="fixed inset-0 pointer-events-none opacity-40">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-orange-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px]" />
            </div>

            <header className="relative border-b border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl z-10">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between flex-wrap gap-3">
                    <div>
                        <h1 className="text-xl font-bold leading-none tracking-wide">
                            <span className="bg-gradient-to-r from-orange-300 via-yellow-200 to-orange-400 bg-clip-text text-transparent">NXRA</span>
                            <span className="text-zinc-600 font-normal mx-1.5">|</span>
                            <span className="text-zinc-100">Top Players</span>
                        </h1>
                        <p className="text-xs text-zinc-500 mt-1 tracking-wider uppercase">Top 10 tracked NXRA player activity</p>
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
                        <button
                            onClick={() => refetch()}
                            className="flex items-center gap-2 text-xs px-3 py-2 rounded-full border border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-orange-700/50 transition"
                        >
                            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-orange-400" : "text-zinc-400"}`} />
                            {secsAgo}s
                        </button>
                    </div>
                </div>

                <div className="container mx-auto px-6 py-3 border-t border-zinc-900 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                    <div className="flex items-center gap-2.5 bg-zinc-900/40 border border-zinc-800/60 rounded-lg px-3 py-2">
                        <Users className="w-4 h-4 text-emerald-400" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Top Players</span>
                            <span className="text-zinc-100 font-bold font-mono">{rows.length}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 bg-zinc-900/40 border border-zinc-800/60 rounded-lg px-3 py-2">
                        <Activity className="w-4 h-4 text-orange-400" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Active</span>
                            <span className="text-zinc-100 font-bold font-mono">{activeCount}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 bg-zinc-900/40 border border-zinc-800/60 rounded-lg px-3 py-2">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Top score</span>
                            <span className="text-zinc-100 font-bold font-mono">{rows[0]?.total_score ?? "—"}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 bg-zinc-900/40 border border-zinc-800/60 rounded-lg px-3 py-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Play time</span>
                            <span className="text-zinc-100 font-bold font-mono">{rows.length ? formatDuration(Math.max(0, new Date(rows[0].last_seen || "").getTime() - new Date(rows[0].first_seen || "").getTime())) : "—"}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 bg-zinc-900/40 border border-zinc-800/60 rounded-lg px-3 py-2">
                        <Server className="w-4 h-4 text-cyan-400" />
                        <div className="flex flex-col leading-tight">
                            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Total score</span>
                            <span className="text-zinc-100 font-bold font-mono">{totalScore}</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="relative container mx-auto px-6 py-6 z-10">
                <div className="grid gap-4">
                    <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-5 shadow-xl shadow-black/30">
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-[0.25em] text-zinc-500 mb-2">Top 10 Active Players</p>
                                <h2 className="text-2xl font-bold text-zinc-100">Score & play time leaderboard</h2>
                                <p className="mt-2 text-sm text-zinc-400 max-w-2xl">
                                    Live scoreboard data powered by tracked NXRA server activity. Play time is calculated from first and last sighting timestamps.
                                </p>
                            </div>
                            <button
                                onClick={() => refetch()}
                                className="inline-flex items-center gap-2 rounded-full border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-sm font-semibold text-orange-200 hover:bg-orange-500/15 transition"
                            >
                                <RefreshCw className="w-4 h-4" /> Refresh
                            </button>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-[2rem] border border-zinc-800/80 bg-zinc-950/70 shadow-xl shadow-black/20">
                        <div className="grid grid-cols-6 gap-4 px-5 py-4 border-b border-zinc-800/60 bg-zinc-900/80 text-xs uppercase tracking-[0.2em] text-zinc-500">
                            <span className="col-span-1">#</span>
                            <span className="col-span-2">Player</span>
                            <span className="col-span-1 text-right">Score</span>
                            <span className="col-span-1 text-right">Play Time</span>
                            <span className="col-span-1 text-right">Active</span>
                            <span className="col-span-1 text-right">Last Seen</span>
                        </div>
                        <div className="divide-y divide-zinc-800/60">
                            {isLoading ? (
                                <div className="p-8 text-center text-zinc-400">Loading top players…</div>
                            ) : error ? (
                                <div className="p-8 text-center text-red-400">Unable to load top players.</div>
                            ) : rows.length === 0 ? (
                                <div className="p-8 text-center text-zinc-400">No player activity available.</div>
                            ) : (
                                rows.map((row, index) => {
                                    const firstSeen = row.first_seen ? new Date(row.first_seen).getTime() : 0;
                                    const lastSeen = row.last_seen ? new Date(row.last_seen).getTime() : 0;
                                    const playedMs = Math.max(0, lastSeen - firstSeen);
                                    const active = isRecentlyActive(row.last_seen);
                                    return (
                                        <div key={row.id} className="grid grid-cols-6 gap-4 px-5 py-4 items-center text-sm text-zinc-200 hover:bg-zinc-900/40 transition">
                                            <div className="col-span-1 text-zinc-400 font-mono">#{index + 1}</div>
                                            <div className="col-span-2 min-w-0">
                                                <div className="truncate font-semibold text-white">{row.display_name || row.player_key}</div>
                                                <div className="mt-1 text-[11px] text-zinc-500 truncate">{row.last_server || "—"}</div>
                                            </div>
                                            <div className="col-span-1 text-right font-mono text-orange-300">{row.total_score}</div>
                                            <div className="col-span-1 text-right text-zinc-300">{playedMs > 0 ? formatDuration(playedMs) : "—"}</div>
                                            <div className="col-span-1 text-right">
                                                <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${active ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" : "bg-zinc-900/80 text-zinc-400 border border-zinc-800"
                                                    }`}>{active ? "Online" : "Offline"}</span>
                                            </div>
                                            <div className="col-span-1 text-right text-zinc-500 font-mono text-[11px]">{formatTimestamp(row.last_seen)}</div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
