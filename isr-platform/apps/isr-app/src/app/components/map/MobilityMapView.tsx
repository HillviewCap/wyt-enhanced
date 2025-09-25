import React, { useEffect, useState } from 'react';
import { Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import L from 'leaflet';

interface MobilityEvent {
  id: string;
  signatureHash: string;
  fromLocation: {
    latitude: number;
    longitude: number;
  };
  toLocation: {
    latitude: number;
    longitude: number;
  };
  distanceMeters: number;
  timeDeltaSeconds: number;
  speedKmh: number;
  timestamp: string;
  clientMacs: string[];
  confidenceScore: number;
  movementCategory?: string;
  transportationMode?: string;
}

interface MobilityMapViewProps {
  selectedSignature?: string;
  selectedMac?: string;
  showPaths?: boolean;
  showHotspots?: boolean;
  hoursBack?: number;
}

export function MobilityMapView({
  selectedSignature,
  selectedMac,
  showPaths = true,
  showHotspots = false,
  hoursBack = 168,
}: MobilityMapViewProps) {
  const [mobilityEvents, setMobilityEvents] = useState<MobilityEvent[]>([]);
  const [hotspots, setHotspots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch mobility events
  useEffect(() => {
    const fetchMobilityData = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          hours_back: hoursBack.toString(),
          limit: '500',
        });

        if (selectedSignature) {
          params.append('signature_hash', selectedSignature);
        }
        if (selectedMac) {
          params.append('client_mac', selectedMac);
        }

        const response = await fetch(`/api/mobility/events?${params}`);
        if (response.ok) {
          const data = await response.json();
          setMobilityEvents(data.events);
        }
      } catch (error) {
        console.error('Failed to fetch mobility events:', error);
      } finally {
        setLoading(false);
      }
    };

    if (selectedSignature || selectedMac) {
      fetchMobilityData();
    }
  }, [selectedSignature, selectedMac, hoursBack]);

  // Fetch hotspots
  useEffect(() => {
    const fetchHotspots = async () => {
      try {
        const params = new URLSearchParams({
          hours_back: hoursBack.toString(),
          min_visits: '5',
          limit: '50',
        });

        const response = await fetch(`/api/mobility/hotspots?${params}`);
        if (response.ok) {
          const data = await response.json();
          setHotspots(data.hotspots);
        }
      } catch (error) {
        console.error('Failed to fetch hotspots:', error);
      }
    };

    if (showHotspots) {
      fetchHotspots();
    }
  }, [showHotspots, hoursBack]);

  // Get color based on transportation mode
  const getPathColor = (mode?: string) => {
    switch (mode) {
      case 'Walking':
        return '#10b981'; // green
      case 'Cycling':
        return '#3b82f6'; // blue
      case 'Driving':
        return '#f59e0b'; // amber
      case 'High Speed':
        return '#ef4444'; // red
      default:
        return '#6b7280'; // gray
    }
  };

  // Get color based on confidence score
  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return '#10b981'; // green
    if (score >= 0.7) return '#3b82f6'; // blue
    if (score >= 0.5) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <>
      {/* Render mobility paths */}
      {showPaths && mobilityEvents.map((event) => {
        const pathColor = getPathColor(event.transportationMode);
        const path: L.LatLngExpression[] = [
          [event.fromLocation.latitude, event.fromLocation.longitude],
          [event.toLocation.latitude, event.toLocation.longitude],
        ];

        return (
          <React.Fragment key={event.id}>
            {/* Path line */}
            <Polyline
              positions={path}
              pathOptions={{
                color: pathColor,
                weight: 3,
                opacity: 0.7,
                dashArray: event.transportationMode === 'Walking' ? '5, 10' : undefined,
              }}
            >
              <Tooltip>
                <div className="text-xs">
                  <div className="font-semibold mb-1">Movement Event</div>
                  <div>Distance: {(event.distanceMeters / 1000).toFixed(2)} km</div>
                  <div>Speed: {event.speedKmh.toFixed(1)} km/h</div>
                  <div>Mode: {event.transportationMode || 'Unknown'}</div>
                  <div>Category: {event.movementCategory || 'Unknown'}</div>
                  <div>Time: {new Date(event.timestamp).toLocaleString()}</div>
                  <div>Confidence: {(event.confidenceScore * 100).toFixed(0)}%</div>
                  <div>MACs: {event.clientMacs.length}</div>
                </div>
              </Tooltip>
            </Polyline>

            {/* Start point */}
            <CircleMarker
              center={[event.fromLocation.latitude, event.fromLocation.longitude]}
              radius={5}
              pathOptions={{
                fillColor: pathColor,
                color: '#fff',
                weight: 2,
                fillOpacity: 0.8,
              }}
            >
              <Tooltip>
                <div className="text-xs">
                  <div className="font-semibold">Start</div>
                  <div>{new Date(event.timestamp).toLocaleTimeString()}</div>
                </div>
              </Tooltip>
            </CircleMarker>

            {/* End point */}
            <CircleMarker
              center={[event.toLocation.latitude, event.toLocation.longitude]}
              radius={5}
              pathOptions={{
                fillColor: pathColor,
                color: '#fff',
                weight: 2,
                fillOpacity: 0.8,
              }}
            >
              <Tooltip>
                <div className="text-xs">
                  <div className="font-semibold">End</div>
                  <div>+{Math.round(event.timeDeltaSeconds / 60)} min</div>
                </div>
              </Tooltip>
            </CircleMarker>
          </React.Fragment>
        );
      })}

      {/* Render hotspots */}
      {showHotspots && hotspots.map((hotspot, index) => (
        <CircleMarker
          key={`hotspot-${index}`}
          center={[hotspot.location.latitude, hotspot.location.longitude]}
          radius={Math.min(20, Math.max(8, hotspot.visitCount / 2))}
          pathOptions={{
            fillColor: '#ef4444',
            color: '#991b1b',
            weight: 2,
            fillOpacity: 0.6,
          }}
        >
          <Tooltip>
            <div className="text-xs">
              <div className="font-semibold mb-1">Mobility Hotspot</div>
              <div>Visits: {hotspot.visitCount}</div>
              <div>Unique Devices: {hotspot.uniqueDevices}</div>
              <div>Unique Signatures: {hotspot.uniqueSignatures}</div>
              <div>First: {new Date(hotspot.firstSeen).toLocaleDateString()}</div>
              <div>Last: {new Date(hotspot.lastSeen).toLocaleDateString()}</div>
              <div>Avg Dwell: {Math.round(hotspot.avgDwellTimeSeconds / 60)} min</div>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}

      {/* Loading indicator */}
      {loading && (
        <div className="absolute top-4 right-4 bg-white p-2 rounded shadow-md z-[1000]">
          <div className="text-sm">Loading mobility data...</div>
        </div>
      )}
    </>
  );
}