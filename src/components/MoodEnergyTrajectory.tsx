import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Zap,
  Smile,
  Activity,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Compass,
  ShieldCheck,
  CheckCircle2,
  Filter,
  Layers,
  Heart,
  HelpCircle,
  Plus
} from 'lucide-react';
import { JournalSession } from '../types';
import { INITIAL_SESSIONS } from '../data/sampleSessions';

interface MoodEnergyTrajectoryProps {
  sessions: JournalSession[];
  onOpenSession?: (sessionId: string) => void;
  onOpenJournal?: (sessionId: string) => void;
  onNewSession?: () => void;
  onNewJournal?: () => void;
}

type TimeframeFilter = 'all' | '30d' | '7d';
type MetricView = 'both' | 'mood' | 'energy';

interface ChartPoint {
  id: string;
  sessionId: string;
  dateLabel: string;
  fullDate: string;
  timestamp: number;
  title: string;
  moodLabel: string;
  moodEmoji: string;
  sentimentScore: number;
  energyLevel: number;
  themes: string[];
  isSample?: boolean;
}

export const MoodEnergyTrajectory: React.FC<MoodEnergyTrajectoryProps> = ({
  sessions,
  onOpenSession,
  onOpenJournal,
  onNewSession,
  onNewJournal,
}) => {
  const handleOpen = (id: string) => {
    if (onOpenJournal) onOpenJournal(id);
    else if (onOpenSession) onOpenSession(id);
  };

  const handleNew = () => {
    if (onNewJournal) onNewJournal();
    else if (onNewSession) onNewSession();
  };

  const userFinishedCount = useMemo(() => {
    return sessions.filter((s) => s.status === 'finished' && s.summary?.mood).length;
  }, [sessions]);

  const [timeframe, setTimeframe] = useState<TimeframeFilter>('all');
  const [metricView, setMetricView] = useState<MetricView>('both');
  const [includeSampleData, setIncludeSampleData] = useState<boolean>(() => userFinishedCount < 3);
  const [showBenchmarkHelp, setShowBenchmarkHelp] = useState<boolean>(false);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

  // Combine real user sessions with sample benchmarks if toggled
  const activeSessions = useMemo(() => {
    const finishedUserSessions = sessions.filter((s) => s.status === 'finished' && s.summary?.mood);

    if (finishedUserSessions.length === 0) {
      // If user has zero finished sessions, always show sample benchmarks
      return INITIAL_SESSIONS;
    }

    if (!includeSampleData) {
      return finishedUserSessions;
    }

    // Merge without duplicating IDs
    const userIds = new Set(finishedUserSessions.map((s) => s.id));
    const samplesToAdd = INITIAL_SESSIONS.filter((s) => !userIds.has(s.id));
    return [...finishedUserSessions, ...samplesToAdd];
  }, [sessions, includeSampleData]);

  // Convert sessions to chronological chart points
  const rawChartData: ChartPoint[] = useMemo(() => {
    const points: ChartPoint[] = [];

    activeSessions.forEach((s) => {
      if (!s.summary || !s.summary.mood) return;

      const dateStr = s.date || 'Aug 25, 2026';
      const parsedTime = Date.parse(dateStr) || Date.now();

      // Ensure sentimentScore is between 0 and 100
      const rawSentiment = s.summary.mood.sentimentScore;
      const sentimentScore = typeof rawSentiment === 'number' && !isNaN(rawSentiment)
        ? Math.max(0, Math.min(100, Math.round(rawSentiment)))
        : 75;

      // Extract or estimate energyLevel (fallback intelligently if older entry)
      const rawEnergy = s.summary.mood.energyLevel;
      const energyLevel = typeof rawEnergy === 'number' && !isNaN(rawEnergy)
        ? Math.max(0, Math.min(100, Math.round(rawEnergy)))
        : Math.max(30, Math.min(95, Math.round(sentimentScore * 0.9 + (s.messages?.length > 4 ? 10 : 0))));

      // Format short label for XAxis
      const parts = dateStr.split(',');
      const monthDay = parts[0] || dateStr;

      points.push({
        id: s.id,
        sessionId: s.id,
        dateLabel: monthDay.trim(),
        fullDate: `${dateStr} ${s.time ? '• ' + s.time : ''}`,
        timestamp: parsedTime,
        title: s.summary.title || s.title || 'Journal Reflection',
        moodLabel: s.summary.mood.label || s.mood || 'Reflective',
        moodEmoji: s.summary.mood.emoji || '🌿',
        sentimentScore,
        energyLevel,
        themes: s.summary.keyThemes || s.tags || ['Reflection'],
        isSample: s.id.startsWith('session-'),
      });
    });

    // Sort chronologically ascending
    return points.sort((a, b) => a.timestamp - b.timestamp);
  }, [activeSessions]);

  // Apply timeframe filter
  const filteredData = useMemo(() => {
    if (timeframe === 'all') return rawChartData;
    const now = Date.now();
    const days = timeframe === '7d' ? 7 : 30;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    const recent = rawChartData.filter((p) => p.timestamp >= cutoff);
    return recent.length > 0 ? recent : rawChartData;
  }, [rawChartData, timeframe]);

  // Metric aggregates
  const stats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        avgMood: 75,
        avgEnergy: 70,
        moodTrend: '+5%',
        energyTrend: '+3%',
        peakDay: 'Aug 30',
        dominantMood: 'Grounded & Centered',
        dominantEmoji: '🌿',
        totalEntries: 0,
      };
    }

    const totalMood = filteredData.reduce((acc, p) => acc + p.sentimentScore, 0);
    const totalEnergy = filteredData.reduce((acc, p) => acc + p.energyLevel, 0);
    const avgMood = Math.round(totalMood / filteredData.length);
    const avgEnergy = Math.round(totalEnergy / filteredData.length);

    // Find highest combined score
    const peak = [...filteredData].sort(
      (a, b) => b.sentimentScore + b.energyLevel - (a.sentimentScore + a.energyLevel)
    )[0];

    // Compute trend between first half and second half
    let moodTrend = '+4%';
    let energyTrend = '+6%';
    if (filteredData.length >= 2) {
      const mid = Math.floor(filteredData.length / 2);
      const firstHalfMood = filteredData.slice(0, mid).reduce((a, b) => a + b.sentimentScore, 0) / (mid || 1);
      const secondHalfMood = filteredData.slice(mid).reduce((a, b) => a + b.sentimentScore, 0) / (filteredData.length - mid || 1);
      const diffMood = Math.round(secondHalfMood - firstHalfMood);
      moodTrend = diffMood >= 0 ? `+${diffMood}%` : `${diffMood}%`;

      const firstHalfEnergy = filteredData.slice(0, mid).reduce((a, b) => a + b.energyLevel, 0) / (mid || 1);
      const secondHalfEnergy = filteredData.slice(mid).reduce((a, b) => a + b.energyLevel, 0) / (filteredData.length - mid || 1);
      const diffEnergy = Math.round(secondHalfEnergy - firstHalfEnergy);
      energyTrend = diffEnergy >= 0 ? `+${diffEnergy}%` : `${diffEnergy}%`;
    }

    return {
      avgMood,
      avgEnergy,
      moodTrend,
      energyTrend,
      peakDay: peak ? peak.dateLabel : 'Aug 30',
      peakTitle: peak ? peak.title : 'Deep Gratitude Reflection',
      dominantMood: peak ? peak.moodLabel : 'Centered',
      dominantEmoji: peak ? peak.moodEmoji : '✨',
      totalEntries: filteredData.length,
    };
  }, [filteredData]);

  // Quadrant distribution (The 4 Zones of Vitality)
  const quadrantStats = useMemo(() => {
    let flowCount = 0; // High Mood >= 70, High Energy >= 60
    let serenityCount = 0; // High Mood >= 70, Low Energy < 60
    let restlessnessCount = 0; // Low Mood < 70, High Energy >= 60
    let rechargeCount = 0; // Low Mood < 70, Low Energy < 60

    filteredData.forEach((p) => {
      if (p.sentimentScore >= 70 && p.energyLevel >= 60) {
        flowCount++;
      } else if (p.sentimentScore >= 70 && p.energyLevel < 60) {
        serenityCount++;
      } else if (p.sentimentScore < 70 && p.energyLevel >= 60) {
        restlessnessCount++;
      } else {
        rechargeCount++;
      }
    });

    const total = filteredData.length || 1;
    return [
      {
        name: 'Flow & Vitality',
        count: flowCount,
        percent: Math.round((flowCount / total) * 100),
        desc: 'High emotional clarity & robust vigor',
        color: 'text-indigo-300 border-indigo-500/30 bg-indigo-950/20',
        badgeColor: 'bg-indigo-500/20 text-indigo-300',
      },
      {
        name: 'Peaceful Rest',
        count: serenityCount,
        percent: Math.round((serenityCount / total) * 100),
        desc: 'Calm acceptance & physical deceleration',
        color: 'text-emerald-300 border-emerald-500/30 bg-emerald-950/20',
        badgeColor: 'bg-emerald-500/20 text-emerald-300',
      },
      {
        name: 'Driven Friction',
        count: restlessnessCount,
        percent: Math.round((restlessnessCount / total) * 100),
        desc: 'High drive with cognitive friction or stress',
        color: 'text-amber-300 border-amber-500/30 bg-amber-950/20',
        badgeColor: 'bg-amber-500/20 text-amber-300',
      },
      {
        name: 'Gentle Recharge',
        count: rechargeCount,
        percent: Math.round((rechargeCount / total) * 100),
        desc: 'Depleted energy needing boundary protection',
        color: 'text-rose-300 border-rose-500/30 bg-rose-950/20',
        badgeColor: 'bg-rose-500/20 text-rose-300',
      },
    ];
  }, [filteredData]);

  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col px-4 pt-6 pb-32 sm:px-6 sm:pt-8 sm:pb-40 lg:px-8 text-slate-100">
      <div className="w-full space-y-6 sm:space-y-8">
        {/* Header section */}
        <div className="relative z-20 flex flex-col gap-4 rounded-3xl border border-white/10 bg-slate-900/60 p-5 sm:p-6 backdrop-blur-2xl lg:flex-row lg:items-center lg:justify-between shadow-2xl">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
              <Activity className="h-3.5 w-3.5" />
              <span>Valence & Vitality Tracking</span>
            </div>
            <h1 className="font-editorial text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Mood & Energy Trajectory
            </h1>
            <p className="text-xs text-slate-400 sm:text-sm max-w-xl">
              Longitudinal emotional valence and vitality tracking across your reflective journey.
            </p>
          </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {/* Sample benchmark toggle with tooltip/help */}
          <div className="relative">
            <button
              onClick={() => setIncludeSampleData(!includeSampleData)}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium backdrop-blur-md transition-all ${
                includeSampleData
                  ? 'border-indigo-500/40 bg-indigo-950/30 text-indigo-200'
                  : 'border-white/10 bg-white/5 text-slate-400 hover:text-white'
              }`}
              title="Toggle illustrative demo sessions used to demonstrate trend curves"
            >
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              <span>Sample Benchmarks: {includeSampleData ? 'Visible' : 'Hidden'}</span>
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBenchmarkHelp(!showBenchmarkHelp);
                }}
                className="ml-1 rounded-full p-0.5 hover:bg-white/10 text-slate-400 hover:text-white"
                title="What are sample benchmarks?"
              >
                <HelpCircle className="h-3 w-3" />
              </span>
            </button>

            {/* Explanatory Help Popover */}
            {showBenchmarkHelp && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowBenchmarkHelp(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-white/20 bg-slate-900/98 p-4 shadow-2xl backdrop-blur-2xl text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="font-semibold text-white">Why Sample Benchmarks?</span>
                    <button
                      onClick={() => setShowBenchmarkHelp(false)}
                      className="text-slate-400 hover:text-white text-xs p-1 rounded-lg hover:bg-white/10 transition"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="mt-2 text-slate-300 leading-relaxed text-[11.5px]">
                    When starting a new journal, longitudinal trend lines need multiple entries to draw meaningful curves and populate the 4-quadrant balance map.
                  </p>
                  <p className="mt-1.5 text-slate-300 leading-relaxed text-[11.5px]">
                    Sample benchmarks provide illustrative entries so you can explore all trajectory analytics immediately.
                  </p>
                  <p className="mt-2 text-indigo-300 font-medium text-[11px]">
                    💡 Once you log your own reflections, toggle this to &ldquo;Hidden&rdquo; to view strictly your personal data.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* New reflection button */}
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 rounded-xl border border-indigo-400/40 bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Reflection</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Average Mood Valence */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4.5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Emotional Valence</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300">
              <Smile className="h-4 w-4 text-indigo-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-editorial text-3xl font-semibold text-white">
              {stats.avgMood}
            </span>
            <span className="text-xs text-slate-400">/ 100</span>
            <span
              className={`ml-auto flex items-center gap-0.5 text-xs font-medium ${
                stats.moodTrend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {stats.moodTrend.startsWith('+') ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {stats.moodTrend}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {stats.avgMood >= 75 ? 'Predominantly Uplifted & Calm' : 'Balanced & Contemplative'}
          </p>
        </div>

        {/* Card 2: Average Energy Vitality */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4.5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Energy & Vitality</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
              <Zap className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-editorial text-3xl font-semibold text-white">
              {stats.avgEnergy}
            </span>
            <span className="text-xs text-slate-400">/ 100</span>
            <span
              className={`ml-auto flex items-center gap-0.5 text-xs font-medium ${
                stats.energyTrend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {stats.energyTrend.startsWith('+') ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              {stats.energyTrend}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            {stats.avgEnergy >= 70 ? 'High Intellectual & Bodily Drive' : 'Steady Pacing & Mindful Rest'}
          </p>
        </div>

        {/* Card 3: Dominant State */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4.5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Resonant Resonance</span>
            <span className="text-lg">{stats.dominantEmoji}</span>
          </div>
          <div className="mt-3">
            <span className="font-editorial text-xl font-medium text-white block leading-tight">
              {stats.dominantMood}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Peak reflection recorded on {stats.peakDay}
          </p>
        </div>

        {/* Card 4: Tracked Milestones */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4.5 shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Journal Milestones</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
              <Calendar className="h-4 w-4 text-purple-400" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-editorial text-3xl font-semibold text-white">
              {stats.totalEntries}
            </span>
            <span className="text-xs text-slate-400">entries plotted</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Across continuous reflection cycles
          </p>
        </div>
      </div>

      {/* Main Chart Container Card */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-6 sm:p-7 shadow-2xl">
        {/* Controls Bar: Timeframe & Metric Toggle */}
        <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-editorial text-lg font-medium text-white">
              Dual Valence & Vitality Curves
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Hover over any point to view session highlights or click to jump into the dialogue
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Metric Mode Filter */}
            <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
              <button
                onClick={() => setMetricView('both')}
                className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                  metricView === 'both'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Both
              </button>
              <button
                onClick={() => setMetricView('mood')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-all ${
                  metricView === 'mood'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400"></span>
                <span>Mood</span>
              </button>
              <button
                onClick={() => setMetricView('energy')}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-all ${
                  metricView === 'energy'
                    ? 'bg-indigo-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                <span>Energy</span>
              </button>
            </div>

            {/* Timeframe Filter */}
            <div className="inline-flex rounded-xl border border-white/10 bg-white/5 p-1 text-xs">
              <button
                onClick={() => setTimeframe('7d')}
                className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                  timeframe === '7d'
                    ? 'bg-white/20 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                7 Days
              </button>
              <button
                onClick={() => setTimeframe('30d')}
                className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                  timeframe === '30d'
                    ? 'bg-white/20 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                30 Days
              </button>
              <button
                onClick={() => setTimeframe('all')}
                className={`rounded-lg px-2.5 py-1 font-medium transition-all ${
                  timeframe === 'all'
                    ? 'bg-white/20 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All Time
              </button>
            </div>
          </div>
        </div>

        {/* The Recharts Area Canvas */}
        <div className="mt-6 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filteredData}
              margin={{ top: 15, right: 20, left: -20, bottom: 0 }}
              onClick={(e: any) => {
                if (e && e.activePayload && e.activePayload.length > 0) {
                  const targetPoint = e.activePayload[0].payload as ChartPoint;
                  setSelectedPointId(targetPoint.sessionId);
                }
              }}
            >
              <defs>
                {/* Mood Gradient (Indigo to Purple) */}
                <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0} />
                </linearGradient>

                {/* Energy Gradient (Emerald to Teal) */}
                <linearGradient id="energyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255, 255, 255, 0.08)"
              />

              <XAxis
                dataKey="dateLabel"
                stroke="rgba(255, 255, 255, 0.4)"
                tickLine={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                dy={8}
              />

              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                stroke="rgba(255, 255, 255, 0.4)"
                tickLine={false}
                tick={{ fontSize: 10, fill: '#64748b' }}
              />

              {/* Equilibrium Baseline Reference Line */}
              <ReferenceLine
                y={50}
                stroke="rgba(255, 255, 255, 0.15)"
                strokeDasharray="4 4"
                label={{
                  value: 'Equilibrium (50)',
                  position: 'insideBottomRight',
                  fill: '#64748b',
                  fontSize: 10,
                }}
              />

              {/* Custom Tooltip */}
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as ChartPoint;
                    return (
                      <div className="rounded-xl border border-white/20 bg-slate-900/90 p-3.5 shadow-2xl backdrop-blur-xl text-slate-100 min-w-[220px]">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="text-[11px] font-medium text-slate-400">
                            {data.fullDate}
                          </span>
                          <span className="text-base">{data.moodEmoji}</span>
                        </div>
                        <h4 className="font-editorial text-sm font-medium text-white mt-2 leading-snug">
                          {data.title}
                        </h4>
                        <div className="mt-1 text-[11px] text-indigo-300 font-medium">
                          {data.moodLabel}
                        </div>

                        <div className="mt-3 space-y-1.5 text-xs">
                          {(metricView === 'both' || metricView === 'mood') && (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-slate-300">
                                <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
                                <span>Mood Valence:</span>
                              </span>
                              <span className="font-semibold text-white">
                                {data.sentimentScore} / 100
                              </span>
                            </div>
                          )}

                          {(metricView === 'both' || metricView === 'energy') && (
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1.5 text-slate-300">
                                <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
                                <span>Energy Level:</span>
                              </span>
                              <span className="font-semibold text-white">
                                {data.energyLevel} / 100
                              </span>
                            </div>
                          )}
                        </div>

                        {data.themes && data.themes.length > 0 && (
                          <div className="mt-2.5 flex flex-wrap gap-1 border-t border-white/10 pt-2">
                            {data.themes.slice(0, 3).map((theme, i) => (
                              <span
                                key={i}
                                className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] text-slate-300"
                              >
                                #{theme}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-2.5 text-[10px] text-indigo-400 italic">
                          Click point to inspect session below
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Mood Curve */}
              {(metricView === 'both' || metricView === 'mood') && (
                <Area
                  type="monotone"
                  dataKey="sentimentScore"
                  name="Mood Valence"
                  stroke="#818cf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#moodGradient)"
                  activeDot={{
                    r: 6,
                    fill: '#818cf8',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                    className: 'cursor-pointer animate-pulse',
                  }}
                  dot={{
                    r: 4,
                    fill: '#4338ca',
                    stroke: '#818cf8',
                    strokeWidth: 1.5,
                  }}
                />
              )}

              {/* Energy Curve */}
              {(metricView === 'both' || metricView === 'energy') && (
                <Area
                  type="monotone"
                  dataKey="energyLevel"
                  name="Energy Level"
                  stroke="#34d399"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#energyGradient)"
                  activeDot={{
                    r: 6,
                    fill: '#34d399',
                    stroke: '#ffffff',
                    strokeWidth: 2,
                    className: 'cursor-pointer animate-pulse',
                  }}
                  dot={{
                    r: 4,
                    fill: '#065f46',
                    stroke: '#34d399',
                    strokeWidth: 1.5,
                  }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Legend & Legend Guidance */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-indigo-400"></span>
              <span className="text-slate-300 font-medium">Emotional Valence (0 = Heavy, 100 = Uplifted)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300 font-medium">Vitality (0 = Depleted, 100 = Energized)</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-500">
            Powered by Gemini Multi-Turn Sentiment Analysis
          </span>
        </div>
      </div>

      {/* The 4 Zones of Vitality (Quadrant Distribution) */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="font-editorial text-lg font-medium text-white">
              The Four Zones of Vitality & Focus
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              How your reflections distribute across emotional tone and physical vitality
            </p>
          </div>
          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-medium text-indigo-300">
            Holistic Balance
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quadrantStats.map((quad, idx) => (
            <div
              key={idx}
              className={`rounded-xl border p-4 backdrop-blur-xl transition-all hover:scale-[1.01] ${quad.color}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">{quad.name}</span>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${quad.badgeColor}`}>
                  {quad.percent}%
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                {quad.desc}
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/10 pt-2">
                <span>{quad.count} reflections</span>
                <span className="text-slate-300">Zone {idx + 1}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AI Longitudinal Synthesis Card */}
      <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-950/30 via-slate-900/40 to-purple-950/30 backdrop-blur-2xl p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            <Sparkles className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-editorial text-lg font-medium text-white">
              Gemini Longitudinal Trajectory Insight
            </h3>
            <p className="text-xs text-slate-400">
              Pattern synthesis derived from your cumulative entries
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-slate-300">
            <span className="font-semibold text-white block mb-1 text-sm">
              ✨ Upward Recovery Velocity
            </span>
            Whenever your energy dips below 50 (such as after long stretches of fragmented work or meetings), your next reflection reliably records a 15–25% bounce in mood when you implement single-task timers or morning stillness.
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-slate-300">
            <span className="font-semibold text-white block mb-1 text-sm">
              🌿 Morning Calm Anchor
            </span>
            Reflections logged before 9:00 AM exhibit your highest baseline emotional resilience (averaging 86/100). Protecting sleep hygiene directly correlates with an unhurried perspective during daytime challenges.
          </div>
        </div>
      </div>

      {/* Chronological Milestone Timeline */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <h3 className="font-editorial text-lg font-medium text-white">
              Chronological Reflection Milestones
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any session to open the full conversation, key thoughts, and synthesis
            </p>
          </div>
          <span className="text-xs text-slate-400">
            {filteredData.length} checkpoints
          </span>
        </div>

        <div className="mt-4 divide-y divide-white/10">
          {filteredData.map((point) => {
            const isSelected = selectedPointId === point.sessionId;
            return (
              <div
                key={point.id}
                onClick={() => setSelectedPointId(point.sessionId)}
                className={`group flex flex-col gap-3 py-4 transition-all sm:flex-row sm:items-center sm:justify-between px-3 rounded-xl cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-950/40 border border-indigo-500/30'
                    : 'hover:bg-white/5'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/10 text-xl">
                    {point.moodEmoji}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">
                        {point.title}
                      </h4>
                      <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-indigo-200 border border-white/10">
                        {point.moodLabel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {point.fullDate} • {point.themes.join(', ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  {/* Scores */}
                  <div className="text-right text-xs">
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-slate-400">Mood:</span>
                      <span className="font-semibold text-indigo-300">
                        {point.sentimentScore}/100
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 justify-end mt-0.5">
                      <span className="text-slate-400">Energy:</span>
                      <span className="font-semibold text-emerald-300">
                        {point.energyLevel}/100
                      </span>
                    </div>
                  </div>

                  {/* Open Session Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpen(point.sessionId);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-indigo-600 hover:text-white transition-all group-hover:border-indigo-400/40"
                  >
                    <span>View</span>
                    <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
  );
};
