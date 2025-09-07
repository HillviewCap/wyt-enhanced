import React from 'react';

export function ThreatLevelLegend() {
  const threatLevels = [
    { level: 'Critical', color: '#dc2626', icon: '🚨', score: '0.9-1.0', description: 'Active stalking' },
    { level: 'High', color: '#ef4444', icon: '⚠️', score: '0.7-0.9', description: 'Likely surveillance' },
    { level: 'Medium', color: '#f59e0b', icon: '⚡', score: '0.5-0.7', description: 'Potentially suspicious' },
    { level: 'Low', color: '#22c55e', icon: '👁️', score: '0.3-0.5', description: 'Worth monitoring' },
  ];

  return (
    <div className="absolute bottom-4 right-4 z-[1000] bg-white shadow-lg rounded-lg p-4 min-w-64">
      <h4 className="font-bold text-gray-800 mb-2">🎯 Threat Level Legend</h4>
      <div className="space-y-2">
        {threatLevels.map((threat) => (
          <div key={threat.level} className="flex items-center space-x-3">
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
              style={{ backgroundColor: threat.color }}
            />
            <div className="flex-1">
              <div className="flex items-center space-x-1">
                <span className="text-sm">{threat.icon}</span>
                <span className="font-medium text-sm">{threat.level}</span>
                <span className="text-xs text-gray-500">({threat.score})</span>
              </div>
              <div className="text-xs text-gray-600">{threat.description}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="text-xs text-gray-500">
          <div className="mb-1"><strong>Legend:</strong></div>
          <div>📱 Mobile Device</div>
          <div>💻 Computer/VM</div>
          <div>🍓 IoT/Embedded</div>
          <div className="mt-1">
            <span className="inline-block w-2 h-2 bg-green-500 rounded mr-1"></span>
            <span className="text-xs">First location</span>
          </div>
          <div>
            <span className="inline-block w-2 h-2 bg-red-500 rounded mr-1"></span>
            <span className="text-xs">Last location</span>
          </div>
          <div>
            <span className="inline-block w-6 h-0 border-t-2 border-dashed border-gray-400 mr-1"></span>
            <span className="text-xs">Movement path</span>
          </div>
        </div>
      </div>
    </div>
  );
}