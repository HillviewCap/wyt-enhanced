import React, { useState } from 'react';
import { useNetworkStore } from '../../stores/networkStore';

export function DriveControlPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResult, setDetectionResult] = useState<any>(null);
  
  const {
    showDriveRoutes,
    driveFilters,
    selectedDriveSession,
    driveSessions,
    setShowDriveRoutes,
    setDriveFilters,
    clearDriveFilters,
    setSelectedDriveSession,
    setDriveSessions,
    setDrivesError,
  } = useNetworkStore();

  const handleFilterChange = (key: string, value: any) => {
    setDriveFilters({ [key]: value === '' ? undefined : value });
  };

  const handleRefreshDrives = async () => {
    setIsDetecting(true);
    setDetectionResult(null);
    setDrivesError(null);

    try {
      const response = await fetch('/api/drives/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setDetectionResult(result);

      // Refresh drive sessions
      const sessionsResponse = await fetch('/api/drives/sessions?limit=100');
      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setDriveSessions(sessionsData.sessions || []);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Drive refresh failed';
      setDrivesError(errorMessage);
      console.error('Drive refresh failed:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const formatDistance = (meters?: number): string => {
    if (!meters) return 'N/A';
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
  };

  const formatSpeed = (kmh?: number): string => {
    if (!kmh) return 'N/A';
    return `${Math.round(kmh)} km/h`;
  };

  const activeFilterCount = Object.values(driveFilters).filter(v => v !== undefined && v !== '').length;

  return (
    <div className="absolute top-16 left-4 z-[1000]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          bg-white hover:bg-gray-50 shadow-lg rounded-lg px-4 py-2 text-sm font-medium transition-colors
          ${showDriveRoutes ? 'border-2 border-green-500 text-green-700' : 'text-gray-700'}
        `}
      >
        🚗 Drives {activeFilterCount > 0 && `(${activeFilterCount})`}
      </button>

      {isOpen && (
        <div className="mt-2 bg-white rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Drive Controls</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Show/Hide Drives Toggle */}
          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={showDriveRoutes}
                onChange={(e) => setShowDriveRoutes(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm font-medium text-gray-700">Show drive routes</span>
            </label>
          </div>

          {/* Drive Refresh */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Refresh Drive Data</h4>
            <button
              onClick={handleRefreshDrives}
              disabled={isDetecting}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
            >
              {isDetecting ? 'Refreshing...' : '🔄 Refresh Wardriving Sessions'}
            </button>
            
            {detectionResult && (
              <div className="mt-2 text-xs text-gray-600">
                <div>✓ Found {detectionResult.totalSessions || 0} wardriving sessions</div>
                {detectionResult.sessions && (
                  <div>📊 {detectionResult.sessions.length} sessions loaded</div>
                )}
              </div>
            )}
          </div>

          {/* Drive Filters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">Filters</h4>
              <button
                onClick={() => {
                  clearDriveFilters();
                  setSelectedDriveSession(null);
                }}
                className="text-xs text-red-600 hover:text-red-800 underline"
              >
                Clear
              </button>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={driveFilters.startDate || ''}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={driveFilters.endDate || ''}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Distance Range */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Distance (meters)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={driveFilters.minDistance || ''}
                  onChange={(e) => handleFilterChange('minDistance', parseInt(e.target.value) || undefined)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={driveFilters.maxDistance || ''}
                  onChange={(e) => handleFilterChange('maxDistance', parseInt(e.target.value) || undefined)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Speed Range */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Avg Speed (km/h)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={driveFilters.minSpeed || ''}
                  onChange={(e) => handleFilterChange('minSpeed', parseInt(e.target.value) || undefined)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={driveFilters.maxSpeed || ''}
                  onChange={(e) => handleFilterChange('maxSpeed', parseInt(e.target.value) || undefined)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Drive Sessions List */}
          {showDriveRoutes && driveSessions.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Recent Drives ({driveSessions.length})
              </h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {driveSessions.slice(0, 5).map((session) => (
                  <button
                    key={session.id}
                    onClick={() => setSelectedDriveSession(
                      selectedDriveSession?.id === session.id ? null : session
                    )}
                    className={`
                      w-full text-left p-2 rounded border text-xs transition-colors
                      ${selectedDriveSession?.id === session.id 
                        ? 'bg-blue-100 border-blue-300 text-blue-800' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                      }
                    `}
                  >
                    <div className="font-medium truncate">
                      {session.sessionName || `Drive ${session.id.substring(0, 8)}`}
                    </div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>{formatDistance(session.totalDistance)} • {session.devicesDiscovered || 0} devices</div>
                      <div>{session.networksDiscovered || 0} networks • {session.areaCovered ? `${(Number(session.areaCovered) / 1000000).toFixed(1)} km²` : 'N/A area'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}