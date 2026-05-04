import { Mic, WandSparkles } from "lucide-react";

export function VoiceBillingPanel({ transcript, setTranscript, onParse, onStartVoice }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="section-title">AI Voice Billing</p>
          <h2 className="mt-2 text-xl font-semibold text-brand-100">Bol ke bill banao</h2>
        </div>
        <button className="pill-button flex items-center gap-2" onClick={onStartVoice}>
          <Mic size={16} />
          Speak
        </button>
      </div>

      <textarea
        rows="4"
        className="mt-4 w-full rounded-2xl border border-brand-700 bg-brand-800 px-4 py-3 outline-none"
        placeholder="Example: 2 butter chicken, 4 tandoori roti"
        value={transcript}
        onChange={(event) => setTranscript(event.target.value)}
      />

      <button className="pill-button mt-3 flex items-center gap-2" onClick={onParse}>
        <WandSparkles size={16} />
        Parse Order
      </button>
    </div>
  );
}
