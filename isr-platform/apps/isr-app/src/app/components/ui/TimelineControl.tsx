import React, { useState, useEffect } from 'react';
import { useAnalysisStore } from '../../stores/analysisStore';

export function TimelineControl() {
  const { filteredResults } = useAnalysisStore();
  const [timeRange, setTimeRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null
  });

  useEffect(() => {
    if (filteredResults.length > 0) {
      // Calculate the time range from all filtered devices
      const timestamps = filteredResults.flatMap(device => [
        new Date(device.firstSeen).getTime(),
        new Date(device.lastSeen).getTime()
      ]);
      
      if (timestamps.length > 0) {
        setTimeRange({
          start: new Date(Math.min(...timestamps)),
          end: new Date(Math.max(...timestamps))
        });
      }
    }
  }, [filteredResults]);

  const formatDate = (date: Date | null) => {
    if (!date) return '--';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDeviceCount = () => {
    return filteredResults.length;
  };

  const getTotalSightings = () => {
    return filteredResults.reduce((sum, device) => 
      sum + (device.sightings?.length || 0), 0
    );
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 z-[1000] bg-white shadow-lg rounded-lg p-4 mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">Timeline</h3>
          <p className="text-sm text-gray-500 mt-1">
            {getDeviceCount()} devices • {getTotalSightings()} sightings
          </p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="text-sm">
            <span className="text-gray-500">From: </span>
            <span className="font-medium text-gray-700">{formatDate(timeRange.start)}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-500">To: </span>
            <span className="font-medium text-gray-700">{formatDate(timeRange.end)}</span>
          </div>
        </div>
      </div>

      {filteredResults.length === 0 && (
        <div className="mt-3 text-sm text-gray-500 text-center">
          No data available. Upload and analyze Kismet logs to see timeline.
        </div>
      )}
    </div>
  );
}