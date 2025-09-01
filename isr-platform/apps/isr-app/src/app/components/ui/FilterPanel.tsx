import React, { useState, useEffect } from 'react';
import { useAnalysisStore } from '../../stores/analysisStore';

export function FilterPanel() {
  const { filterSettings, setFilterSettings, analysisResults } = useAnalysisStore();
  const [localScore, setLocalScore] = useState(filterSettings.minPersistenceScore);

  useEffect(() => {
    setLocalScore(filterSettings.minPersistenceScore);
  }, [filterSettings.minPersistenceScore]);

  const handleScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setLocalScore(value);
  };

  const handleScoreChangeEnd = () => {
    setFilterSettings({ minPersistenceScore: localScore });
  };

  const getFilteredCount = () => {
    return analysisResults.filter(d => d.persistenceScore >= localScore).length;
  };

  const getThreatLevelColor = (score: number): string => {
    if (score >= 0.8) return 'bg-red-500';
    if (score >= 0.6) return 'bg-orange-500';
    if (score >= 0.3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="absolute top-4 left-4 z-[1000] bg-white shadow-lg rounded-lg p-4 min-w-[280px]">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Filters</h3>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="persistence-score" className="block text-sm font-medium text-gray-700 mb-2">
            Minimum Persistence Score
          </label>
          
          <div className="space-y-2">
            <input
              id="persistence-score"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={localScore}
              onChange={handleScoreChange}
              onMouseUp={handleScoreChangeEnd}
              onTouchEnd={handleScoreChangeEnd}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #10b981 0%, #f59e0b 30%, #f97316 60%, #ef4444 80%)`
              }}
            />
            
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">0%</span>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${getThreatLevelColor(localScore)}`}></div>
                <span className="text-sm font-semibold text-gray-700">
                  {(localScore * 100).toFixed(0)}%
                </span>
              </div>
              <span className="text-xs text-gray-500">100%</span>
            </div>
          </div>
          
          <div className="mt-2 text-xs text-gray-600">
            Showing {getFilteredCount()} of {analysisResults.length} devices
          </div>
        </div>

        <div className="border-t pt-3">
          <h4 className="text-xs font-semibold text-gray-600 mb-2 uppercase">Threat Levels</h4>
          <div className="space-y-1 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Low (0-30%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-gray-600">Medium (30-60%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-orange-500"></div>
              <span className="text-gray-600">High (60-80%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600">Critical (80-100%)</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setFilterSettings({ minPersistenceScore: 0 })}
          className="w-full px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          Reset Filter
        </button>
      </div>
    </div>
  );
}