import React, { useState } from 'react';

interface Props { onClose: () => void; }

export default function Settings({ onClose }: Props) {
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!key.trim()) return;
    window.electronAPI.setApiKey(key.trim());
    setSaved(true);
    setTimeout(onClose, 800);
  };

  return (
    <div className="absolute inset-0 z-50 bg-lol-bg/95 flex flex-col p-4 gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-lol-gold uppercase tracking-widest">Settings</span>
        <button onClick={onClose} className="text-lol-dim hover:text-lol-text text-sm">✕</button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] text-lol-dim">Anthropic API Key</label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="sk-ant-..."
          className="bg-black/30 border border-white/10 rounded px-2 py-1.5 text-xs text-lol-text placeholder-lol-dim focus:outline-none focus:border-lol-gold w-full"
        />
        <p className="text-[9px] text-lol-dim leading-relaxed">
          Get your key at console.anthropic.com. Stored in memory — put it in api.env for persistence.
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={!key.trim() || saved}
        className="w-full py-1.5 bg-lol-gold text-lol-bg text-xs font-bold rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
      >
        {saved ? '✅ Saved!' : 'Save'}
      </button>

      <div className="mt-auto text-[9px] text-lol-dim border-t border-white/[0.07] pt-3 leading-relaxed">
        <div className="font-semibold text-lol-dim mb-1">Hotkeys</div>
        <div>Ctrl+Shift+O — Toggle overlay</div>
        <div>🔒 button — Click-through mode</div>
        <div className="mt-2 text-[8px] opacity-60">
          Nexus Oracle is not endorsed by Riot Games and does not reflect the views or opinions of Riot Games.
        </div>
      </div>
    </div>
  );
}
