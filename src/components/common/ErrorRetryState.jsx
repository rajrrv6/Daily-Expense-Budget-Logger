import React from 'react';

export default function ErrorRetryState({ message = 'An error occurred while loading data.', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-red-950/20 border border-red-900/50 rounded-xl min-h-[250px]">
      <span className="text-3xl mb-3" role="img" aria-label="Error Alert">
        ⚠️
      </span>
      <h3 className="text-sm font-semibold text-red-200">Load Failure</h3>
      <p className="text-xs text-red-400 mt-1 max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 px-4 py-2 text-xs font-semibold text-red-200 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/60 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
