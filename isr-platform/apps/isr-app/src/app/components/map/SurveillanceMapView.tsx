import React, { useRef, useCallback, useEffect, useState } from 'react';
import { MapContainer, TileLayer, ZoomControl, Polyline } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { SurveillanceMarker } from './SurveillanceMarker';
import { SurveillancePanel } from '../ui/SurveillancePanel';
import { ThreatLevelLegend } from '../ui/ThreatLevelLegend';

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

interface SurveillanceMapViewProps {
  center?: [number, number];
  zoom?: number;
}

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795]; // Center of USA (Kansas)
const DEFAULT_ZOOM = 4;

export function SurveillanceMapView({ center = DEFAULT_CENTER, zoom = DEFAULT_ZOOM }: SurveillanceMapViewProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SurveillanceAnalysisResult | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<SuspiciousDevice | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeWindowHours, setTimeWindowHours] = useState(24);
  const [minThreatLevel, setMinThreatLevel] = useState(0.5);
  const [showMovementPaths, setShowMovementPaths] = useState(true);
  const [showStalkingOnly, setShowStalkingOnly] = useState(false);

  const fetchSurveillanceData = useCallback(async (stalkingOnly: boolean = false) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const endpoint = stalkingOnly ? 'stalking' : 'analysis';
      const params = new URLSearchParams({
        timeWindowHours: timeWindowHours.toString(),
        [stalkingOnly ? 'minStalkingScore' : 'minPersistenceScore']: minThreatLevel.toString()
      });

      const response = await fetch(`/api/surveillance/${endpoint}?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch surveillance data: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (stalkingOnly) {
        // Transform stalking response to match our interface
        const stalkingResult: SurveillanceAnalysisResult = {
          totalDevices: result.data.deviceList.length,
          suspiciousDevices: result.data.stalkingDevices,
          highThreatDevices: result.data.deviceList.filter((d: any) => d.stalking_score >= 0.9).length,
          multiLocationDevices: result.data.deviceList.filter((d: any) => d.locationCount >= 3).length,
          locationSessions: 0,
          suspiciousDeviceList: result.data.deviceList,
          analysisTimestamp: result.data.analysisTimestamp,
          timeWindowHours: result.data.timeWindowHours
        };
        setAnalysisResult(stalkingResult);
      } else {
        setAnalysisResult(result.data);
      }

      // Auto-center map on suspicious devices
      if (result.data.suspiciousDeviceList?.length > 0 && mapRef.current) {
        const allLocations = result.data.suspiciousDeviceList
          .flatMap((device: SuspiciousDevice) => device.locations)
          .filter((loc: any) => 
            Math.abs(loc.latitude) <= 90 && 
            Math.abs(loc.longitude) <= 180
          );

        if (allLocations.length > 0) {
          const lats = allLocations.map((loc: any) => loc.latitude);
          const lngs = allLocations.map((loc: any) => loc.longitude);
          const bounds: [[number, number], [number, number]] = [
            [Math.min(...lats), Math.min(...lngs)],
            [Math.max(...lats), Math.max(...lngs)]
          ];
          
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch surveillance data';
      setError(errorMessage);
      console.error('Surveillance data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [timeWindowHours, minThreatLevel]);

  useEffect(() => {
    fetchSurveillanceData(showStalkingOnly);
  }, [fetchSurveillanceData, showStalkingOnly]);

  const handleResetView = useCallback(() => {
    if (mapRef.current && typeof mapRef.current.setView === 'function') {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, []);

  const getThreatColor = (score: number): string => {
    if (score >= 0.8) return '#ef4444'; // Red for high threat
    if (score >= 0.6) return '#f59e0b'; // Amber for medium threat
    return '#22c55e'; // Green for low threat
  };

  const getPathColor = (device: SuspiciousDevice): string => {
    const score = device.stalking_score || device.persistenceScore;
    return getThreatColor(score);
  };

  const sortedDevices = analysisResult?.suspiciousDeviceList?.sort((a, b) => {
    const scoreA = a.stalking_score || a.persistenceScore;
    const scoreB = b.stalking_score || b.persistenceScore;
    return scoreB - scoreA;
  }) || [];

  return (
    <div className="relative h-screen w-screen">
      <MapContainer
        ref={(map) => { if (map) mapRef.current = map; }}
        center={center}
        zoom={zoom}
        className="h-full w-full"
        zoomControl={false}
        minZoom={2}
        maxZoom={18}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomControl position="topright" />
        
        {/* Render device markers */}
        {sortedDevices.map((device) => (
          <SurveillanceMarker
            key={device.id}
            device={device}
            isSelected={selectedDevice?.id === device.id}
            onClick={() => setSelectedDevice(device)}
          />
        ))}

        {/* Render movement paths for high-threat devices */}
        {showMovementPaths && sortedDevices
          .filter(device => (device.stalking_score || device.persistenceScore) >= 0.7)
          .map((device) => {
            if (device.locations.length < 2) return null;
            
            const pathPositions = device.locations
              .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
              .map(loc => [loc.latitude, loc.longitude] as [number, number]);

            return (
              <Polyline
                key={`path-${device.id}`}
                positions={pathPositions}
                color={getPathColor(device)}
                weight={3}
                opacity={0.7}
                dashArray="5, 10"
              />
            );
          })}
      </MapContainer>
      
      {/* Control buttons */}
      <div className="absolute top-4 right-4 z-[1000] space-y-2">
        <button
          onClick={handleResetView}
          className="block w-full bg-white hover:bg-gray-100 shadow-lg rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors"
          aria-label="Reset map view"
        >
          Reset View
        </button>
        
        <button
          onClick={() => fetchSurveillanceData(showStalkingOnly)}
          disabled={isLoading}
          className="block w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 shadow-lg rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          {isLoading ? 'Analyzing...' : 'Refresh Analysis'}
        </button>

        <button
          onClick={() => setShowMovementPaths(!showMovementPaths)}
          className={`block w-full shadow-lg rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            showMovementPaths 
              ? 'bg-green-500 hover:bg-green-600 text-white' 
              : 'bg-white hover:bg-gray-100 text-gray-700'
          }`}
        >
          {showMovementPaths ? 'Hide Paths' : 'Show Paths'}
        </button>

        <button
          onClick={() => setShowStalkingOnly(!showStalkingOnly)}
          className={`block w-full shadow-lg rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            showStalkingOnly 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-white hover:bg-gray-100 text-gray-700'
          }`}
        >
          {showStalkingOnly ? 'All Threats' : 'Stalking Only'}
        </button>
      </div>
      
      {/* Status indicators */}
      {isLoading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          🔍 Analyzing surveillance patterns...
        </div>
      )}
      
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          ⚠️ {error}
        </div>
      )}

      {analysisResult && !isLoading && (
        <div className="absolute top-4 left-4 z-[1000] bg-white shadow-lg rounded-lg p-4 min-w-64">
          <h3 className="font-bold text-gray-800 mb-2">🚨 Surveillance Analysis</h3>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Total Devices: <span className="font-medium">{analysisResult.totalDevices}</span></div>
            <div>Suspicious: <span className="font-medium text-yellow-600">{analysisResult.suspiciousDevices}</span></div>
            <div>High Threat: <span className="font-medium text-red-600">{analysisResult.highThreatDevices}</span></div>
            <div>Multi-Location: <span className="font-medium text-purple-600">{analysisResult.multiLocationDevices}</span></div>
            <div className="text-xs text-gray-500 mt-2">
              Window: {analysisResult.timeWindowHours}h | 
              Updated: {new Date(analysisResult.analysisTimestamp).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {/* Threat level legend */}
      <ThreatLevelLegend />
      
      {/* Surveillance analysis panel */}
      <SurveillancePanel
        analysisResult={analysisResult}
        selectedDevice={selectedDevice}
        onDeviceSelect={setSelectedDevice}
        timeWindowHours={timeWindowHours}
        onTimeWindowChange={setTimeWindowHours}
        minThreatLevel={minThreatLevel}
        onThreatLevelChange={setMinThreatLevel}
      />
    </div>
  );
}