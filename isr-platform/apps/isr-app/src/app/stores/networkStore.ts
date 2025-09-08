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

export interface WifiClient {
  id: string;
  clientMac: string;
  vendor?: string;
  latitude: number;
  longitude: number;
  firstSeen?: string;
  lastSeen?: string;
  signalStrength?: number;
  network: {
    ssid?: string;
    bssid: string;
  };
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
  hasClients?: boolean;
  minClients?: number;
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
  
  // Network Detail Panel State
  showNetworkDetailPanel: boolean;
  networkDetailPanelNetwork: WifiNetwork | null;
  
  // Cluster Content Panel State
  showClusterContentPanel: boolean;
  clusterContentNetworks: WifiNetwork[];
  
  // WiFi Clients State (deprecated - keeping for backward compatibility)
  selectedClientLocations: WifiClient[];
  selectedClientId: string | null;
  clientsLoading: boolean;
  clientsError: string | null;
  showClientLocations: boolean;
  
  // Drive Sessions State
  driveSessions: DriveSession[];
  selectedDriveSession: DriveSession | null;
  driveSessionNetworks: WifiNetwork[]; // Networks discovered during selected drive session
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
  
  // Network Detail Panel Actions
  setShowNetworkDetailPanel: (show: boolean) => void;
  setNetworkDetailPanelNetwork: (network: WifiNetwork | null) => void;
  openNetworkDetailPanel: (network: WifiNetwork) => void;
  closeNetworkDetailPanel: () => void;
  
  // Cluster Content Panel Actions
  setShowClusterContentPanel: (show: boolean) => void;
  setClusterContentNetworks: (networks: WifiNetwork[]) => void;
  openClusterContentPanel: (networks: WifiNetwork[]) => void;
  closeClusterContentPanel: () => void;
  
  // Client Actions (deprecated - keeping for backward compatibility)
  setSelectedClientLocations: (locations: WifiClient[]) => void;
  setSelectedClientId: (clientId: string | null) => void;
  setClientsLoading: (loading: boolean) => void;
  setClientsError: (error: string | null) => void;
  setShowClientLocations: (show: boolean) => void;
  fetchClientLocations: (clientId: string) => Promise<void>;
  
  // Drive Actions
  setDriveSessions: (sessions: DriveSession[]) => void;
  addDriveSession: (session: DriveSession) => void;
  setSelectedDriveSession: (session: DriveSession | null) => void;
  setDriveSessionNetworks: (networks: WifiNetwork[]) => void;
  fetchDriveSessionNetworks: (sessionId: string) => Promise<void>;
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
      
      showNetworkDetailPanel: false,
      networkDetailPanelNetwork: null,
      
      showClusterContentPanel: false,
      clusterContentNetworks: [],
      
      selectedClientLocations: [],
      selectedClientId: null,
      clientsLoading: false,
      clientsError: null,
      showClientLocations: false,
      
      driveSessions: [],
      selectedDriveSession: null,
      driveSessionNetworks: [],
      drivesLoading: false,
      drivesError: null,
      driveFilters: {},
      showDriveRoutes: false,
      
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
      
      // Network Detail Panel Actions
      setShowNetworkDetailPanel: (show) => set({ showNetworkDetailPanel: show }),
      
      setNetworkDetailPanelNetwork: (network) => set({ networkDetailPanelNetwork: network }),
      
      openNetworkDetailPanel: (network) => set({ 
        showNetworkDetailPanel: true, 
        networkDetailPanelNetwork: network 
      }),
      
      closeNetworkDetailPanel: () => set({ 
        showNetworkDetailPanel: false, 
        networkDetailPanelNetwork: null 
      }),
      
      // Cluster Content Panel Actions
      setShowClusterContentPanel: (show) => set({ showClusterContentPanel: show }),
      
      setClusterContentNetworks: (networks) => set({ clusterContentNetworks: networks }),
      
      openClusterContentPanel: (networks) => set({ 
        showClusterContentPanel: true, 
        clusterContentNetworks: networks 
      }),
      
      closeClusterContentPanel: () => set({ 
        showClusterContentPanel: false, 
        clusterContentNetworks: [] 
      }),
      
      // Client Actions (deprecated - keeping for backward compatibility)
      setSelectedClientLocations: (locations) => set({ selectedClientLocations: locations }),
      
      setSelectedClientId: (clientId) => set({ selectedClientId: clientId }),
      
      setClientsLoading: (loading) => set({ clientsLoading: loading }),
      
      setClientsError: (error) => set({ clientsError: error }),
      
      setShowClientLocations: (show) => set({ showClientLocations: show }),
      
      fetchClientLocations: async (clientId) => {
        set({ clientsLoading: true, clientsError: null });
        
        try {
          const response = await fetch(`/api/wifi/clients/${clientId}/locations`);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          set({ 
            selectedClientLocations: data.locations || [],
            selectedClientId: clientId,
            showClientLocations: true
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch client locations';
          set({ clientsError: errorMessage });
          console.error('Failed to fetch client locations:', error);
        } finally {
          set({ clientsLoading: false });
        }
      },
      
      // Drive Actions
      setDriveSessions: (sessions) => set({ driveSessions: sessions }),
      
      addDriveSession: (session) => set((state) => ({
        driveSessions: [...state.driveSessions.filter(s => s.id !== session.id), session]
      })),
      
      setSelectedDriveSession: (session) => {
        set({ selectedDriveSession: session });
        // Clear drive session networks when selection changes
        if (!session) {
          set({ driveSessionNetworks: [] });
        }
      },
      
      setDriveSessionNetworks: (networks) => set({ driveSessionNetworks: networks }),
      
      fetchDriveSessionNetworks: async (sessionId) => {
        set({ drivesLoading: true, drivesError: null });
        
        try {
          const response = await fetch(`/api/drives/sessions/${sessionId}/networks`);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          set({ 
            driveSessionNetworks: data.networks || [],
            drivesLoading: false
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch drive session networks';
          set({ 
            drivesError: errorMessage,
            drivesLoading: false
          });
          console.error('Failed to fetch drive session networks:', error);
        }
      },
      
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
        const { networks, networkFilters, selectedDriveSession, driveSessionNetworks } = get();
        
        // Use drive session networks if a drive is selected, otherwise use all networks
        const baseNetworks = selectedDriveSession ? driveSessionNetworks : networks;
        
        return baseNetworks.filter(network => {
          
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
          
          // Client filters
          if (networkFilters.hasClients === true && network.clientCount === 0) {
            return false;
          }
          
          if (networkFilters.hasClients === false && network.clientCount > 0) {
            return false;
          }
          
          if (networkFilters.minClients && network.clientCount < networkFilters.minClients) {
            return false;
          }
          
          return true;
        });
      },
      
      filteredDriveSessions: () => {
        const { driveSessions, driveFilters } = get();
        
        return driveSessions.filter(session => {
          // Date range filters - convert session startTime to date only for comparison
          if (driveFilters.startDate) {
            const sessionDate = session.startTime.split('T')[0]; // Extract YYYY-MM-DD from datetime
            if (sessionDate < driveFilters.startDate) {
              return false;
            }
          }
          
          if (driveFilters.endDate) {
            const sessionDate = session.startTime.split('T')[0]; // Extract YYYY-MM-DD from datetime
            if (sessionDate > driveFilters.endDate) {
              return false;
            }
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
        showClientLocations: state.showClientLocations,
      }),
    }
  )
);