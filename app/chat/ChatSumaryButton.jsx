'use client';

import { useState } from 'react';

export default function AiCreateSummaryButton({ LogData, onSummaryGenerated, loading: parentLoading }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGenerateSummary() {
    setLoading(true);
    setSummary('');

    try {
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: LogData }),
      });

      const json = await res.json();
      const generated = json.summary || 'No summary generated.';
      setSummary(generated);

      if (onSummaryGenerated) {
        await onSummaryGenerated(generated);
      }
    } catch (err) {
      console.error(err);
      setSummary('Error generating summary.');
    } finally {
      setLoading(false);
    }
  }

  const isLoading = loading || parentLoading;

  return (
    <div className="flex flex-col w-full max-w-md py-6 mx-auto">
      <button
        onClick={handleGenerateSummary}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded-md"
      >
        {isLoading ? 'Generating...' : 'Generate Summary!'}
      </button>

      <div className="mt-4 whitespace-pre-wrap text-gray-800">
        {summary || 'No summary yet.'}
      </div>
    </div>
  );
}
