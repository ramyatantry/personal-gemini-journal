import { useState } from 'react';
import { JournalSummary } from '../types';
import {
  Sparkles,
  CheckCircle2,
  Copy,
  Check,
  Download,
  ArrowLeft,
  Tag,
  Smile,
  ListOrdered,
  Lightbulb,
  Clock,
  Brain,
  CheckSquare,
  FileText
} from 'lucide-react';

interface JournalSummaryAreaProps {
  summary: JournalSummary | null | undefined;
  sessionTitle: string;
  isGenerating?: boolean;
  onContinueJournaling: () => void;
  onFinishJournal?: () => void;
  hasMessages: boolean;
}

export function JournalSummaryArea({
  summary,
  sessionTitle,
  isGenerating = false,
  onContinueJournaling,
  onFinishJournal,
  hasMessages,
}: JournalSummaryAreaProps) {
  const [copied, setCopied] = useState(false);
  const [completedActionItems, setCompletedActionItems] = useState<Record<number, boolean>>({});

  const displayTitle = summary?.title || sessionTitle;
  const keyThoughts = summary?.keyThoughts && summary.keyThoughts.length > 0
    ? summary.keyThoughts
    : (summary?.takeaways || ['Reflected on current inner state with honesty.']);
  const actionItems = summary?.actionItems && summary.actionItems.length > 0
    ? summary.actionItems
    : (summary?.takeaways || ['Practice gentle awareness throughout the day.']);
  const conciseSummary = summary?.summary || summary?.reflection?.slice(0, 240) + '...';

  const toggleActionItem = (index: number) => {
    setCompletedActionItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleCopy = () => {
    if (!summary) return;
    const textToCopy = `# ${displayTitle} - Journal Summary
Generated: ${summary.generatedAt}
Mood: ${summary.mood.label} (${summary.mood.emoji})

## Concise Summary
${conciseSummary}

## Key Thoughts
${keyThoughts.map((t, idx) => `- ${t}`).join('\n')}

## Action Items
${actionItems.map((a, idx) => `- [ ] ${a}`).join('\n')}

## Synthesis & Reflection
${summary.reflection}

## Key Themes
${summary.keyThemes.join(', ')}

## Mindful Prompt
${summary.mindfulPrompt}`;

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!summary) return;
    const content = `# ${displayTitle}
Generated: ${summary.generatedAt}
Mood: ${summary.mood.label} (${summary.mood.emoji})

=== CONCISE SUMMARY ===
${conciseSummary}

=== KEY THOUGHTS ===
${keyThoughts.map((t, idx) => `${idx + 1}. ${t}`).join('\n')}

=== ACTION ITEMS ===
${actionItems.map((a, idx) => `[ ] ${a}`).join('\n')}

=== SYNTHESIS & REFLECTION ===
${summary.reflection}

=== KEY THEMES ===
${summary.keyThemes.join(', ')}

=== MINDFUL INQUIRY ===
${summary.mindfulPrompt}
`;

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${displayTitle.toLowerCase().replace(/[^a-z0-9]/g, '-')}-summary.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Case 1: Currently generating summary
  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-8 text-center shadow-2xl">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 shadow-lg">
          <Sparkles className="h-7 w-7 animate-spin duration-3000 text-indigo-400" />
        </div>
        <h3 className="font-editorial mt-4 text-xl font-medium text-white">
          Synthesizing Your Journal Reflection...
        </h3>
        <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-400">
          Gemini is distilling the conversation into a title, concise summary, key thoughts, and actionable items.
        </p>
        <div className="mt-6 flex items-center gap-1.5">
          <span className="h-2 w-2 animate-ping rounded-full bg-indigo-400"></span>
          <span className="text-[11px] font-medium text-indigo-300">Extracting key thoughts & action items...</span>
        </div>
      </div>
    );
  }

  // Case 2: Placeholder state when summary is not yet generated
  if (!summary) {
    return (
      <div className="rounded-2xl border border-dashed border-white/20 bg-white/[0.04] backdrop-blur-xl p-6 text-slate-200 shadow-xl">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300">
              <Sparkles className="h-5 w-5 text-indigo-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">
                Journal Summary Ready to Generate
              </h4>
              <p className="mt-0.5 text-xs text-slate-400 leading-relaxed max-w-xl">
                When you are ready to conclude this reflection, click &ldquo;Finish Journal&rdquo;. Gemini will synthesize your dialogue into a generated title, concise summary, key thoughts, and action items.
              </p>
            </div>
          </div>

          {onFinishJournal && (
            <button
              onClick={onFinishJournal}
              disabled={!hasMessages}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-lg transition-all ${
                hasMessages
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 border border-indigo-400/30 hover:scale-[1.02] active:scale-95'
                  : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed'
              }`}
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-300" />
              <span>Finish Journal & Synthesize</span>
            </button>
          )}
        </div>

        {/* Placeholder skeleton preview */}
        <div className="mt-6 grid gap-3 pt-4 border-t border-white/10 sm:grid-cols-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Concise Summary</span>
            <div className="mt-2 space-y-1.5">
              <div className="h-2 w-full rounded bg-white/15"></div>
              <div className="h-2 w-4/5 rounded bg-white/10"></div>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Key Thoughts</span>
            <div className="mt-2 space-y-1.5">
              <div className="h-2 w-5/6 rounded bg-indigo-500/20 border border-indigo-500/30"></div>
              <div className="h-2 w-2/3 rounded bg-indigo-500/20 border border-indigo-500/30"></div>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Action Items</span>
            <div className="mt-2 space-y-1.5">
              <div className="h-2 w-full rounded bg-emerald-500/20 border border-emerald-500/30"></div>
              <div className="h-2 w-3/4 rounded bg-emerald-500/20 border border-emerald-500/30"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: Summary is ready and available
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl transition-all text-slate-200">
      {/* Summary Header */}
      <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-300 shrink-0">
            <Sparkles className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-editorial text-xl font-medium text-white tracking-tight">
                {displayTitle}
              </h3>
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300 border border-emerald-500/20">
                Finished
              </span>
            </div>
            <p className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
              <Clock className="h-3 w-3" />
              <span>Synthesized with Gemini on {summary.generatedAt} • {summary.wordCount} words analyzed</span>
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white backdrop-blur-md cursor-pointer"
            title="Copy Markdown Summary"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white backdrop-blur-md cursor-pointer"
            title="Download Markdown"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="mt-6 space-y-6">
        {/* 1. Concise Summary Card */}
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 backdrop-blur-xl p-4.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300">
            <FileText className="h-4 w-4 text-indigo-400" />
            <span>Concise Summary</span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-200 font-editorial text-[15px]">
            {conciseSummary}
          </p>
        </div>

        {/* 2. Key Thoughts & Action Items Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Key Thoughts Card */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 uppercase tracking-wider">
              <Brain className="h-4 w-4 text-indigo-400" />
              <span>Key Thoughts</span>
            </div>
            <ul className="mt-3 space-y-2.5">
              {keyThoughts.map((thought, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs leading-relaxed text-slate-300"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400"></span>
                  <span>{thought}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Items Card */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 uppercase tracking-wider">
              <CheckSquare className="h-4 w-4 text-emerald-400" />
              <span>Action Items</span>
            </div>
            <ul className="mt-3 space-y-2">
              {actionItems.map((action, idx) => {
                const isChecked = !!completedActionItems[idx];
                return (
                  <li
                    key={idx}
                    onClick={() => toggleActionItem(idx)}
                    className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-xs leading-relaxed cursor-pointer transition-all ${
                      isChecked
                        ? 'border-emerald-500/30 bg-emerald-950/20 text-slate-400 line-through'
                        : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleActionItem(idx)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-white/20 bg-white/10 text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="flex-1">{action}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* 3. Detailed Synthesis & Reflection */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
            Synthesis & Reflection Narrative
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-slate-300 font-editorial text-[14.5px] whitespace-pre-line">
            {summary.reflection}
          </p>
        </div>

        {/* 4. Mood & Themes Cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Mood Card */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Smile className="h-4 w-4 text-indigo-400" />
              <span>Emotional Tone & Resonance</span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-2xl">{summary.mood.emoji}</span>
              <div>
                <span className="text-xs font-semibold text-white">
                  {summary.mood.label}
                </span>
                <p className="mt-0.5 text-[11px] text-slate-400 leading-snug">
                  {summary.mood.description}
                </p>
              </div>
            </div>
          </div>

          {/* Key Themes Card */}
          <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Tag className="h-4 w-4 text-indigo-400" />
              <span>Key Themes Explored</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {summary.keyThemes.map((theme, idx) => (
                <span
                  key={idx}
                  className="rounded-lg border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium text-indigo-200 shadow-md"
                >
                  {theme}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 5. Mindful Inquiry / Next Prompt */}
        <div className="rounded-xl border border-purple-500/30 bg-purple-950/30 backdrop-blur-xl p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-300">
            <Lightbulb className="h-4 w-4 text-purple-400" />
            <span>Mindful Inquiry for Today</span>
          </div>
          <p className="mt-1.5 text-xs italic leading-relaxed text-purple-100 font-editorial text-[14px]">
            &ldquo;{summary.mindfulPrompt}&rdquo;
          </p>
        </div>
      </div>

      {/* Footer link to continue chatting */}
      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
        <button
          onClick={onContinueJournaling}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-white cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Resume reflection dialogue</span>
        </button>

        <span className="text-[11px] text-slate-500">
          Reflected with Gemini
        </span>
      </div>
    </div>
  );
}

