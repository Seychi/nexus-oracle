import React from 'react';
import { useStore } from '../../store/gameStore';
import { buildPrompt } from '../../api/claudeAnalysis';
import Markdown from 'react-markdown';

export default function AiTab() {
  const { game, analysis } = useStore();
  if (!analysis) return null;

  const handleAnalyse = () => {
    if (!game || analysis.isAnalysing) return;
    window.electronAPI.requestAnalysis(buildPrompt(game));
  };

  return (
    <div className="flex flex-col gap-2 p-2 overflow-y-auto">
      {/* Trigger button */}
      <button
        onClick={handleAnalyse}
        disabled={analysis.isAnalysing || !game}
        className={`w-full py-2 rounded border text-xs font-bold uppercase tracking-widest transition-colors
          ${analysis.isAnalysing
            ? 'bg-lol-card border-white/[0.07] text-lol-dim cursor-wait'
            : 'bg-lol-gold/10 border-lol-gold/40 text-lol-gold hover:bg-lol-gold/20 active:bg-lol-gold/30'}`}
      >
        {analysis.isAnalysing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 border-2 border-lol-gold/30 border-t-lol-gold rounded-full animate-spin" />
            Analysing…
          </span>
        ) : '🧠 Run AI Analysis'}
      </button>

      {/* Auto-analysis note */}
      <div className="text-[8px] text-lol-dim text-center -mt-1">
        Auto-triggers on First Blood, Dragon/Baron kills, and teamfights
      </div>

      {/* Analysis output */}
      {analysis.claudeAnalysis ? (
        <div className="bg-lol-card border border-white/[0.07] rounded p-2.5">
          <div className="text-[9px] text-lol-gold font-bold uppercase tracking-widest mb-2">AI Insights</div>
          <div className="text-[10px] text-lol-text leading-relaxed prose prose-invert max-w-none
            [&_h3]:text-[11px] [&_h3]:font-bold [&_h3]:text-lol-gold [&_h3]:mt-3 [&_h3]:mb-1
            [&_ul]:pl-3 [&_li]:mb-0.5 [&_strong]:text-white [&_p]:mb-1">
            <Markdown>{analysis.claudeAnalysis}</Markdown>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-lol-dim py-8">
          <span className="text-3xl">🧠</span>
          <p className="text-xs">No analysis yet</p>
          <p className="text-[9px] text-lol-dim/60">Click above or wait for an auto-trigger event</p>
        </div>
      )}
    </div>
  );
}
