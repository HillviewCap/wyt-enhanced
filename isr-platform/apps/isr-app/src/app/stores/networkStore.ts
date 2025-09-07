import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface WifiNetwork {
  id: string;
  bssid: string;
  ssid?: string;
  securityType?: string;
  channel?: number;
  frequency?: number;
  signalStrength?: number;
  vendor?: string;
  latitude: number;
  longitude: number;
  firstSeen?: string;
  lastSeen?: string;
  timesSeen: number;
  clientCount: number;
}

export interface DriveSession {
  id: string;
  sessionName?: string;
  startTime: string;
  endTime?: string; // Made optional since wardriving sessions might be ongoing
  totalDistance?: number; // Changed from totalDistanceM to match wardriving_sessions
  areaCovered?: number; // Added area covered from wardriving_sessions
  networksDiscovered: number;
  devicesDiscovered?: number; // Changed from clientsDiscovered to match wardriving_sessions
  datasourceUuids?: string[]; // Added datasource UUIDs from wardriving_sessions
  startLocation?: {
    latitude: number;
    longitude: number;
  };
  endLocation?: {
    latitude: number;
    longitude: number;
  };
  routeGeojson?: any;
  metadata?: any;
  createdAt: string;
  
  // Legacy fields for backward compatibility (deprecated)
  totalDistanceM?: number;
  avgSpeedKmh?: number;
  maxSpeedKmh?: number;
  clientsDiscovered?: number;
}

export interface NetworkFilters {
  securityType?: string;
  minSignalStrength?: number;
  maxSignalStrength?: number;
  channel?: number;
  vendor?: string;
  showHidden?: boolean;
  showOpenOnly?: boolean;
}

export interface DriveFilters {
  startDate?: string;
  endDate?: string;
  minDistance?: number;
  maxDistance?: number;
  minSpeed?: number;
  maxSpeed?: number;
}

interface NetworkStore {
  // WiFi Networks State
  networks: WifiNetwork[];
  selectedNetwork: WifiNetwork | null;
  networksLoading: boolean;
  networksError: string | null;
  networkFilters: NetworkFilters;
  showSignalRadius: boolean;
  enableClustering: boolean;
  
  // Drive Sessions State
  driveSessions: DriveSession[];
  selectedDriveSession: DriveSession | null;
  drivesLoading: boolean;
  drivesError: string | null;
  driveFilters: DriveFilters;
  showDriveRoutes: boolean;
  
  // Map State
  mapBounds?: [number, number, number, number]; // [minLat, minLon, maxLat, maxLon]
  
  // Network Actions
  setNetworks: (networks: WifiNetwork[]) => void;
  addNetwork: (network: WifiNetwork) => void;
  setSelectedNetwork: (network: WifiNetwork | null) => void;
  setNetworksLoading: (loading: boolean) => void;
  setNetworksError: (error: string | null) => void;
  setNetworkFilters: (filters: Partial<NetworkFilters>) => void;
  clearNetworkFilters: () => void;
  setShowSignalRadius: (show: boolean) => void;
  setEnableClustering: (enable: boolean) => void;
  
  // Drive Actions
  setDriveSessions: (sessions: DriveSession[]) => void;
  addDriveSession: (session: DriveSession) => void;
  setSelectedDriveSession: (session: DriveSession | null) => void;
  setDrivesLoading: (loading: boolean) => void;
  setDrivesError: (error: string | null) => void;
  setDriveFilters: (filters: Partial<DriveFilters>) => void;
  clearDriveFilters: () => void;
  setShowDriveRoutes: (show: boolean) => void;
  
  // Map Actions
  setMapBounds: (bounds: [number, number, number, number]) => void;
  
  // Derived State
  filteredNetworks: () => WifiNetwork[];
  filteredDriveSessions: () => DriveSession[];
}

export const useNetworkStore = create<NetworkStore>()(
  devtools(
    (set, get) => ({
      // Initial State
      networks: [],
      selectedNetwork: null,
      networksLoading: false,
      networksError: null,
      networkFilters: {},
      showSignalRadius: false,
      enableClustering: true,
      
      driveSessions: [],
      selectedDriveSession: null,
      drivesLoading: false,
      drivesError: null,
      driveFilters: {},
      showDriveRoutes: true,
      
      // Network Actions
      setNetworks: (networks) => set({ networks }),
      
      addNetwork: (network) => set((state) => ({
        networks: [...state.networks.filter(n => n.id !== network.id), network]
      })),
      
      setSelectedNetwork: (network) => set({ selectedNetwork: network }),
      
      setNetworksLoading: (loading) => set({ networksLoading: loading }),
      
      setNetworksError: (error) => set({ networksError: error }),
      
      setNetworkFilters: (filters) => set((state) => ({
        networkFilters: { ...state.networkFilters, ...filters }
      })),
      
      clearNetworkFilters: () => set({ networkFilters: {} }),
      
      setShowSignalRadius: (show) => set({ showSignalRadius: show }),
      
      setEnableClustering: (enable) => set({ enableClustering: enable }),
      
      // Drive Actions
      setDriveSessions: (sessions) => set({ driveSessions: sessions }),
      
      addDriveSession: (session) => set((state) => ({
        driveSessions: [...state.driveSessions.filter(s => s.id !== session.id), session]
      })),
      
      setSelectedDriveSession: (session) => set({ selectedDriveSession: session }),
      
      setDrivesLoading: (loading) => set({ drivesLoading: loading }),
      
      setDrivesError: (error) => set({ drivesError: error }),
      
      setDriveFilters: (filters) => set((state) => ({
        driveFilters: { ...state.driveFilters, ...filters }
      })),
      
      clearDriveFilters: () => set({ driveFilters: {} }),
      
      setShowDriveRoutes: (show) => set({ showDriveRoutes: show }),
      
      // Map Actions
      setMapBounds: (bounds) => set({ mapBounds: bounds }),
      
      // Derived State
      filteredNetworks: () => {
        const { networks, networkFilters, selectedDriveSession } = get();
        
        return networks.filter(network => {
          // Selected drive session filter - only show networks discovered during the selected drive
          if (selectedDriveSession && network.firstSeen) {
            const networkTime = new Date(network.firstSeen);
            const driveStart = new Date(selectedDriveSession.startTime);
            const driveEnd = selectedDriveSession.endTime ? new Date(selectedDriveSession.endTime) : new Date();
            
            if (networkTime < driveStart || networkTime > driveEnd) {
              return false;
            }
          }
          
          // Security type filter
          if (networkFilters.securityType && network.securityType !== networkFilters.securityType) {
            return false;
          }
          
          // Signal strength filters
          if (networkFilters.minSignalStrength && 
              (!network.signalStrength || network.signalStrength < networkFilters.minSignalStrength)) {
            return false;
          }
          
          if (networkFilters.maxSignalStrength && 
              (!network.signalStrength || network.signalStrength > networkFilters.maxSignalStrength)) {
            return false;
          }
          
          // Channel filter
          if (networkFilters.channel && network.channel !== networkFilters.channel) {
            return false;
          }
          
          // Vendor filter
          if (networkFilters.vendor && 
              (!network.vendor || !network.vendor.toLowerCase().includes(networkFilters.vendor.toLowerCase()))) {
            return false;
          }
          
          // Hidden networks filter
          if (networkFilters.showHidden === false && (!network.ssid || network.ssid.trim() === '')) {
            return false;
          }
          
          // Open networks only filter
          if (networkFilters.showOpenOnly && network.securityType !== 'Open') {
            return false;
          }
          
          return true;
        });
      },
      
      filteredDriveSessions: () => {
        const { driveSessions, driveFilters } = get();
        
        return driveSessions.filter(session => {
          // Date range filters
          if (driveFilters.startDate && session.startTime < driveFilters.startDate) {
            return false;
          }
          
          if (driveFilters.endDate && session.startTime > driveFilters.endDate) {
            return false;
          }
          
          // Distance filters
          if (driveFilters.minDistance && 
              (!session.totalDistanceM || session.totalDistanceM < driveFilters.minDistance)) {
            return false;
          }
          
          if (driveFilters.maxDistance && 
              (!session.totalDistanceM || session.totalDistanceM > driveFilters.maxDistance)) {
            return false;
          }
          
          // Speed filters
          if (driveFilters.minSpeed && 
              (!session.avgSpeedKmh || session.avgSpeedKmh < driveFilters.minSpeed)) {
            return false;
          }
          
          if (driveFilters.maxSpeed && 
              (!session.avgSpeedKmh || session.avgSpeedKmh > driveFilters.maxSpeed)) {
            return false;
          }
          
          return true;
        });
      },
    }),
    {
      name: 'network-store',
      partialize: (state) => ({
        networkFilters: state.networkFilters,
        driveFilters: state.driveFilters,
        showSignalRadius: state.showSignalRadius,
        showDriveRoutes: state.showDriveRoutes,
        enableClustering: state.enableClustering,
      }),
    }
  )
);