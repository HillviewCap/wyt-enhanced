import React, { useRef, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';
import { FilterPanel } from '../ui/FilterPanel';
import { TimelineControl } from '../ui/TimelineControl';
import { useAnalysisStore } from '../../stores/analysisStore';
import { ApiService } from '../../services/ApiService';
import { DeviceMarker } from './DeviceMarker';
import { DeviceDetailPanel } from '../ui/DeviceDetailPanel';

interface MapViewProps {
  center?: [number, number];
  zoom?: number;
}

const DEFAULT_CENTER: [number, number] = [39.8283, -98.5795]; // Center of USA (Kansas)
const DEFAULT_ZOOM = 4; // Zoomed out to see entire country

export function MapView({ center = DEFAULT_CENTER, zoom = DEFAULT_ZOOM }: MapViewProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const { setAnalysisResults, setLoading, setError, isLoading, error, filteredResults } = useAnalysisStore();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const results = await ApiService.fetchAnalysisResults();
        setAnalysisResults(results);
        setLoading(false); // Clear loading state after successful fetch
        
        // Auto-center map on data if available
        if (results.length > 0 && mapRef.current) {
          const validSightings = results
            .flatMap(d => d.sightings || [])
            .filter(s => 
              s.latitude !== 0 && 
              s.longitude !== 0 && 
              Math.abs(s.latitude) <= 90 && 
              Math.abs(s.longitude) <= 180
            );
          
          if (validSightings.length > 0) {
            // Calculate bounds of all valid points
            const lats = validSightings.map(s => s.latitude);
            const lngs = validSightings.map(s => s.longitude);
            const bounds: [[number, number], [number, number]] = [
              [Math.min(...lats), Math.min(...lngs)],
              [Math.max(...lats), Math.max(...lngs)]
            ];
            
            // Fit map to bounds with padding
            mapRef.current.fitBounds(bounds, { padding: [50, 50] });
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analysis results';
        setError(errorMessage);
        setLoading(false); // Clear loading state on error too
      }
    };

    fetchData();
  }, [setAnalysisResults, setLoading, setError]);

  const handleResetView = useCallback(() => {
    if (mapRef.current && typeof mapRef.current.setView === 'function') {
      mapRef.current.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
    }
  }, []);

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
        {filteredResults.map((device) => (
          <DeviceMarker key={device.deviceId} device={device} />
        ))}
      </MapContainer>
      
      <button
        onClick={handleResetView}
        className="absolute top-4 right-20 z-[1000] bg-white hover:bg-gray-100 shadow-lg rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors"
        aria-label="Reset map view"
      >
        Reset View
      </button>
      
      {isLoading && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
          Loading analysis data...
        </div>
      )}
      
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg">
          Error: {error}
        </div>
      )}
      
      <FilterPanel />
      <TimelineControl />
      <DeviceDetailPanel />
    </div>
  );
}