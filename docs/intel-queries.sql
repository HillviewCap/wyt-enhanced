-- Kiz-Log-Buster Intelligence Analysis Query Library
-- Comprehensive SQL queries for wireless intelligence analysis

-- =============================================================================
-- NETWORK DISCOVERY & RECONNAISSANCE
-- =============================================================================

-- 1. All WiFi networks ordered by signal strength
SELECT ssid, bssid, security_type, channel, frequency, signal_strength, 
       vendor, first_seen, last_seen, times_seen
FROM wifi_networks 
ORDER BY signal_strength DESC;

-- 2. Open (unsecured) WiFi networks - high intelligence value
SELECT ssid, bssid, channel, signal_strength, vendor, 
       first_seen, last_seen, latitude, longitude
FROM wifi_networks 
WHERE security_type = 'Open' 
ORDER BY signal_strength DESC;

-- 3. Hidden networks (no SSID broadcast)
SELECT bssid, ssid_hash, security_type, channel, signal_strength,
       vendor, first_seen, capabilities
FROM wifi_networks 
WHERE ssid IS NULL OR ssid = ''
ORDER BY signal_strength DESC;

-- 4. WEP networks (vulnerable to attack)
SELECT ssid, bssid, channel, signal_strength, vendor, first_seen
FROM wifi_networks 
WHERE security_type = 'WEP'
ORDER BY signal_strength DESC;

-- 5. Networks discovered in the last 24 hours
SELECT ssid, bssid, security_type, channel, first_seen, last_seen
FROM wifi_networks 
WHERE first_seen > NOW() - INTERVAL '24 hours'
ORDER BY first_seen DESC;

-- 6. Corporate/Enterprise networks (WPA2-Enterprise, WPA3-Enterprise)
SELECT ssid, bssid, security_type, channel, signal_strength, vendor
FROM wifi_networks 
WHERE security_type LIKE '%Enterprise%' 
ORDER BY signal_strength DESC;

-- =============================================================================
-- DEVICE TRACKING & IDENTIFICATION  
-- =============================================================================

-- 7. Active WiFi clients in the last hour
SELECT client_mac, vendor, client_type, last_seen, signal_strength,
       packets_total, data_bytes
FROM wifi_clients 
WHERE last_seen > NOW() - INTERVAL '1 hour'
ORDER BY last_seen DESC;

-- 8. WiFi clients by manufacturer/vendor
SELECT vendor, COUNT(*) as device_count,
       ARRAY_AGG(DISTINCT client_mac ORDER BY client_mac) as devices
FROM wifi_clients 
WHERE vendor IS NOT NULL AND vendor != ''
GROUP BY vendor 
ORDER BY device_count DESC;

-- 9. Most active WiFi clients (by packet count)
SELECT client_mac, vendor, packets_total, data_bytes,
       client_type, last_seen
FROM wifi_clients 
WHERE packets_total > 100
ORDER BY packets_total DESC
LIMIT 50;

-- 10. Bluetooth devices discovered
SELECT bd_address, device_name, device_type, vendor, rssi,
       first_seen, last_seen, times_seen
FROM bluetooth_devices 
ORDER BY last_seen DESC;

-- 11. Bluetooth devices by manufacturer  
SELECT vendor, COUNT(*) as device_count,
       AVG(rssi) as avg_rssi,
       ARRAY_AGG(DISTINCT device_name) as device_names
FROM bluetooth_devices 
WHERE vendor IS NOT NULL AND vendor != ''
GROUP BY vendor 
ORDER BY device_count DESC;

-- 12. Personal devices (Apple, Samsung, etc.)
SELECT bd_address, device_name, vendor, device_type, rssi, last_seen
FROM bluetooth_devices 
WHERE vendor IN ('Apple', 'Samsung Electronics', 'Google', 'Microsoft')
ORDER BY last_seen DESC;

-- 13. Persistent devices (seen multiple times)
SELECT bd_address, device_name, vendor, times_seen, 
       first_seen, last_seen,
       EXTRACT(EPOCH FROM (last_seen - first_seen))/3600 as hours_observed
FROM bluetooth_devices 
WHERE times_seen > 3 
ORDER BY times_seen DESC;

-- =============================================================================
-- GEOSPATIAL INTELLIGENCE
-- =============================================================================

-- 14. WiFi networks within geographic bounding box
-- Replace coordinates with your area of interest
SELECT ssid, bssid, security_type, latitude, longitude, 
       signal_strength, vendor
FROM wifi_networks 
WHERE latitude BETWEEN 40.7580 AND 40.7614 
  AND longitude BETWEEN -73.9857 AND -73.9733
ORDER BY signal_strength DESC;

-- 15. Bluetooth devices near specific coordinates (within 500m)
-- Requires PostGIS extension for accurate distance calculation
SELECT bd_address, device_name, vendor, latitude, longitude,
       SQRT(
         POW((latitude - 40.7589) * 111320, 2) + 
         POW((longitude - (-73.9857)) * 111320 * COS(RADIANS(40.7589)), 2)
       ) as distance_meters
FROM bluetooth_devices 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
HAVING distance_meters < 500
ORDER BY distance_meters;

-- 16. Device density by geographic area (grid analysis)
SELECT 
    ROUND(latitude, 3) as lat_grid,
    ROUND(longitude, 3) as lon_grid,
    COUNT(DISTINCT client_mac) as wifi_devices,
    COUNT(DISTINCT bd_address) as bluetooth_devices
FROM (
    SELECT client_mac, NULL as bd_address, latitude, longitude FROM wifi_clients
    UNION ALL
    SELECT NULL as client_mac, bd_address, latitude, longitude FROM bluetooth_devices
) combined
WHERE latitude IS NOT NULL AND longitude IS NOT NULL
GROUP BY lat_grid, lon_grid
HAVING COUNT(*) > 5
ORDER BY (wifi_devices + bluetooth_devices) DESC;

-- 17. Coverage analysis by signal strength zones
SELECT 
    CASE 
        WHEN signal_strength > -50 THEN 'Excellent (-50 to 0 dBm)'
        WHEN signal_strength > -60 THEN 'Good (-60 to -50 dBm)'  
        WHEN signal_strength > -70 THEN 'Fair (-70 to -60 dBm)'
        WHEN signal_strength > -80 THEN 'Poor (-80 to -70 dBm)'
        ELSE 'Very Poor (< -80 dBm)'
    END as signal_zone,
    COUNT(*) as network_count,
    ROUND(AVG(signal_strength), 1) as avg_signal
FROM wifi_networks
WHERE signal_strength IS NOT NULL
GROUP BY signal_zone
ORDER BY AVG(signal_strength) DESC;

-- =============================================================================
-- TEMPORAL ANALYSIS
-- =============================================================================

-- 18. Device activity patterns by hour of day
SELECT EXTRACT(HOUR FROM last_seen) as hour_of_day,
       COUNT(DISTINCT client_mac) as wifi_devices,
       COUNT(DISTINCT bd_address) as bluetooth_devices
FROM (
    SELECT client_mac, NULL as bd_address, last_seen FROM wifi_clients
    UNION ALL
    SELECT NULL as client_mac, bd_address, last_seen FROM bluetooth_devices
) combined
WHERE last_seen > NOW() - INTERVAL '7 days'
GROUP BY hour_of_day 
ORDER BY hour_of_day;

-- 19. Daily device discovery trends
SELECT DATE(first_seen) as discovery_date,
       COUNT(CASE WHEN ssid IS NOT NULL THEN 1 END) as wifi_networks,
       COUNT(CASE WHEN client_mac IS NOT NULL THEN 1 END) as wifi_clients,
       COUNT(CASE WHEN bd_address IS NOT NULL THEN 1 END) as bluetooth_devices
FROM (
    SELECT first_seen, ssid, NULL as client_mac, NULL as bd_address FROM wifi_networks
    UNION ALL
    SELECT first_seen, NULL as ssid, client_mac, NULL as bd_address FROM wifi_clients  
    UNION ALL
    SELECT first_seen, NULL as ssid, NULL as client_mac, bd_address FROM bluetooth_devices
) combined
WHERE first_seen > NOW() - INTERVAL '30 days'
GROUP BY discovery_date 
ORDER BY discovery_date DESC;

-- 20. Peak activity times
SELECT DATE_TRUNC('hour', last_seen) as activity_hour,
       COUNT(DISTINCT client_mac) as unique_wifi_devices,
       COUNT(DISTINCT bd_address) as unique_bluetooth_devices,
       COUNT(*) as total_observations
FROM (
    SELECT client_mac, NULL as bd_address, last_seen FROM wifi_clients
    UNION ALL  
    SELECT NULL as client_mac, bd_address, last_seen FROM bluetooth_devices
) combined
WHERE last_seen > NOW() - INTERVAL '24 hours'
GROUP BY activity_hour 
ORDER BY total_observations DESC
LIMIT 10;

-- =============================================================================
-- NETWORK SECURITY ANALYSIS
-- =============================================================================

-- 21. Security posture overview
SELECT security_type, 
       COUNT(*) as network_count,
       ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage,
       AVG(signal_strength) as avg_signal_strength
FROM wifi_networks 
GROUP BY security_type 
ORDER BY network_count DESC;

-- 22. Common/default network names (potential targets)
SELECT ssid, COUNT(*) as occurrences,
       ARRAY_AGG(DISTINCT vendor) as vendors,
       AVG(signal_strength) as avg_signal
FROM wifi_networks 
WHERE ssid IN ('linksys', 'netgear', 'dlink', 'default', 'xfinitywifi', 
               'NETGEAR', 'Linksys', 'TP-Link', 'AndroidAP')
GROUP BY ssid
ORDER BY occurrences DESC;

-- 23. Potentially vulnerable configurations
SELECT ssid, bssid, security_type, channel, signal_strength, vendor
FROM wifi_networks 
WHERE security_type IN ('WEP', 'Open') 
   OR ssid LIKE '%guest%' 
   OR ssid LIKE '%public%'
ORDER BY signal_strength DESC;

-- 24. Enterprise vs Consumer network analysis
SELECT 
    CASE 
        WHEN security_type LIKE '%Enterprise%' THEN 'Enterprise'
        WHEN security_type IN ('WPA2', 'WPA3') THEN 'Consumer Secured'
        WHEN security_type = 'Open' THEN 'Open/Public'
        WHEN security_type = 'WEP' THEN 'Legacy/Vulnerable'
        ELSE 'Other'
    END as network_category,
    COUNT(*) as count,
    ROUND(AVG(signal_strength), 1) as avg_signal,
    ARRAY_AGG(DISTINCT channel) as channels_used
FROM wifi_networks
GROUP BY network_category
ORDER BY count DESC;

-- =============================================================================
-- ADVANCED BEHAVIORAL ANALYSIS
-- =============================================================================

-- 25. Client roaming behavior (devices connecting to multiple networks)
SELECT w.client_mac, w.vendor,
       COUNT(DISTINCT w.network_bssid) as networks_connected,
       ARRAY_AGG(DISTINCT n.ssid) as network_names,
       MAX(w.last_seen) as last_activity
FROM wifi_clients w
LEFT JOIN wifi_networks n ON w.network_bssid = n.bssid
WHERE w.last_seen > NOW() - INTERVAL '24 hours'
GROUP BY w.client_mac, w.vendor
HAVING COUNT(DISTINCT w.network_bssid) > 1
ORDER BY networks_connected DESC;

-- 26. Bluetooth service discovery analysis
SELECT s.service_name, s.service_uuid,
       COUNT(DISTINCT d.bd_address) as device_count,
       ARRAY_AGG(DISTINCT d.vendor) as device_vendors
FROM bluetooth_services s
JOIN bluetooth_devices d ON s.device_id = d.id
GROUP BY s.service_name, s.service_uuid
ORDER BY device_count DESC;

-- 27. Channel utilization analysis
SELECT channel, 
       COUNT(*) as network_count,
       ROUND(AVG(signal_strength), 1) as avg_signal,
       MIN(signal_strength) as min_signal,
       MAX(signal_strength) as max_signal,
       ARRAY_AGG(DISTINCT security_type) as security_types
FROM wifi_networks 
WHERE channel IS NOT NULL
GROUP BY channel 
ORDER BY channel::INTEGER;

-- 28. Vendor distribution across device types
SELECT vendor, 
       COUNT(CASE WHEN phyname = 'IEEE802.11' THEN 1 END) as wifi_devices,
       COUNT(CASE WHEN phyname = 'Bluetooth' THEN 1 END) as bluetooth_devices,
       COUNT(*) as total_devices
FROM devices 
WHERE vendor IS NOT NULL AND vendor != '' AND vendor != 'Unknown'
GROUP BY vendor
HAVING COUNT(*) >= 5
ORDER BY total_devices DESC;

-- =============================================================================
-- THREAT HUNTING QUERIES
-- =============================================================================

-- 29. Potential rogue access points (same SSID, different BSSID)
SELECT ssid, COUNT(*) as bssid_count,
       ARRAY_AGG(bssid) as bssids,
       ARRAY_AGG(DISTINCT vendor) as vendors,
       ARRAY_AGG(DISTINCT security_type) as security_types
FROM wifi_networks 
WHERE ssid IS NOT NULL AND ssid != ''
GROUP BY ssid
HAVING COUNT(*) > 1
ORDER BY bssid_count DESC;

-- 30. Suspicious device names (potential pentesting tools)
SELECT bd_address, device_name, vendor, device_type, last_seen
FROM bluetooth_devices 
WHERE LOWER(device_name) LIKE ANY(ARRAY[
    '%hack%', '%pen%', '%test%', '%kali%', '%metasploit%', 
    '%aircrack%', '%wifi%pineapple%', '%rubber%duck%'
])
ORDER BY last_seen DESC;

-- 31. Devices with randomized MAC addresses (privacy indicators)
SELECT bd_address, device_name, vendor, is_random_address, last_seen
FROM bluetooth_devices 
WHERE is_random_address = true 
   OR bd_address::text LIKE '02:%'  -- Locally administered addresses
   OR bd_address::text LIKE '06:%'
   OR bd_address::text LIKE '0A:%'
   OR bd_address::text LIKE '0E:%'
ORDER BY last_seen DESC;

-- 32. High-activity devices (potential surveillance or monitoring)
SELECT device_key, macaddr, phyname, packets_total, data_size,
       last_time, manuf as vendor
FROM devices 
WHERE packets_total > 10000 
   OR data_size > 1000000
ORDER BY packets_total DESC;

-- =============================================================================
-- OPERATIONAL INTELLIGENCE
-- =============================================================================

-- 33. Data collection statistics by datasource
SELECT d.name, d.type, d.interface, d.hardware,
       COUNT(p.id) as packets_collected,
       COUNT(DISTINCT p.device_key) as unique_devices,
       MIN(p.ts) as first_packet,
       MAX(p.ts) as last_packet
FROM datasources d
LEFT JOIN packets p ON d.uuid = p.datasource_uuid
GROUP BY d.name, d.type, d.interface, d.hardware
ORDER BY packets_collected DESC;

-- 34. Processing statistics and data quality
SELECT 
    'wifi_networks' as table_name, COUNT(*) as record_count, 
    COUNT(CASE WHEN ssid IS NOT NULL THEN 1 END) as with_ssid,
    COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) as with_location
FROM wifi_networks
UNION ALL
SELECT 
    'wifi_clients' as table_name, COUNT(*) as record_count,
    COUNT(CASE WHEN vendor IS NOT NULL THEN 1 END) as with_vendor,
    COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) as with_location
FROM wifi_clients  
UNION ALL
SELECT 
    'bluetooth_devices' as table_name, COUNT(*) as record_count,
    COUNT(CASE WHEN device_name IS NOT NULL THEN 1 END) as with_name,
    COUNT(CASE WHEN latitude IS NOT NULL THEN 1 END) as with_location
FROM bluetooth_devices;

-- 35. Recent activity summary (last 24 hours)
SELECT 
    COUNT(DISTINCT w.ssid) as new_wifi_networks,
    COUNT(DISTINCT w.client_mac) as active_wifi_clients, 
    COUNT(DISTINCT b.bd_address) as active_bluetooth_devices,
    COUNT(DISTINCT p.device_key) as devices_with_packets
FROM wifi_networks w
FULL OUTER JOIN wifi_clients wc ON w.bssid = wc.network_bssid
FULL OUTER JOIN bluetooth_devices b ON 1=1
FULL OUTER JOIN packets p ON 1=1
WHERE w.last_seen > NOW() - INTERVAL '24 hours'
   OR wc.last_seen > NOW() - INTERVAL '24 hours' 
   OR b.last_seen > NOW() - INTERVAL '24 hours'
   OR p.ts > NOW() - INTERVAL '24 hours';

-- =============================================================================
-- EXPORT QUERIES FOR EXTERNAL ANALYSIS
-- =============================================================================

-- 36. CSV Export - WiFi Networks
SELECT bssid, ssid, security_type, channel, signal_strength, 
       vendor, latitude, longitude, first_seen, last_seen
FROM wifi_networks 
ORDER BY signal_strength DESC;

-- 37. CSV Export - Bluetooth Devices  
SELECT bd_address, device_name, device_type, vendor, rssi,
       latitude, longitude, first_seen, last_seen
FROM bluetooth_devices
ORDER BY last_seen DESC;

-- 38. JSON Export - Network Intelligence Summary
SELECT json_build_object(
    'summary_generated', NOW(),
    'wifi_networks', (SELECT COUNT(*) FROM wifi_networks),
    'wifi_clients', (SELECT COUNT(*) FROM wifi_clients), 
    'bluetooth_devices', (SELECT COUNT(*) FROM bluetooth_devices),
    'open_networks', (SELECT COUNT(*) FROM wifi_networks WHERE security_type = 'Open'),
    'wep_networks', (SELECT COUNT(*) FROM wifi_networks WHERE security_type = 'WEP'),
    'hidden_networks', (SELECT COUNT(*) FROM wifi_networks WHERE ssid IS NULL OR ssid = ''),
    'top_vendors', (
        SELECT json_agg(json_build_object('vendor', vendor, 'device_count', device_count))
        FROM (
            SELECT vendor, COUNT(*) as device_count 
            FROM (
                SELECT vendor FROM wifi_clients WHERE vendor IS NOT NULL
                UNION ALL 
                SELECT vendor FROM bluetooth_devices WHERE vendor IS NOT NULL
            ) combined
            GROUP BY vendor 
            ORDER BY device_count DESC 
            LIMIT 10
        ) top_vendors
    )
) as intelligence_summary;

-- =============================================================================
-- PERFORMANCE AND MAINTENANCE QUERIES
-- =============================================================================

-- 39. Table sizes and record counts
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('wifi_networks', 'wifi_clients', 'bluetooth_devices', 
                    'bluetooth_services', 'packets', 'devices', 'datasources')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 40. Partition information for time-series tables
SELECT schemaname, tablename, 
       pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public' 
  AND (tablename LIKE 'device_locations_%' OR tablename LIKE 'signal_measurements_%')
ORDER BY tablename;

-- =============================================================================
-- END OF INTELLIGENCE QUERIES
-- =============================================================================