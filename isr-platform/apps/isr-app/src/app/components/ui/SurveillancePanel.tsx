import React, { useState } from 'react';

interface SuspiciousDevice {
  id: string;
  macAddress: string;
  persistenceScore: number;
  totalAppearances: number;
  locationCount: number;
  firstSeen: string;
  lastSeen: string;
  reasons: string[];
  locations: Array<{
    latitude: number;
    longitude: number;
    timestamp: string;
    signalStrength?: number;
  }>;
  stalking_score?: number;
  stalking_reasons?: string[];
}

interface SurveillanceAnalysisResult {
  totalDevices: number;
  suspiciousDevices: number;
  highThreatDevices: number;
  multiLocationDevices: number;
  locationSessions: number;
  suspiciousDeviceList: SuspiciousDevice[];
  analysisTimestamp: string;
  timeWindowHours: number;
}

interface SurveillancePanelProps {
  analysisResult: SurveillanceAnalysisResult | null;
  selectedDevice: SuspiciousDevice | null;
  onDeviceSelect: (device: SuspiciousDevice | null) => void;
  timeWindowHours: number;
  onTimeWindowChange: (hours: number) => void;
  minThreatLevel: number;
  onThreatLevelChange: (level: number) => void;
}

export function SurveillancePanel({
  analysisResult,
  selectedDevice,
  onDeviceSelect,
  timeWindowHours,
  onTimeWindowChange,
  minThreatLevel,
  onThreatLevelChange
}: SurveillancePanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'devices' | 'settings'>('overview');

  if (!isExpanded) {
    return (
      <div className="absolute bottom-4 left-4 z-[1000]">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-white shadow-lg rounded-lg p-3 text-gray-700 hover:bg-gray-50"
        >
          <span className="text-xl">🚨</span>
        </button>
      </div>
    );
  }

  const getThreatIcon = (score: number): string => {
    if (score >= 0.9) return '🚨';
    if (score >= 0.7) return '⚠️';
    if (score >= 0.5) return '⚡';
    return '👁️';
  };

  const getThreatLevel = (score: number): string => {
    if (score >= 0.9) return 'CRITICAL';
    if (score >= 0.7) return 'HIGH';
    if (score >= 0.5) return 'MEDIUM';
    return 'LOW';
  };

  const getThreatColor = (score: number): string => {
    if (score >= 0.9) return 'text-red-800';
    if (score >= 0.7) return 'text-red-600';
    if (score >= 0.5) return 'text-yellow-600';
    return 'text-green-600';
  };

  const downloadReport = async () => {
    try {
      const response = await fetch(`/api/surveillance/report?timeWindowHours=${timeWindowHours}&minPersistenceScore=${minThreatLevel}&format=markdown`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `surveillance_report_${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const exportKML = async () => {
    try {
      const response = await fetch(`/api/surveillance/export/kml?timeWindowHours=${timeWindowHours}&minPersistenceScore=${minThreatLevel}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `surveillance_analysis_${new Date().toISOString().split('T')[0]}.kml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting KML:', error);
    }
  };

  return (
    <div className="absolute bottom-4 left-4 z-[1000] bg-white shadow-lg rounded-lg w-96 max-h-[70vh] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-2">
          <span className="text-xl">🚨</span>
          <h3 className="font-bold text-gray-800">Surveillance Analysis</h3>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'devices', label: 'Devices' },
          { id: 'settings', label: 'Settings' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'overview' && analysisResult && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-50 p-3 rounded">
                <div className="text-blue-800 font-medium">Total Devices</div>
                <div className="text-2xl font-bold text-blue-900">{analysisResult.totalDevices}</div>
              </div>
              <div className="bg-yellow-50 p-3 rounded">
                <div className="text-yellow-800 font-medium">Suspicious</div>
                <div className="text-2xl font-bold text-yellow-900">{analysisResult.suspiciousDevices}</div>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <div className="text-red-800 font-medium">High Threat</div>
                <div className="text-2xl font-bold text-red-900">{analysisResult.highThreatDevices}</div>
              </div>
              <div className="bg-purple-50 p-3 rounded">
                <div className="text-purple-800 font-medium">Multi-Location</div>
                <div className="text-2xl font-bold text-purple-900">{analysisResult.multiLocationDevices}</div>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              <div>Analysis Window: {analysisResult.timeWindowHours} hours</div>
              <div>Last Updated: {new Date(analysisResult.analysisTimestamp).toLocaleString()}</div>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={downloadReport}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium"
              >
                📄 Download Report
              </button>
              <button
                onClick={exportKML}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded text-sm font-medium"
              >
                🗺️ Export KML
              </button>
            </div>
          </div>
        )}

        {activeTab === 'devices' && analysisResult && (
          <div className="p-4">
            <div className="text-sm text-gray-600 mb-3">
              Top {Math.min(10, analysisResult.suspiciousDeviceList.length)} suspicious devices:
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {analysisResult.suspiciousDeviceList.slice(0, 10).map((device) => {
                const score = device.stalking_score || device.persistenceScore;
                const isSelected = selectedDevice?.id === device.id;
                
                return (
                  <button
                    key={device.id}
                    onClick={() => onDeviceSelect(isSelected ? null : device)}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <span>{getThreatIcon(score)}</span>
                        <span className="font-mono text-sm">{device.macAddress}</span>
                      </div>
                      <span className={`text-xs font-medium ${getThreatColor(score)}`}>
                        {getThreatLevel(score)}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Score: {score.toFixed(3)} | Appearances: {device.totalAppearances}</div>
                      <div>Locations: {device.locationCount} | Active: {Math.ceil((new Date(device.lastSeen).getTime() - new Date(device.firstSeen).getTime()) / (1000 * 60 * 60))}h</div>
                      
                      {device.stalking_score && (
                        <div className="text-red-600 font-medium">
                          🚨 STALKING: {device.stalking_score.toFixed(3)}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500 truncate">
                        {device.reasons[0]}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Window (hours)
              </label>
              <select
                value={timeWindowHours}
                onChange={(e) => onTimeWindowChange(Number(e.target.value))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value={1}>1 hour</option>
                <option value={6}>6 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
                <option value={48}>48 hours</option>
                <option value={72}>72 hours</option>
                <option value={168}>1 week</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Threat Level: {minThreatLevel.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={minThreatLevel}
                onChange={(e) => onThreatLevelChange(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.1 (Low)</span>
                <span>0.5 (Medium)</span>
                <span>1.0 (Critical)</span>
              </div>
            </div>

            <div className="text-xs text-gray-500">
              <div className="mb-2"><strong>Analysis Parameters:</strong></div>
              <div>• Persistence scoring based on appearance frequency, location diversity, and time span</div>
              <div>• Stalking detection for devices with scores ≥ 0.7 and multi-location patterns</div>
              <div>• Geographic clustering with 50-meter threshold for unique locations</div>
            </div>
          </div>
        )}
      </div>

      {/* Selected device details */}
      {selectedDevice && (
        <div className="border-t bg-gray-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-gray-800">Selected Device</h4>
            <button
              onClick={() => onDeviceSelect(null)}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              ✕
            </button>
          </div>
          
          <div className="text-sm space-y-1">
            <div className="font-mono">{selectedDevice.macAddress}</div>
            <div className="flex items-center space-x-4">
              <span>Score: {(selectedDevice.stalking_score || selectedDevice.persistenceScore).toFixed(3)}</span>
              <span>Locations: {selectedDevice.locationCount}</span>
            </div>
            
            {selectedDevice.stalking_score && (
              <div className="text-red-600 font-medium text-xs">
                🚨 STALKING ALERT: {selectedDevice.stalking_score.toFixed(3)}
              </div>
            )}
            
            <div className="text-xs text-gray-600">
              {selectedDevice.reasons.slice(0, 2).map((reason, idx) => (
                <div key={idx}>• {reason}</div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}