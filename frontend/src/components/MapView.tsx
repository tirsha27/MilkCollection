import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, LayersControl,useMap  } from "react-leaflet";
import L from "leaflet";
import { api } from "../lib/api-client";
import { API } from "../lib/api-endpoints";

// 👨‍🌾 Vendor (Farmer) Icon — unchanged
const vendorIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/684/684908.png",
  iconSize: [30, 30],
  iconAnchor: [15, 30],
});

// 🏭 Storage Hub (Chilling Centre) Icon — Black Factory Building Icon
// 🏢 Storage Hub (Chilling Centre) Icon — high visibility + glow effect
const hubIcon = new L.DivIcon({
  html: `
    <div style="
      border-radius: 8px;
      width: 38px;
      height: 38px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 10px 3px rgba(17, 37, 5, 0.8);
      transform: rotate(0deg);
    ">
      🏭
    </div>
  `,
  className: "", // removes default Leaflet styling
  iconSize: [38, 38],
  iconAnchor: [19, 38],
  popupAnchor: [0, -35],
});
function MapBoundsController({ positions }: { positions: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;

    const bounds = L.latLngBounds(positions);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [map, positions]);

  return null; // This component does not render UI
}

// 🚛 Fleet Vehicle Icon — unchanged
const fleetIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/1995/1995574.png",
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

export default function MapView() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [hubs, setHubs] = useState<any[]>([]);
  const [fleet, setFleet] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [vendorsRes, hubsRes, fleetRes] = await Promise.all([
        api.get(`${API.vendors}/`),
        api.get(`${API.storageHubs}/`),
        api.get(`${API.fleet}/`),
      ]);

      setVendors(vendorsRes.data || []);
      setHubs(hubsRes.data || []);
      setFleet(fleetRes.data || []);
    } catch (error) {
      console.error("❌ Failed to fetch map data:", error);
    } finally {
      setLoading(false);
    }
  };

 const allPositions: [number, number][] = [
    ...vendors.filter((v) => v.latitude && v.longitude).map((v) => [v.latitude, v.longitude]),
    ...hubs.filter((h) => h.latitude && h.longitude).map((h) => [h.latitude, h.longitude]),
    ...fleet.filter((f) => f.current_latitude && f.current_longitude).map((f) => [f.current_latitude, f.current_longitude]),
  ];

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="h-[90vh] w-full rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <MapContainer
        center={[15.9129, 79.74]} // Default center (Andhra Pradesh, India)
        zoom={7}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
         <MapBoundsController positions={allPositions} />

        <LayersControl position="topright">
          {/* 👨‍🌾 Vendors Layer */}
          <LayersControl.Overlay name="Vendors" checked>
            <>
              {vendors.map((v: any) =>
                v.latitude && v.longitude ? (
                  <Marker
                    key={v.id}
                    position={[v.latitude, v.longitude]}
                    icon={vendorIcon}
                  >
                    <Popup>
                      <div>
                        <h3 className="font-semibold text-slate-800">{v.vendor_name}</h3>
                        <p className="text-sm text-slate-600">
                          Village: {v.village || "N/A"}
                        </p>
                        <p className="text-sm text-slate-600">
                          Milk: {v.milk_quantity_liters} L
                        </p>
                        <p className="text-sm text-slate-600">
                          Contact: {v.contact_number}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ) : null
              )}
            </>
          </LayersControl.Overlay>

          {/* 🏭 Storage Hubs Layer */}
          <LayersControl.Overlay name="Storage Hubs" checked>
            <>
              {hubs.map((h: any) =>
                h.latitude && h.longitude ? (
                  <Marker
                    key={h.id}
                    position={[h.latitude, h.longitude]}
                    icon={hubIcon}
                  >
                    <Popup>
                      <div>
                        <h3 className="font-semibold text-slate-800">{h.hub_name}</h3>
                        <p className="text-sm text-slate-600">
                          Location: {h.location}
                        </p>
                        <p className="text-sm text-slate-600">
                          Capacity: {h.capacity_liters} L
                        </p>
                        <p className="text-sm text-slate-600">
                          Contact: {h.contact_number}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ) : null
              )}
            </>
          </LayersControl.Overlay>

          {/* 🚛 Fleet Layer */}
          <LayersControl.Overlay name="Fleet Vehicles" checked>
            <>
              {fleet.map((f: any) =>
                f.current_latitude && f.current_longitude ? (
                  <Marker
                    key={f.id}
                    position={[f.current_latitude, f.current_longitude]}
                    icon={fleetIcon}
                  >
                    <Popup>
                      <div>
                        <h3 className="font-semibold text-slate-800">{f.vehicle_name}</h3>
                        <p className="text-sm text-slate-600">
                          Vehicle No: {f.vehicle_number}
                        </p>
                        <p className="text-sm text-slate-600">
                          Capacity: {f.capacity_liters} L
                        </p>
                        <p className="text-sm text-slate-600">
                          Chilling Center: {f.chilling_center_id}
                        </p>
                        <p className="text-sm text-slate-600">
                          Available: {f.is_available ? "✅ Yes" : "❌ No"}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ) : null
              )}
            </>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </div>
  );
}
