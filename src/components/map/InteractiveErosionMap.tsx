import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Satellite, 
  Layers, 
  AlertTriangle, 
  MapPin, 
  TrendingUp, 
  ShieldAlert, 
  Eye, 
  FileCheck, 
  Calendar, 
  ExternalLink,
  ChevronRight,
  Maximize2,
  Minimize2,
  Compass,
  Info
} from 'lucide-react';
import { CURRENT_YEAR_EROSION_ZONES, ErosionZone } from '../../data/erosionZones';
import { Language } from '../../types';

interface InteractiveErosionMapProps {
  language: Language;
  onOpenCertificateDemo: () => void;
  onOpenClaimDemo: () => void;
}

export const InteractiveErosionMap: React.FC<InteractiveErosionMapProps> = ({
  language,
  onOpenCertificateDemo,
  onOpenClaimDemo
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  const [selectedZone, setSelectedZone] = useState<ErosionZone>(CURRENT_YEAR_EROSION_ZONES[0]);
  const [baseMapType, setBaseMapType] = useState<'satellite' | 'street' | 'terrain'>('satellite');
  const [showNdwiLayer, setShowNdwiLayer] = useState<boolean>(true);
  const [showMouzaGrid, setShowMouzaGrid] = useState<boolean>(true);
  const [filterRisk, setFilterRisk] = useState<'all' | 'critical' | 'high'>('all');
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create map instance
      const map = L.map(mapContainerRef.current, {
        center: [24.0, 90.0],
        zoom: 7,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      mapInstanceRef.current = map;
      layersGroupRef.current = L.layerGroup().addTo(map);
    }

    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing tile layer and re-add selected base layer
    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let tileUrl = '';
    let maxZoom = 18;

    if (baseMapType === 'satellite') {
      // High-res Esri World Imagery (Satellite)
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 18;
    } else if (baseMapType === 'terrain') {
      tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
      maxZoom = 17;
    } else {
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      maxZoom = 19;
    }

    L.tileLayer(tileUrl, {
      maxZoom,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    // Refresh overlay layers
    if (layersGroupRef.current) {
      layersGroupRef.current.clearLayers();

      const filtered = CURRENT_YEAR_EROSION_ZONES.filter(z => 
        filterRisk === 'all' || z.riskLevel === filterRisk
      );

      filtered.forEach((zone) => {
        const isSelected = selectedZone.id === zone.id;
        const color = zone.riskLevel === 'critical' ? '#ef4444' : '#f97316';

        // 1. Draw High-Risk Polygon Zone
        const polygon = L.polygon(zone.boundaryCoordinates, {
          color: color,
          weight: isSelected ? 3 : 2,
          opacity: 0.9,
          fillColor: color,
          fillOpacity: isSelected ? 0.35 : 0.2,
          dashArray: isSelected ? undefined : '5, 5'
        });

        polygon.on('click', () => {
          setSelectedZone(zone);
          map.flyTo([zone.lat, zone.lng], 11, { duration: 1.2 });
        });

        layersGroupRef.current?.addLayer(polygon);

        // 2. Custom HTML Marker with pulsing beacon
        const markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-lg border-2 border-white"
                 style="background-color: ${color}">
              ${zone.riskLevel === 'critical' ? '!' : '▲'}
            </div>
            <div class="absolute -inset-1.5 rounded-full animate-ping opacity-60" style="background-color: ${color}"></div>
            <div class="absolute top-7 bg-[#123B32] text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md whitespace-nowrap border border-[#C6A66B]/50 pointer-events-none">
              ${zone.upazila} (${zone.erosionRateMetersPerYear}m/yr)
            </div>
          </div>
        `;

        const customIcon = L.divIcon({
          className: 'custom-erosion-marker',
          html: markerHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([zone.lat, zone.lng], { icon: customIcon });
        marker.on('click', () => {
          setSelectedZone(zone);
          map.flyTo([zone.lat, zone.lng], 11, { duration: 1.2 });
        });

        layersGroupRef.current?.addLayer(marker);

        // 3. Cadastral Mouza Grid simulation lines if toggled
        if (showMouzaGrid && isSelected) {
          const lat = zone.lat;
          const lng = zone.lng;
          const delta = 0.015;

          const cadastralBox = L.rectangle(
            [
              [lat - delta, lng - delta],
              [lat + delta, lng + delta]
            ],
            {
              color: '#C6A66B',
              weight: 1.5,
              fillOpacity: 0.08,
              dashArray: '3, 3'
            }
          );
          layersGroupRef.current?.addLayer(cadastralBox);
        }
      });
    }

  }, [baseMapType, filterRisk, selectedZone, showMouzaGrid]);

  // Fly to selected zone helper
  const handleFlyToZone = (zone: ErosionZone) => {
    setSelectedZone(zone);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([zone.lat, zone.lng], 11, { duration: 1.2 });
    }
  };

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([24.0, 90.0], 7, { duration: 1.2 });
    }
  };

  return (
    <section className="py-12 bg-[#F5F1E8] border-b border-[#D9E1DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#123B32] font-mono">
                {language === 'bn' ? 'ইন্টারেক্টিভ মানচিত্র ডেমো' : 'INTERACTIVE MAP DEMO'}
              </span>
              <span className="w-8 h-0.5 bg-[#123B32]"></span>
              <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-300 animate-pulse">
                DEMO DATA · NOT A LIVE FEED
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold text-[#123B32] font-serif-title leading-tight">
              {language === 'bn' 
                ? 'নদীভাঙন অঞ্চল ও স্যাটেলাইট ওভারলে — নমুনা'
                : 'Interactive River Erosion Zones & Satellite Overlays'}
            </h2>

            <p className="text-xs sm:text-sm text-[#64748B] max-w-3xl">
              {language === 'bn'
                ? 'এটি স্থির ডেমো জোন ও মানচিত্র স্তর। এখানে কোনো চলতি বছরের ভাঙন পরিমাপ, Sentinel-2 বিশ্লেষণ বা নাগরিক নথি যুক্ত নেই।'
                : 'This map uses static demo zones and map layers. It has no live erosion measurements, Sentinel-2 analysis, or linked citizen dossiers.'}
            </p>
          </div>

          {/* Quick River Corridor Switcher */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={handleResetView}
              className="px-3 py-1.5 rounded-lg bg-white border border-[#D9E1DC] text-[#123B32] font-semibold hover:bg-neutral-50 transition-colors shadow-sm"
            >
              🇧🇩 All Bangladesh
            </button>
            <button
              onClick={() => handleFlyToZone(CURRENT_YEAR_EROSION_ZONES[0])}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm ${
                selectedZone.id === CURRENT_YEAR_EROSION_ZONES[0].id
                  ? 'bg-[#123B32] text-white'
                  : 'bg-white border border-[#D9E1DC] text-[#123B32] hover:bg-neutral-50'
              }`}
            >
              Kurigram (Brahmaputra)
            </button>
            <button
              onClick={() => handleFlyToZone(CURRENT_YEAR_EROSION_ZONES[1])}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm ${
                selectedZone.id === CURRENT_YEAR_EROSION_ZONES[1].id
                  ? 'bg-[#123B32] text-white'
                  : 'bg-white border border-[#D9E1DC] text-[#123B32] hover:bg-neutral-50'
              }`}
            >
              Sirajganj (Jamuna)
            </button>
            <button
              onClick={() => handleFlyToZone(CURRENT_YEAR_EROSION_ZONES[3])}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm ${
                selectedZone.id === CURRENT_YEAR_EROSION_ZONES[3].id
                  ? 'bg-[#123B32] text-white'
                  : 'bg-white border border-[#D9E1DC] text-[#123B32] hover:bg-neutral-50'
              }`}
            >
              Naria (Padma)
            </button>
            <button
              onClick={() => handleFlyToZone(CURRENT_YEAR_EROSION_ZONES[5])}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm ${
                selectedZone.id === CURRENT_YEAR_EROSION_ZONES[5].id
                  ? 'bg-[#123B32] text-white'
                  : 'bg-white border border-[#D9E1DC] text-[#123B32] hover:bg-neutral-50'
              }`}
            >
              Bhola (Coastal Estuary)
            </button>
          </div>
        </div>

        {/* Map Container & Inspector Grid */}
        <div className={`grid grid-cols-1 lg:grid-cols-12 gap-5 ${isFullScreen ? 'fixed inset-4 z-50 bg-[#F5F1E8] p-4 rounded-2xl shadow-2xl overflow-y-auto' : ''}`}>
          
          {/* Main Map Box (8 cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#D9E1DC] shadow-md overflow-hidden flex flex-col">
            
            {/* Map Top Control Toolbar */}
            <div className="bg-[#123B32] text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              
              {/* Base Tile Selector */}
              <div className="flex items-center space-x-1.5">
                <span className="text-[#D8E8DF] font-medium mr-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-[#C6A66B]" />
                  <span>Base Layer:</span>
                </span>
                <button
                  onClick={() => setBaseMapType('satellite')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                    baseMapType === 'satellite' ? 'bg-[#C6A66B] text-[#123B32]' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Satellite Basemap
                </button>
                <button
                  onClick={() => setBaseMapType('street')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                    baseMapType === 'street' ? 'bg-[#C6A66B] text-[#123B32]' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Carto Street
                </button>
                <button
                  onClick={() => setBaseMapType('terrain')}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                    baseMapType === 'terrain' ? 'bg-[#C6A66B] text-[#123B32]' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  Topography
                </button>
              </div>

              {/* Toggles for Cadastre & Risk Filter */}
              <div className="flex items-center space-x-3">
                <label className="flex items-center space-x-1.5 cursor-pointer text-[#D8E8DF] hover:text-white">
                  <input
                    type="checkbox"
                    checked={showMouzaGrid}
                    onChange={(e) => setShowMouzaGrid(e.target.checked)}
                    className="rounded text-[#C6A66B] focus:ring-0"
                  />
                  <span className="text-[11px]">Illustrative Mouza Grid</span>
                </label>

                <div className="flex items-center space-x-1 border-l border-white/20 pl-3">
                  <span className="text-[#D8E8DF] text-[11px]">Filter:</span>
                  <select
                    value={filterRisk}
                    onChange={(e) => setFilterRisk(e.target.value as any)}
                    className="bg-[#0c2721] text-white text-[11px] rounded px-2 py-0.5 border border-white/20 outline-none"
                  >
                    <option value="all">All Risks ({CURRENT_YEAR_EROSION_ZONES.length})</option>
                    <option value="critical">Critical (&gt;180m/yr)</option>
                    <option value="high">High (80-180m/yr)</option>
                  </select>
                </div>

                <button
                  onClick={() => setIsFullScreen(!isFullScreen)}
                  className="p-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                  title="Toggle Fullscreen"
                >
                  {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              </div>

            </div>

            {/* Leaflet Map Canvas */}
            <div 
              ref={mapContainerRef} 
              className="w-full h-[450px] sm:h-[520px] bg-neutral-900 relative z-10"
            />

            {/* Bottom Status Ribbon */}
            <div className="bg-[#F5F1E8] px-4 py-2 border-t border-[#D9E1DC] flex flex-wrap items-center justify-between text-xs text-[#123B32] gap-2">
              <div className="flex items-center space-x-4">
                <span className="flex items-center gap-1 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block"></span>
                  <span>Critical Risk (&gt;180m/yr)</span>
                </span>
                <span className="flex items-center gap-1 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block"></span>
                  <span>High Risk (80-180m/yr)</span>
                </span>
                <span className="flex items-center gap-1 font-mono text-[#64748B] text-[11px] hidden sm:inline">
                  Static demo values • no Sentinel analysis
                </span>
              </div>

              <div className="text-[11px] font-mono text-[#64748B]">
                Active Centroid: {selectedZone.lat.toFixed(4)}°N, {selectedZone.lng.toFixed(4)}°E
              </div>
            </div>

          </div>

          {/* Right Inspector & Citizen Dossier Panel (4 cols) */}
          <div className="lg:col-span-4 space-y-4 flex flex-col justify-between">
            
            {/* Active Zone Detail Card */}
            <div className="bg-white rounded-2xl border border-[#D9E1DC] p-5 shadow-sm space-y-4">
              
              {/* Header with Risk Badge */}
              <div className="flex items-center justify-between pb-3 border-b border-[#D9E1DC]">
                <div className="flex items-center space-x-1.5">
                  <ShieldAlert className={`w-4 h-4 ${selectedZone.riskLevel === 'critical' ? 'text-red-600' : 'text-orange-500'}`} />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#123B32]">
                    ZONE INSPECTION
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  selectedZone.riskLevel === 'critical' 
                    ? 'bg-red-50 text-red-800 border-red-300' 
                    : 'bg-orange-50 text-orange-800 border-orange-300'
                }`}>
                  {selectedZone.riskLevel.toUpperCase()} RISK
                </span>
              </div>

              {/* Title & River */}
              <div>
                <h3 className="text-xl font-bold text-[#123B32] font-serif-title leading-snug">
                  {selectedZone.name}
                </h3>
                <p className="text-xs font-semibold text-[#123B32]/85 mt-0.5">
                  Upazila: {selectedZone.upazila} • {selectedZone.district}
                </p>
                <div className="text-xs text-[#64748B] flex items-center gap-1 mt-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#C6A66B]" />
                  <span>River Basin: <strong className="text-[#123B32]">{selectedZone.river}</strong></span>
                </div>
              </div>

              {/* Satellite Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                
                <div className="bg-[#F5F1E8] p-2.5 rounded-xl border border-[#D9E1DC]">
                  <span className="text-[10px] text-[#64748B] block uppercase font-mono">Sample erosion rate</span>
                  <span className="text-base font-bold text-red-700 font-mono">
                    {selectedZone.erosionRateMetersPerYear} m/yr
                  </span>
                </div>

                <div className="bg-[#F5F1E8] p-2.5 rounded-xl border border-[#D9E1DC]">
                  <span className="text-[10px] text-[#64748B] block uppercase font-mono">Sample land loss (yr)</span>
                  <span className="text-base font-bold text-[#123B32] font-mono">
                    {selectedZone.annualLandLossHectares} Hectares
                  </span>
                </div>

                <div className="bg-[#F5F1E8] p-2.5 rounded-xl border border-[#D9E1DC]">
                  <span className="text-[10px] text-[#64748B] block uppercase font-mono">Sample homesteads</span>
                  <span className="text-base font-bold text-[#123B32] font-mono">
                    {selectedZone.threatenedHomesteads.toLocaleString()}
                  </span>
                </div>

                <div className="bg-[#F5F1E8] p-2.5 rounded-xl border border-[#D9E1DC]">
                  <span className="text-[10px] text-[#64748B] block uppercase font-mono">Sample water index</span>
                  <span className="text-base font-bold text-emerald-800 font-mono">
                    {(selectedZone.ndwiWaterIndex * 100).toFixed(0)}% Saturated
                  </span>
                </div>

              </div>

              {/* Satellite Pass & Vulnerability */}
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                  <span className="flex items-center gap-1">
                    <Satellite className="w-3.5 h-3.5 text-[#123B32]" />
                    <span>No satellite source connected</span>
                  </span>
                  <span className="font-mono text-[#123B32] font-semibold">Demo data</span>
                </div>

                <p className="text-[11px] text-[#64748B] bg-[#Fdfbf7] p-2.5 rounded-lg border border-[#D9E1DC] leading-relaxed">
                  {selectedZone.keyVulnerabilitySummary}
                </p>
              </div>

              {/* Impacted Mouza Cadastral List */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-[#123B32] uppercase tracking-wider block">
                  Submerged Mouza Plots Detected:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedZone.mouzaCadastralList.map((m, idx) => (
                    <span 
                      key={idx} 
                      className="text-[10px] bg-[#D8E8DF] text-[#123B32] font-semibold px-2 py-0.5 rounded border border-[#b2cfbe]"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2 border-t border-[#D9E1DC]">
                <button
                  onClick={onOpenCertificateDemo}
                  className="w-full bg-[#123B32] hover:bg-[#0c2822] text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-md"
                >
                  <FileCheck className="w-4 h-4 text-[#C6A66B]" />
                  <span>{language === 'bn' ? 'এই জোনের ভাঙন সনদ তৈরি করুন' : 'Generate Zone Land Loss Dossier'}</span>
                </button>

                <button
                  onClick={onOpenClaimDemo}
                  className="w-full bg-[#D8E8DF] hover:bg-[#c6dfd0] text-[#123B32] py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors border border-[#a8cfb9]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'ইউএনও/এসিল্যান্ড পুনর্বাসন আবেদন' : 'File AC Land / UNO Claim'}</span>
                </button>
              </div>

            </div>

            {/* Quick Summary Pill Bar */}
            <div className="bg-[#123B32] text-white p-3.5 rounded-xl border border-[#1b4e43] text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-[#C6A66B]" />
                <span className="font-semibold">Char Belt Monitored:</span>
              </div>
              <span className="font-mono text-[#C6A66B] font-bold">1,420 km riverline</span>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
