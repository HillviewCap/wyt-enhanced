import React from 'react';
import { useAnalysisStore } from '../../stores/analysisStore';

export function DeviceDetailPanel() {
  const { selectedDeviceId, analysisResults, setSelectedDevice } = useAnalysisStore();
  
  if (!selectedDeviceId) {
    return null;
  }

  const device = analysisResults.find(d => d.deviceId === selectedDeviceId);
  
  if (!device) {
    return null;
  }

  const handleClose = () => {
    setSelectedDevice(null);
  };

  const getThreatLevel = (score: number): { label: string; color: string } => {
    if (score >= 0.8) return { label: 'Critical', color: 'text-red-600' };
    if (score >= 0.6) return { label: 'High', color: 'text-orange-600' };
    if (score >= 0.3) return { label: 'Medium', color: 'text-yellow-600' };
    return { label: 'Low', color: 'text-green-600' };
  };

  const threatLevel = getThreatLevel(device.persistenceScore);

  return (
    <div className="absolute top-20 right-4 z-[1000] bg-white shadow-xl rounded-lg w-96 max-h-[80vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
        <div className="flex justify-between items-start">
          <h2 className="text-lg font-bold text-gray-900">Device Details</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Device Information</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">MAC Address:</dt>
              <dd className="font-mono text-gray-900">{device.macAddress}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Device ID:</dt>
              <dd className="font-mono text-gray-900 text-xs">{device.deviceId}</dd>
            </div>
          </dl>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Threat Assessment</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-gray-600">Persistence Score:</dt>
              <dd className="font-semibold">
                {(device.persistenceScore * 100).toFixed(1)}%
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-600">Threat Level:</dt>
              <dd className={`font-semibold ${threatLevel.color}`}>
                {threatLevel.label}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Temporal Information</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">First Seen:</dt>
              <dd className="text-gray-900">{new Date(device.firstSeen).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Last Seen:</dt>
              <dd className="text-gray-900">{new Date(device.lastSeen).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Time Window:</dt>
              <dd className="text-gray-900">{device.timeWindowHours} hours</dd>
            </div>
          </dl>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Location Data</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Location Count:</dt>
              <dd className="text-gray-900">{device.locationCount}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Total Sightings:</dt>
              <dd className="text-gray-900">{device.sightings.length}</dd>
            </div>
          </dl>
        </div>

        {device.sightings.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Sightings</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {device.sightings
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 5)
                .map((sighting, index) => (
                  <div key={index} className="text-xs border-b border-gray-200 pb-2 last:border-0">
                    <div className="flex justify-between text-gray-600">
                      <span>{new Date(sighting.timestamp).toLocaleString()}</span>
                      <span>{sighting.signalStrength} dBm</span>
                    </div>
                    <div className="text-gray-500 font-mono">
                      {sighting.latitude.toFixed(6)}, {sighting.longitude.toFixed(6)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Analysis Metadata</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-600">Analysis Timestamp:</dt>
              <dd className="text-gray-900">{new Date(device.analysisTimestamp).toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}