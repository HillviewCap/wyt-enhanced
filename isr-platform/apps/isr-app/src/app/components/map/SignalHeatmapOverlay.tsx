import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import type { Map as LeafletMap } from 'leaflet';

interface HeatmapPoint {
  lat: number;
  lng: number;
  avg_signal: number;
  count: number;
  max_signal: number;
  min_signal: number;
}

interface SignalHeatmapOverlayProps {
  data: HeatmapPoint[];
  visible?: boolean;
  opacity?: number;
}

export function SignalHeatmapOverlay({ data, visible = true, opacity = 0.7 }: SignalHeatmapOverlayProps) {
  const map = useMap();
  const heatmapLayerRef = useRef<any>(null);

  useEffect(() => {
    if (!map || !data.length || !visible) {
      // Remove existing heatmap layer if not visible
      if (heatmapLayerRef.current) {
        map.removeLayer(heatmapLayerRef.current);
        heatmapLayerRef.current = null;
      }
      return;
    }

    // Dynamically load leaflet-heatmap
    import('leaflet-heatmap').then(() => {
      // Remove existing layer
      if (heatmapLayerRef.current) {
        map.removeLayer(heatmapLayerRef.current);
      }

      // Prepare heatmap data
      // Convert signal strength to intensity (higher = stronger signal = more intensity)
      const maxSignal = Math.max(...data.map(point => point.avg_signal));
      const minSignal = Math.min(...data.map(point => point.avg_signal));
      const signalRange = maxSignal - minSignal;

      const heatmapPoints = data.map(point => {
        // Normalize signal strength to 0-1 intensity
        // Since signal strength is negative (dBm), higher values (closer to 0) are stronger
        const normalizedIntensity = signalRange > 0 ? (point.avg_signal - minSignal) / signalRange : 0.5;
        
        return {
          lat: point.lat,
          lng: point.lng,
          intensity: Math.max(0.1, normalizedIntensity) // Ensure minimum visibility
        };
      });

      // Create heatmap configuration
      const heatmapConfig = {
        radius: 25,
        maxOpacity: opacity,
        scaleRadius: true,
        useLocalExtrema: true,
        gradient: {
          // Custom gradient for signal strength visualization
          '0.0': '#313695', // Very weak signal (blue)
          '0.2': '#4575b4', // Weak signal (light blue)
          '0.4': '#74add1', // Poor signal (cyan)
          '0.6': '#abd9e9', // Fair signal (light cyan)
          '0.7': '#fee090', // Good signal (yellow)
          '0.8': '#fdae61', // Strong signal (orange)
          '0.9': '#f46d43', // Very strong signal (red-orange)
          '1.0': '#d73027'  // Excellent signal (red)
        }
      };

      // Create heatmap layer
      const heatmapLayer = new (window as any).L.HeatLayer(heatmapPoints, heatmapConfig);
      
      // Add to map
      heatmapLayer.addTo(map);
      heatmapLayerRef.current = heatmapLayer;
    }).catch(error => {
      console.warn('Failed to load heatmap library:', error);
      
      // Fallback: create circle markers for heatmap visualization
      if (heatmapLayerRef.current) {
        map.removeLayer(heatmapLayerRef.current);
      }

      const circleLayer = new (window as any).L.FeatureGroup();
      
      const maxSignal = Math.max(...data.map(point => point.avg_signal));
      const minSignal = Math.min(...data.map(point => point.avg_signal));
      
      data.forEach(point => {
        const intensity = maxSignal !== minSignal ? (point.avg_signal - minSignal) / (maxSignal - minSignal) : 0.5;
        
        // Color based on signal strength
        const getColor = (intensity: number) => {
          if (intensity > 0.8) return '#d73027'; // Excellent - red
          if (intensity > 0.6) return '#fdae61'; // Good - orange
          if (intensity > 0.4) return '#fee090'; // Fair - yellow
          if (intensity > 0.2) return '#abd9e9'; // Poor - light blue
          return '#313695'; // Very poor - blue
        };

        const circle = new (window as any).L.CircleMarker([point.lat, point.lng], {
          radius: Math.max(3, intensity * 10),
          fillColor: getColor(intensity),
          fillOpacity: opacity,
          stroke: false
        });

        circle.bindTooltip(`
          <div class="text-xs">
            <div><strong>Signal: ${point.avg_signal.toFixed(1)} dBm</strong></div>
            <div>Count: ${point.count}</div>
            <div>Range: ${point.min_signal} to ${point.max_signal} dBm</div>
          </div>
        `, {
          direction: 'top',
          offset: [0, -5]
        });

        circleLayer.addLayer(circle);
      });

      circleLayer.addTo(map);
      heatmapLayerRef.current = circleLayer;
    });

    // Cleanup function
    return () => {
      if (heatmapLayerRef.current) {
        map.removeLayer(heatmapLayerRef.current);
        heatmapLayerRef.current = null;
      }
    };
  }, [map, data, visible, opacity]);

  return null; // This component doesn't render any JSX
}