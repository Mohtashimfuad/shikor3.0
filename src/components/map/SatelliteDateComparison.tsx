import React, { useCallback, useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { AlertCircle, RefreshCw, Satellite } from 'lucide-react';
import { Language } from '../../types';
import {
  buildGibsTileUrl,
  CHILMARI_STUDY_AREA,
  GIBS_MAX_ZOOM,
  getImageryDateLabel,
  getImageryStatusMessage,
  ImageryTileStatus,
} from '../../lib/satelliteImagery';

interface SatelliteDateComparisonProps {
  language: Language;
}

const today = new Date().toISOString().slice(0, 10);

interface SatellitePanelProps {
  date: string;
  language: Language;
  retryToken: number;
  onStatusChange: (status: ImageryTileStatus) => void;
  onMove: (center: L.LatLng, zoom: number) => void;
  onMapReady: (map: L.Map | null) => void;
}

const SatellitePanel: React.FC<SatellitePanelProps> = ({
  date,
  language,
  retryToken,
  onStatusChange,
  onMove,
  onMapReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onMoveRef = useRef(onMove);
  const statusRef = useRef(onStatusChange);

  useEffect(() => { onMoveRef.current = onMove; }, [onMove]);
  useEffect(() => { statusRef.current = onStatusChange; }, [onStatusChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [CHILMARI_STUDY_AREA.latitude, CHILMARI_STUDY_AREA.longitude],
      zoom: CHILMARI_STUDY_AREA.zoom,
      minZoom: 4,
      maxZoom: GIBS_MAX_ZOOM,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    });
    L.control.attribution({ prefix: false }).addTo(map);
    L.circleMarker([CHILMARI_STUDY_AREA.latitude, CHILMARI_STUDY_AREA.longitude], {
      radius: 7,
      color: '#123B32',
      weight: 2,
      fillColor: '#C6A66B',
      fillOpacity: 0.95,
    })
      .bindTooltip(language === 'bn' ? 'চিলমারীর আনুমানিক কেন্দ্র' : 'Approximate Chilmari locality center')
      .addTo(map);
    map.on('moveend', () => onMoveRef.current(map.getCenter(), map.getZoom()));
    mapRef.current = map;
    onMapReady(map);
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      window.clearTimeout(resizeTimer);
      onMapReady(null);
      map.remove();
      mapRef.current = null;
    };
  }, [language, onMapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const tileUrl = buildGibsTileUrl(date);
    statusRef.current('loading');
    if (!tileUrl) {
      statusRef.current('unavailable');
      return;
    }

    let loadedTileCount = 0;
    let tileLayer: L.TileLayer | null = null;
    const onTileLoad = () => {
      loadedTileCount += 1;
      if (loadedTileCount === 1) statusRef.current('available');
    };
    const onTileError = () => {
      if (loadedTileCount === 0) statusRef.current('unavailable');
    };
    tileLayer = L.tileLayer(tileUrl, {
      minZoom: 4,
      maxZoom: GIBS_MAX_ZOOM,
      maxNativeZoom: GIBS_MAX_ZOOM,
      attribution: 'Imagery: NASA Global Imagery Browse Services (GIBS) / Terra MODIS',
      crossOrigin: true,
      errorTileUrl: '',
    });
    tileLayer.on('tileload', onTileLoad);
    tileLayer.on('tileerror', onTileError);
    tileLayer.addTo(map);
    return () => {
      tileLayer?.off('tileload', onTileLoad);
      tileLayer?.off('tileerror', onTileError);
      if (tileLayer && map.hasLayer(tileLayer)) map.removeLayer(tileLayer);
    };
  }, [date, retryToken]);

  return <div ref={containerRef} className="h-[300px] sm:h-[360px] w-full rounded-b-2xl" aria-label={language === 'bn' ? 'চিলমারীর স্যাটেলাইট মানচিত্র' : 'Chilmari satellite map'} />;
};

export const SatelliteDateComparison: React.FC<SatelliteDateComparisonProps> = ({ language }) => {
  const [earlierDate, setEarlierDate] = useState('2023-01-15');
  const [laterDate, setLaterDate] = useState('2024-01-15');
  const [earlierStatus, setEarlierStatus] = useState<ImageryTileStatus>('loading');
  const [laterStatus, setLaterStatus] = useState<ImageryTileStatus>('loading');
  const [retryToken, setRetryToken] = useState(0);
  const earlierMapRef = useRef<L.Map | null>(null);
  const laterMapRef = useRef<L.Map | null>(null);
  const synchronizingRef = useRef(false);

  const labels = language === 'bn'
    ? {
      kicker: 'বাস্তব ঐতিহাসিক উপগ্রহ চিত্র', title: 'চিলমারী: দুই তারিখের চিত্র তুলনা',
      intro: 'একই এলাকার NASA Terra/MODIS দৈনিক সত্য-রঙের কম্পোজিট দেখুন। তারিখ বেছে নিলে NASA GIBS থেকে সরাসরি টাইল লোড হয়।',
      before: 'আগের তারিখ', after: 'পরের তারিখ', retry: 'আবার লোড করুন',
      source: 'উৎস ও সীমাবদ্ধতা', detail: 'NASA GIBS · Terra MODIS corrected reflectance, true color · দৈনিক কম্পোজিট। সর্বোচ্চ দৃশ্যমান রেজল্যুশন বিষুবরেখায় প্রায় ২৫০ মিটার; মেঘ, ছায়া, অনুপস্থিত টাইল এবং মৌসুমি নদীপ্রবাহ দৃশ্যকে প্রভাবিত করে। এটি পরিমাপ, জমির মালিকানা যাচাই বা ব্যক্তিগত দাবির প্রমাণ নয়।',
      location: 'অধ্যয়ন এলাকার আনুমানিক কেন্দ্র', locationNote: 'চিলমারী এলাকার নামভিত্তিক কেন্দ্র; কোনো দাবির GPS স্থানাঙ্ক নয়।',
      chooseDates: 'দুই তারিখ আলাদা হতে হবে।', mapLoading: 'মানচিত্র প্রস্তুত হচ্ছে…',
    }
    : {
      kicker: 'REAL HISTORICAL SATELLITE IMAGERY', title: 'Chilmari: compare two image dates',
      intro: 'View NASA Terra/MODIS daily true-color composites for the same area. Selecting a date loads tiles directly from NASA GIBS.',
      before: 'Earlier date', after: 'Later date', retry: 'Retry loading',
      source: 'Source and limitations', detail: 'NASA GIBS · Terra MODIS corrected reflectance, true color · daily composite. Maximum visual resolution is about 250 m at the equator; clouds, shadows, missing tiles, and seasonal river flow affect visibility. This is not a measurement, proof of land ownership, or evidence for an individual claim.',
      location: 'Approximate study-area center', locationNote: 'Named-place center for Chilmari; not a claim GPS coordinate.',
      chooseDates: 'Choose two different dates.', mapLoading: 'Preparing map…',
    };

  const syncView = useCallback((source: 'earlier' | 'later', center: L.LatLng, zoom: number) => {
    if (synchronizingRef.current) return;
    const destination = source === 'earlier' ? laterMapRef.current : earlierMapRef.current;
    if (!destination) return;
    const currentCenter = destination.getCenter();
    if (destination.getZoom() === zoom && currentCenter.distanceTo(center) < 0.1) return;
    synchronizingRef.current = true;
    destination?.setView(center, zoom, { animate: false });
    window.setTimeout(() => { synchronizingRef.current = false; }, 0);
  }, []);
  const setEarlierMap = useCallback((map: L.Map | null) => { earlierMapRef.current = map; }, []);
  const setLaterMap = useCallback((map: L.Map | null) => { laterMapRef.current = map; }, []);
  const earlierMove = useCallback((center: L.LatLng, zoom: number) => syncView('earlier', center, zoom), [syncView]);
  const laterMove = useCallback((center: L.LatLng, zoom: number) => syncView('later', center, zoom), [syncView]);

  const updateDate = (date: string, setter: (value: string) => void) => {
    setter(date);
  };
  const datesAreValid = earlierDate !== laterDate;

  return (
    <section className="space-y-5" aria-labelledby="satellite-comparison-title">
      <div className="max-w-4xl">
        <div className="flex items-center gap-2 text-xs font-extrabold tracking-widest text-[#123B32] font-mono">
          <Satellite size={16} aria-hidden="true" />
          <span>{labels.kicker}</span>
        </div>
        <h2 id="satellite-comparison-title" className="mt-2 text-2xl sm:text-3xl font-bold text-[#123B32] font-serif-title">{labels.title}</h2>
        <p className="mt-2 text-sm text-[#64748B]">{labels.intro}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {([
          { side: 'earlier' as const, date: earlierDate, setDate: setEarlierDate, status: earlierStatus, setStatus: setEarlierStatus, map: setEarlierMap, move: earlierMove, title: labels.before },
          { side: 'later' as const, date: laterDate, setDate: setLaterDate, status: laterStatus, setStatus: setLaterStatus, map: setLaterMap, move: laterMove, title: labels.after },
        ]).map((panel) => (
          <article key={panel.side} className="overflow-hidden rounded-2xl border border-[#D9E1DC] bg-white shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-3 p-4">
              <label className="grid gap-1 text-sm font-semibold text-[#123B32]">
                <span>{panel.title}</span>
                <input
                  type="date"
                  value={panel.date}
                  min="2000-02-24"
                  max={today}
                  onChange={(event) => updateDate(event.target.value, panel.setDate)}
                  className="rounded-lg border border-[#D9E1DC] bg-[#F5F1E8] px-3 py-2 text-sm"
                  aria-label={panel.title}
                />
              </label>
              <button
                type="button"
                onClick={() => setRetryToken((value) => value + 1)}
                className="inline-flex items-center gap-2 rounded-lg border border-[#D9E1DC] px-3 py-2 text-xs font-semibold text-[#123B32] hover:bg-[#F5F1E8]"
              >
                <RefreshCw size={14} aria-hidden="true" /> {labels.retry}
              </button>
            </div>
            <SatellitePanel
              date={panel.date}
              language={language}
              retryToken={retryToken}
              onStatusChange={panel.setStatus}
              onMove={panel.move}
              onMapReady={panel.map}
            />
            <div className="min-h-[82px] space-y-1 border-t border-[#D9E1DC] px-4 py-3 text-xs text-[#64748B]">
              <p className="font-semibold text-[#123B32]">{getImageryDateLabel(panel.date, language)}</p>
              <p aria-live="polite" className="flex items-start gap-1.5">
                {panel.status === 'unavailable' && <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />}
                {getImageryStatusMessage(panel.status, language)}
              </p>
            </div>
          </article>
        ))}
      </div>

      <div className="grid gap-4 rounded-2xl border border-[#D9E1DC] bg-white p-5 sm:grid-cols-2">
        <div>
          <h3 className="font-bold text-[#123B32]">{labels.source}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#64748B]">{labels.detail}</p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            <a href="https://gibs.earthdata.nasa.gov/layer-metadata/v1.0/MODIS_Terra_CorrectedReflectance_TrueColor.json" target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#123B32] underline underline-offset-2">NASA GIBS layer metadata</a>
            <a href="https://worldview.earthdata.nasa.gov/" target="_blank" rel="noreferrer" className="text-xs font-semibold text-[#123B32] underline underline-offset-2">NASA Worldview</a>
          </div>
        </div>
        <div>
          <h3 className="font-bold text-[#123B32]">{labels.location}</h3>
          <p className="mt-1 text-sm text-[#123B32]">{CHILMARI_STUDY_AREA.name} · {CHILMARI_STUDY_AREA.latitude}, {CHILMARI_STUDY_AREA.longitude}</p>
          <p className="mt-1 text-xs text-[#64748B]">{labels.locationNote}</p>
          <a href="https://mapcarta.com/34913936" target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-semibold text-[#123B32] underline underline-offset-2">{language === 'bn' ? 'চিলমারী এলাকার মানচিত্র উৎস' : 'Chilmari locality map source'}</a>
        </div>
      </div>
      {!datesAreValid && <p role="alert" className="text-sm font-medium text-amber-800">{labels.chooseDates}</p>}
    </section>
  );
};
