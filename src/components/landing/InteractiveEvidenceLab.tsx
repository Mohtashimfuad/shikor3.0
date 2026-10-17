import React, { useState } from 'react';
import { 
  Satellite, 
  Layers, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  Sliders, 
  Calendar, 
  FileCheck, 
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { Language } from '../../types';

interface InteractiveEvidenceLabProps {
  language: Language;
  onOpenCertificateDemo: () => void;
  onOpenClaimDemo: () => void;
}

export const InteractiveEvidenceLab: React.FC<InteractiveEvidenceLabProps> = ({
  language,
  onOpenCertificateDemo,
  onOpenClaimDemo
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50);
  const [showMouzaGrid, setShowMouzaGrid] = useState<boolean>(true);
  const [activeLayer, setActiveLayer] = useState<'rgb' | 'ndwi'>('rgb');

  return (
    <section className="py-16 bg-white border-b border-[#D9E1DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-10">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#123B32] font-mono">
              {language === 'bn' ? 'নমুনা প্রযুক্তি ডেমো' : 'SAMPLE TECHNOLOGY DEMO'}
            </span>
            <span className="w-8 h-0.5 bg-[#123B32]"></span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-[#123B32] font-serif-title">
            {language === 'bn' 
              ? 'স্যাটেলাইট টাইম-ল্যাপ্স ও ঐতিহাসিক মৌজা নকশার মেলবন্ধন' 
              : 'Satellite Time-Lapse & Historical Mouza Map Overlay'}
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] mt-2">
            {language === 'bn'
              ? 'স্লাইডারটি কেবল নকশা প্রদর্শনের জন্য। ছবিগুলো প্রকৃত উপগ্রহ চিত্র নয়; দাগ, জমির পরিমাণ ও নিমজ্জনের তথ্যও নমুনা।'
              : 'This slider is a design demonstration. The images are not satellite imagery, and the plot, area, and inundation details are sample data.'}
          </p>
          <p role="note" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-950">
            {language === 'bn' ? 'নমুনা মাত্র — এখানে কোনো প্রকৃত ভূমি-যাচাই বা সরকারি সিদ্ধান্ত দেখানো হয় না।' : 'SAMPLE ONLY — no real land verification or government decision is shown here.'}
          </p>
        </div>

        {/* The Interactive Dual-Layer Map Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Visual Container (8 cols) */}
          <div className="lg:col-span-8 bg-[#F5F1E8] rounded-2xl border border-[#D9E1DC] p-4 shadow-md">
            
            {/* Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#D9E1DC] text-xs">
              <div className="flex items-center space-x-2">
                <span className="font-bold text-[#123B32] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#C6A66B]" />
                  <span>Kurigram • Chilmari • Dag #284</span>
                </span>
                <span className="text-[#64748B]">|</span>
                <span className="text-[#64748B] font-mono">25.5682° N, 89.6741° E</span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowMouzaGrid(!showMouzaGrid)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                    showMouzaGrid 
                      ? 'bg-[#123B32] text-white' 
                      : 'bg-white text-[#123B32] border border-[#D9E1DC]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>{language === 'bn' ? 'মৌজা দাগ নকশা' : 'RS Mouza Cadastral'}</span>
                </button>

                <div className="flex bg-white rounded-md border border-[#D9E1DC] p-0.5">
                  <button
                    onClick={() => setActiveLayer('rgb')}
                    className={`px-2.5 py-0.5 text-xs rounded ${
                      activeLayer === 'rgb' ? 'bg-[#D8E8DF] text-[#123B32] font-bold' : 'text-[#64748B]'
                    }`}
                  >
                    Natural RGB
                  </button>
                  <button
                    onClick={() => setActiveLayer('ndwi')}
                    className={`px-2.5 py-0.5 text-xs rounded ${
                      activeLayer === 'ndwi' ? 'bg-[#D8E8DF] text-[#123B32] font-bold' : 'text-[#64748B]'
                    }`}
                  >
                    Water Index (NDWI)
                  </button>
                </div>
              </div>
            </div>

            {/* Slider Viewport */}
            <div className="relative w-full h-[400px] sm:h-[460px] rounded-xl overflow-hidden mt-3 select-none">
              
              {/* After Erosion Image (2024 - Jamuna River water covering everything) */}
              <div className="absolute inset-0">
                <img
                  src="https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80"
                  alt="2024 River Submersion"
                  className={`w-full h-full object-cover filter ${
                    activeLayer === 'ndwi' ? 'hue-rotate-180 contrast-125 saturate-200' : 'contrast-105'
                  }`}
                />
                
                {/* 2024 Badge */}
                <div className="absolute top-4 right-4 bg-[#123B32]/90 text-white backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-xs font-mono shadow-md">
                  <div className="font-bold text-[#8be3c9]">SAMPLE IMAGE • NOT SENTINEL-2</div>
                  <div className="text-[10px] text-white/80">Illustrative river layer</div>
                </div>
              </div>

              {/* Before Erosion Image (2018 - Lush green cultivated homestead) with clipPath based on sliderPos */}
              <div 
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${sliderPos}%` }}
              >
                <div className="absolute inset-0 w-full h-full" style={{ width: '100%', minWidth: '100%' }}>
                  <img
                    src="https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80"
                    alt="2018 Land Homestead"
                    className="w-full h-full object-cover filter brightness-105"
                  />

                  {/* 2018 Badge */}
                  <div className="absolute top-4 left-4 bg-black/70 text-white backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20 text-xs font-mono shadow-md">
                    <div className="font-bold text-[#C6A66B]">SAMPLE IMAGE</div>
                    <div className="text-[10px] text-white/80">Illustrative farmland</div>
                  </div>
                </div>
              </div>

              {/* Scanned RS Mouza Cadastral Overlay Grid (if toggled) */}
              {showMouzaGrid && (
                <div className="absolute inset-0 pointer-events-none">
                  <svg className="w-full h-full" viewBox="0 0 600 450" fill="none">
                    {/* Cadastral Mouza Polygon Plots */}
                    <polygon points="120,80 260,60 290,190 140,210" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" fill="rgba(245, 158, 11, 0.08)" />
                    <text x="180" y="140" fill="#f59e0b" fontSize="14" fontWeight="bold" fontFamily="monospace">Dag #283</text>

                    {/* TARGET PLOT #284 */}
                    <polygon points="260,60 440,40 480,220 290,190" stroke="#ef4444" strokeWidth="2.5" fill="rgba(239, 68, 68, 0.18)" />
                    <text x="340" y="120" fill="#ffffff" fontSize="16" fontWeight="bold" fontFamily="monospace" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))">
                      DAG #284 (0.58 Ac)
                    </text>
                    <text x="340" y="145" fill="#fecaca" fontSize="12" fontWeight="bold" fontFamily="sans-serif" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.8))">
                      [SUBMERGED 100%]
                    </text>

                    <polygon points="140,210 290,190 270,360 110,340" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" fill="rgba(245, 158, 11, 0.08)" />
                    <text x="170" y="270" fill="#f59e0b" fontSize="14" fontWeight="bold" fontFamily="monospace">Dag #285</text>
                  </svg>
                </div>
              )}

              {/* Slider Handle Divider Line */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 flex items-center justify-center"
                style={{ left: `${sliderPos}%` }}
              >
                <div className="w-8 h-8 rounded-full bg-[#123B32] text-white flex items-center justify-center shadow-lg border-2 border-white -ml-3.5">
                  <Sliders className="w-4 h-4 text-[#C6A66B]" />
                </div>
              </div>

              {/* Invisible native range input overlay for silky-smooth touch & drag */}
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                aria-label="Before and after slider"
              />

              {/* Bottom Info Bar inside viewer */}
              <div className="absolute bottom-3 left-3 right-3 bg-[#123B32]/85 text-white backdrop-blur-md px-4 py-2 rounded-lg text-xs flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldAlert className="w-4 h-4 text-amber-300" />
                  <span>{language === 'bn' ? 'নমুনা ভিজ্যুয়াল — কোনো বিশ্লেষণ বা নিমজ্জন নিশ্চিত করা হয়নি' : 'Sample visual — no analysis or inundation confirmed'}</span>
                </span>
                <span className="font-mono text-[#C6A66B] hidden sm:inline">DEMO</span>
              </div>

            </div>

            {/* Slider hint */}
            <div className="text-center text-xs text-[#64748B] mt-2">
              ↔ {language === 'bn' ? 'স্লাইডারটি ডানে-বামে টেনে নদীভাঙন দেখুন' : 'Drag slider left/right to reveal pre-erosion homestead vs current river state'}
            </div>

          </div>

          {/* Right Column: Evidence Docket & Generation Steps (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Box 1: Verified Dossier Card */}
            <div className="bg-[#F5F1E8] rounded-xl border border-[#D9E1DC] p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#123B32] uppercase tracking-wider">
                  {language === 'bn' ? 'নমুনা নথি সারসংক্ষেপ' : 'SAMPLE DOSSIER'}
                </span>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                  SAMPLE ONLY
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-[#1F2933]">
                <div className="flex justify-between py-1 border-b border-[#D9E1DC]">
                  <span className="text-[#64748B]">Claimant:</span>
                  <span className="font-bold">{language === 'bn' ? 'নমুনা দাবিদার' : 'Sample claimant'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#D9E1DC]">
                  <span className="text-[#64748B]">Mouza / JL:</span>
                  <span className="font-medium">Char Natundiar (JL #42)</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#D9E1DC]">
                  <span className="text-[#64748B]">Khatian & Dag:</span>
                  <span className="font-bold text-[#123B32]">RS-1102 / Plot #284</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#D9E1DC]">
                  <span className="text-[#64748B]">Lost Area:</span>
                  <span className="font-bold text-red-600">0.58 Acre (Entirely Submerged)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#64748B]">Witness Attestations:</span>
                  <span className="text-emerald-700 font-bold">14 Community Peers</span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <button
                  onClick={onOpenCertificateDemo}
                  className="w-full bg-[#123B32] hover:bg-[#0c2822] text-white py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-sm"
                >
                  <FileCheck className="w-4 h-4 text-[#C6A66B]" />
                  <span>{language === 'bn' ? 'ভূমিহীন সনদপত্র জেনারেট করুন' : 'Generate Land Loss Certificate'}</span>
                </button>

                <button
                  onClick={onOpenClaimDemo}
                  className="w-full bg-[#D8E8DF] hover:bg-[#c4ded0] text-[#123B32] py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 transition-colors border border-[#a8cfb9]"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>{language === 'bn' ? 'ইউএনও/এসিল্যান্ড খাসজমি আবেদন' : 'Draft UNO / AC Land Claim'}</span>
                </button>
              </div>
            </div>

            {/* Box 2: Citizen Phone Camera Evidence Workflow */}
            <div className="bg-white rounded-xl border border-[#D9E1DC] p-4 text-xs space-y-2">
              <div className="flex items-center space-x-2 text-[#123B32] font-bold">
                <Camera className="w-4 h-4 text-[#C6A66B]" />
                <span>{language === 'bn' ? 'মোবাইল ক্যামেরা ও ভিডিও প্রমাণক' : 'Phone Camera GPS Vault'}</span>
              </div>
              <p className="text-[11px] text-[#64748B] leading-relaxed">
                {language === 'bn'
                  ? 'চরে দাঁড়িয়ে ভাঙনকূলের লাইভ ছবি বা ভিডিও আপলোড করলেই ফোনের জিপিএস ও সেন্সর ডেটা স্বয়ংক্রিয়ভাবে মৌজা দাগে জিওট্যাগ হয়ে যায়।'
                  : 'Citizens snap geotagged photos or 10-sec panoramic videos at the riverbank. Shikor extracts EXIF metadata and locks timestamp into an immutable civic ledger.'}
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
