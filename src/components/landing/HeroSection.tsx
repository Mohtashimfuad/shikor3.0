import React, { useState } from 'react';
import { Search, MapPin, Shield, CheckCircle2, ArrowRight, Sparkles, FileText, Layers } from 'lucide-react';
import { Language, PageView } from '../../types';

interface HeroSectionProps {
  language: Language;
  onSearch: (query: string) => void;
  setCurrentPage: (page: PageView) => void;
  onOpenCertificateDemo: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  language,
  onSearch,
  setCurrentPage,
  onOpenCertificateDemo
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activePin, setActivePin] = useState<string | null>('kurigram');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const hotSpots = [
    { id: 'kurigram', name: 'Kurigram (Chilmari)', river: 'Brahmaputra', x: '58%', y: '22%', loss: '0.58 Acre Submerged', dag: 'Dag #284' },
    { id: 'sirajganj', name: 'Sirajganj (Kazipur)', river: 'Jamuna', x: '50%', y: '42%', loss: '0.42 Acre Submerged', dag: 'Dag #519' },
    { id: 'shariatpur', name: 'Shariatpur (Naria)', river: 'Padma', x: '58%', y: '61%', loss: '0.88 Acre Submerged', dag: 'Dag #142' },
    { id: 'chandpur', name: 'Chandpur (Haimchar)', river: 'Meghna', x: '66%', y: '68%', loss: '0.62 Acre Submerged', dag: 'Dag #305' },
    { id: 'bhola', name: 'Bhola (Char Fasson)', river: 'Coastal Estuary', x: '70%', y: '84%', loss: '1.20 Acre Submerged', dag: 'Dag #88' }
  ];

  return (
    <section className="relative overflow-hidden bg-[#F5F1E8] pt-10 pb-16 lg:pt-14 lg:pb-24 border-b border-[#D9E1DC]">
      
      {/* Subtle organic pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#123B32_1px,transparent_1px)] [background-size:16px_16px]"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Text, Search & Value Prop (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Top Hackathon & Resilience Eyebrow */}
            <div className="flex items-center space-x-2">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#123B32] font-mono">
                {language === 'bn' ? 'বাংলাদেশ ল্যান্ডটেক ও নদীভাঙন সহনশীলতা' : 'BANGLADESH LANDTECH HACKATHON'}
              </span>
              <span className="w-12 h-0.5 bg-[#123B32]"></span>
            </div>

            {/* Main Headline (Direct match with reference picture) */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#123B32] font-serif-title leading-[1.15] tracking-tight">
                Land Ownership,<br className="hidden sm:inline" /> with Clarity and Trust.
              </h1>
              <p className="text-xl sm:text-2xl font-semibold text-[#123B32]/90 font-serif-title">
                জমির তথ্য হোক স্বচ্ছ, অধিকার হোক সুরক্ষিত।
              </p>
            </div>

            {/* Subtitle / Problem-Solution Brief */}
            <p className="text-base sm:text-lg text-[#1F2933]/80 leading-relaxed max-w-2xl">
              {language === 'bn' 
                ? 'নদীভাঙনে ভিটেমাটি বিলীন হলেও হারাবে না আপনার মালিকানার শিকড়। মোবাইল জিপিএস ছবি, সেন্টিনেল স্যাটেলাইট ও ঐতিহাসিক মৌজা নকশার মাধ্যমে তৈরি করুন ডিজিটাল ভাঙন সনদ এবং এসিল্যান্ড অফিসের পুনর্বাসন আবেদন।' 
                : 'Shikor helps you explore land records, detect inconsistencies in document history, and make informed decisions with transparency and trust. Built especially for char & coastal river erosion victims to claim rightful khas land resettlement.'}
            </p>

            {/* Prominent Search Bar (Styled exactly like the reference photo) */}
            <div className="pt-2">
              <form 
                onSubmit={handleSearchSubmit}
                className="bg-white p-2 rounded-xl sm:rounded-full shadow-lg border border-[#D9E1DC] flex flex-col sm:flex-row items-center gap-2 max-w-2xl transition-all duration-200 focus-within:ring-2 focus-within:ring-[#123B32]/20 focus-within:border-[#123B32]"
              >
                <div className="flex items-center pl-3 w-full sm:w-auto flex-1">
                  <MapPin className="w-5 h-5 text-[#64748B] shrink-0 mr-3" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={
                      language === 'bn' 
                        ? 'খতিয়ান নং / দাগ নং / মৌজা / মালিকের নাম লিখুন...' 
                        : 'Enter Khatian No / Plot No / Owner Name'
                    }
                    className="w-full text-sm sm:text-base text-[#1F2933] placeholder:text-[#64748B] focus:outline-none bg-transparent"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto bg-[#123B32] hover:bg-[#0e2f28] text-white px-7 py-3 rounded-lg sm:rounded-full font-medium text-sm flex items-center justify-center space-x-2 transition-colors duration-150 shrink-0 shadow-sm"
                >
                  <Search className="w-4 h-4" />
                  <span>{language === 'bn' ? 'অনুসন্ধান' : 'Search'}</span>
                </button>
              </form>

              {/* Sample quick queries */}
              <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-[#64748B] pl-2">
                <span className="font-medium text-[#123B32]">{language === 'bn' ? 'পাইলট নমুনা:' : 'Try sample:'}</span>
                <button
                  type="button"
                  onClick={() => { setSearchQuery('Dag 284 Chilmari'); onSearch('Dag 284 Chilmari'); }}
                  className="underline hover:text-[#123B32] transition-colors"
                >
                  Dag #284 (Chilmari)
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => { setSearchQuery('RS-1102'); onSearch('RS-1102'); }}
                  className="underline hover:text-[#123B32] transition-colors"
                >
                  Khatian RS-1102
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => { setSearchQuery('Sirajganj Kazipur'); onSearch('Sirajganj Kazipur'); }}
                  className="underline hover:text-[#123B32] transition-colors"
                >
                  Sirajganj Kazipur
                </button>
              </div>

              {/* Trust Subtext matching reference */}
              <div className="flex items-center space-x-4 text-xs font-medium text-[#123B32]/85 mt-4 pl-2">
                <div className="flex items-center space-x-1.5">
                  <Shield className="w-4 h-4 text-[#123B32]" />
                  <span>Secure</span>
                </div>
                <span>•</span>
                <span>Transparent</span>
                <span>•</span>
                <span className="text-[#123B32] font-semibold">For a Better Bangladesh</span>
              </div>
            </div>

            {/* Quick Action Buttons for Citizen & Official Demonstration */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                onClick={onOpenCertificateDemo}
                className="inline-flex items-center space-x-2 bg-[#D8E8DF] hover:bg-[#c7ded1] text-[#123B32] px-4 py-2 rounded-lg text-xs font-bold border border-[#b2cfbe] transition-colors"
              >
                <FileText className="w-4 h-4 text-[#123B32]" />
                <span>{language === 'bn' ? 'নদীভাঙন সনদ নমুনা দেখুন' : 'View Sample Loss Certificate'}</span>
              </button>
              <button
                onClick={() => setCurrentPage('satellite')}
                className="inline-flex items-center space-x-2 bg-white hover:bg-neutral-50 text-[#123B32] px-4 py-2 rounded-lg text-xs font-bold border border-[#D9E1DC] transition-colors"
              >
                <Layers className="w-4 h-4 text-[#C6A66B]" />
                <span>{language === 'bn' ? 'স্যাটেলাইট ও মৌজা ম্যাপ তুলক' : 'Satellite Mouza Overlay Tool'}</span>
              </button>
            </div>

          </div>

          {/* Right Column: Bangladesh Scenic Landscape + Glowing River Map Overlay (5 cols) */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white/80 bg-[#123B32]/10 group">
              
              {/* Lush Bangladesh Landscape Image */}
              <div className="relative h-[480px] w-full overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1589308078059-be1415eab4c3?auto=format&fit=crop&w=1200&q=80"
                  alt="Rural Bangladesh Char & Green Lands"
                  className="w-full h-full object-cover object-center filter brightness-[0.92] contrast-[1.05]"
                />
                
                {/* Emerald Gradient Overlay to match JomiTrace theme */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#123B32]/95 via-[#123B32]/40 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#123B32]/60 to-transparent"></div>

                {/* SVG Overlay: Bangladesh River Network & Topographic Contours */}
                <div className="absolute inset-0 p-4 pointer-events-none">
                  <svg className="w-full h-full text-white/80" viewBox="0 0 400 450" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Outline of Bangladesh in clean white neon line */}
                    <path
                      d="M170 30 Q210 25 240 50 L270 90 Q300 120 320 160 L340 220 Q350 260 330 300 L300 350 Q280 400 250 420 L210 410 Q170 390 150 360 L120 320 Q90 280 80 230 L70 170 Q80 110 110 70 Z"
                      stroke="rgba(255, 255, 255, 0.45)"
                      strokeWidth="1.5"
                      strokeDasharray="4 4"
                      fill="rgba(18, 59, 50, 0.15)"
                    />

                    {/* Major River Arteries (Jamuna, Padma, Meghna) */}
                    {/* Jamuna River Flow */}
                    <path
                      d="M185 45 Q190 90 180 130 T175 190 T180 230"
                      stroke="#8be3c9"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* Padma River Flow */}
                    <path
                      d="M110 175 Q150 195 180 230 T240 270"
                      stroke="#8be3c9"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    {/* Meghna River Flow to Bay */}
                    <path
                      d="M260 130 Q250 190 240 270 T245 350 T260 410"
                      stroke="#8be3c9"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>

                {/* Hotspot Location Pins on the Map */}
                {hotSpots.map((spot) => {
                  const isSelected = activePin === spot.id;
                  return (
                    <div
                      key={spot.id}
                      style={{ left: spot.x, top: spot.y }}
                      onClick={() => setActivePin(spot.id)}
                      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer z-20 group/pin"
                    >
                      <div className="relative flex items-center justify-center">
                        <span className={`w-3.5 h-3.5 rounded-full ${isSelected ? 'bg-[#C6A66B]' : 'bg-white'} shadow-md border-2 border-[#123B32]`}></span>
                        <span className="absolute -inset-1.5 rounded-full bg-white/40 animate-pulse-ring"></span>
                      </div>

                      {/* Tooltip Card on Active Pin */}
                      {isSelected && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-48 bg-[#123B32] text-white p-2.5 rounded-lg shadow-xl border border-[#C6A66B]/50 text-left z-30 pointer-events-auto">
                          <div className="flex items-center justify-between text-[10px] text-[#C6A66B] font-bold">
                            <span>{spot.river} River</span>
                            <span className="bg-amber-500/20 text-amber-200 px-1 py-0.2 rounded font-mono">SAMPLE</span>
                          </div>
                          <div className="text-xs font-bold text-white mt-0.5">{spot.name}</div>
                          <div className="text-[11px] text-[#D8E8DF] mt-1">{spot.loss}</div>
                          <div className="text-[10px] text-[#C6A66B] mt-0.5 font-mono">{spot.dag}</div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Hand-drawn signature note matching the reference picture */}
                <div className="absolute bottom-5 right-6 text-right z-10 pointer-events-none select-none">
                  <div className="text-3xl sm:text-4xl text-[#C6A66B] font-handwritten transform -rotate-6 font-bold drop-shadow-md">
                    Better Land
                  </div>
                  <div className="text-3xl sm:text-4xl text-white font-handwritten transform -rotate-3 font-bold -mt-2 drop-shadow-md">
                    Better Future
                  </div>
                  <div className="w-16 h-1 bg-[#C6A66B] ml-auto mt-1 rounded-full opacity-80"></div>
                </div>

                {/* Top left badge on the image */}
                <div className="absolute top-4 left-4 bg-[#123B32]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-white text-xs flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#C6A66B]" />
                  <span className="font-medium text-[11px]">{language === 'bn' ? 'নমুনা মানচিত্র — Sentinel/Mouza ডেটা যুক্ত নয়' : 'Demo map — no Sentinel/Mouza data connected'}</span>
                </div>

              </div>

            </div>

            {/* Subtle caption below map */}
            <div className="flex items-center justify-between mt-3 text-xs text-[#64748B] px-1">
              <span>{language === 'bn' ? 'নমুনা অবস্থান — লাইভ রেকর্ড নয়' : 'Sample locations — not live records'}</span>
              <span className="text-[#123B32] font-semibold">Kurigram • Sirajganj • Bhola</span>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
