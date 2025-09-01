# **Data Models**

## **Device**

* **Purpose**: Represents a unique wireless device tracked by the system, identified by its MAC address.  
* Relationships: A Device has many Sightings.  
  TypeScript Interface

TypeScript

export interface Device {  
  id: string;  
  macAddress: string;  
  firstSeen: Date;  
  lastSeen: Date;  
}

---

## **Sighting**

* **Purpose**: Records a single Kismet-based observation of a specific Device at a point in time and space.  
* Relationships: A Sighting belongs to one Device.  
  TypeScript Interface

TypeScript

export interface Sighting {  
  id: string;  
  deviceId: string;  
  timestamp: Date;  
  latitude: number;  
  longitude: number;  
  signalStrength: number;  
}

---

## **SdrSignal**

* **Purpose**: Records a raw signal event captured by an SDR sensor.  
* Relationships: Does not have a direct relationship. It will be correlated with Device activity by the analysis engine based on time and location.  
  TypeScript Interface

TypeScript

export interface SdrSignal {  
  id: string;  
  timestamp: Date;  
  latitude: number;  
  longitude: number;  
  frequency: number;  
  signalStrength: number;  
}

\<hr\>
