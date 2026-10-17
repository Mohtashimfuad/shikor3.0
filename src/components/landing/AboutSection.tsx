import React from 'react';
import { 
  FileText, 
  Users, 
  CheckCircle, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Building2,
  TreePine,
  Home
} from 'lucide-react';
import { Language, PageView } from '../../types';

interface AboutSectionProps {
  language: Language;
  setCurrentPage: (page: PageView) => void;
  onOpenCertificateDemo: () => void;
}

export const AboutSection: React.FC<AboutSectionProps> = ({
  language,
  setCurrentPage,
  onOpenCertificateDemo
}) => {
  return (
    <section className="py-14 bg-[#F5F1E8] border-t border-[#D9E1DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Card with rounded border matching screenshot */}
        <div className="bg-white rounded-2xl border border-[#D9E1DC] p-6 lg:p-10 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* Left: Isometric Graphic Illustration (3 cols) */}
            <div className="lg:col-span-3 flex justify-center">
              <div className="relative w-64 h-56 bg-[#F5F1E8] rounded-xl border border-[#D8E8DF] flex items-center justify-center p-4 overflow-hidden shadow-inner">
                
                {/* SVG Isometric Graphic: Farm plot, house, legal document & verified check */}
                <svg className="w-48 h-48" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Isometric Green Ground / Mouza Plot */}
                  <polygon points="100,25 180,70 100,115 20,70" fill="#D8E8DF" stroke="#123B32" strokeWidth="2" />
                  <polygon points="20,70 100,115 100,140 20,95" fill="#a4c9b5" stroke="#123B32" strokeWidth="2" />
                  <polygon points="100,115 180,70 180,95 100,140" fill="#7ba890" stroke="#123B32" strokeWidth="2" />

                  {/* Parcel lines on ground */}
                  <line x1="60" y1="48" x2="140" y2="92" stroke="#123B32" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="60" y1="92" x2="140" y2="48" stroke="#123B32" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Little char homestead / house */}
                  <polygon points="45,62 65,50 85,62 65,74" fill="#C6A66B" stroke="#123B32" strokeWidth="1.5" />
                  <polygon points="45,62 65,74 65,90 45,78" fill="#a58548" stroke="#123B32" strokeWidth="1.5" />
                  <polygon points="85,62 65,74 65,90 85,78" fill="#886b33" stroke="#123B32" strokeWidth="1.5" />

                  {/* Tiny Trees */}
                  <circle cx="130" cy="65" r="9" fill="#123B32" />
                  <circle cx="145" cy="72" r="7" fill="#1b4e43" />

                  {/* Document with lines */}
                  <g transform="translate(100, 45)">
                    <rect x="0" y="0" width="60" height="75" rx="4" fill="white" stroke="#123B32" strokeWidth="2" filter="drop-shadow(0 4px 6px rgba(0,0,0,0.1))" />
                    <line x1="8" y1="15" x2="40" y2="15" stroke="#C6A66B" strokeWidth="3" strokeLinecap="round" />
                    <line x1="8" y1="28" x2="52" y2="28" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
                    <line x1="8" y1="38" x2="48" y2="38" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
                    <line x1="8" y1="48" x2="35" y2="48" stroke="#64748B" strokeWidth="2" strokeLinecap="round" />
                  </g>

                  {/* Shield Check Badge */}
                  <g transform="translate(130, 95)">
                    <circle cx="16" cy="16" r="16" fill="#123B32" stroke="white" strokeWidth="2" />
                    <path d="M10 16 L14 20 L22 11" stroke="#C6A66B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                </svg>

                <div className="absolute bottom-2 left-2 text-[10px] text-[#64748B] font-mono">
                  Georef Mouza • Sentinel-2
                </div>
              </div>
            </div>

            {/* Center: Story & Learn More Button (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-extrabold tracking-widest text-[#123B32] font-mono">
                  {language === 'bn' ? 'শিকড় সম্পর্কে' : 'ABOUT SHIKOR'}
                </span>
                <span className="w-8 h-0.5 bg-[#123B32]"></span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-[#123B32] font-serif-title leading-tight">
                {language === 'bn'
                  ? 'স্বচ্ছ ভূমি শাসন ও নদীভাঙন সুরক্ষায় আধুনিক প্রযুক্তি'
                  : 'Technology for Transparent Land Governance'}
              </h2>

              <p className="text-sm text-[#64748B] leading-relaxed">
                {language === 'bn'
                  ? 'বাংলাদেশে প্রতি বছর হাজার হাজার হেক্টর জমি নদী ও সাগরে বিলীন হয়। মৌজা নকশার সীমানা নদীগর্ভে তলিয়ে যাওয়ায় ভূমিমালিকরা প্রমাণপত্র হারিয়ে খাস জমি বা পুনর্বাসন পান না। শিকড় (Shikor) স্যাটেলাইট বিশ্লেষণ ও স্থানীয় সাক্ষ্যের সমন্বয়ে তৈরি করে আইনসম্মত প্রমাণক, যা ভূমিহীনদের অধিকার নিশ্চিত করে।'
                  : 'Shikor is a modern land record analysis platform designed to bring transparency, reduce fraud, and make land information accessible to everyone in Bangladesh. For river erosion victims, it bridges the gap between submerged physical boundaries and official AC Land records.'}
              </p>

              <div className="pt-2">
                <button
                  onClick={() => setCurrentPage('about')}
                  className="bg-[#123B32] hover:bg-[#0c2822] text-white px-6 py-2.5 rounded-full text-xs font-semibold inline-flex items-center space-x-2 transition-colors duration-150 shadow-sm"
                >
                  <span>{language === 'bn' ? 'বিস্তারিত জানুন' : 'Learn More'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right: 4 Metrics Matching Screenshot (4 cols) */}
            <div className="lg:col-span-4 grid grid-cols-2 gap-4 border-t lg:border-t-0 lg:border-l border-[#D9E1DC] pt-6 lg:pt-0 lg:pl-8">
              
              {/* Stat 1: 1M+ */}
              <div className="space-y-1">
                <div className="w-8 h-8 rounded-lg bg-[#D8E8DF] flex items-center justify-center text-[#123B32] mb-2">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold text-[#123B32] font-serif-title">1M+</div>
                <div className="text-xs font-medium text-[#1F2933]">Land Records</div>
                <div className="text-[11px] text-[#64748B]">(Planned / Char Belt)</div>
              </div>

              {/* Stat 2: 100K+ */}
              <div className="space-y-1">
                <div className="w-8 h-8 rounded-lg bg-[#D8E8DF] flex items-center justify-center text-[#123B32] mb-2">
                  <Users className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold text-[#123B32] font-serif-title">100K+</div>
                <div className="text-xs font-medium text-[#1F2933]">Active Users</div>
                <div className="text-[11px] text-[#64748B]">(Planned)</div>
              </div>

              {/* Stat 3: 99% */}
              <div className="space-y-1">
                <div className="w-8 h-8 rounded-lg bg-[#D8E8DF] flex items-center justify-center text-[#123B32] mb-2">
                  <CheckCircle className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold text-[#123B32] font-serif-title">—</div>
                <div className="text-xs font-medium text-[#1F2933]">{language === 'bn' ? 'যাচাইকৃত নির্ভুলতার হার' : 'Verified accuracy rate'}</div>
                <div className="text-[11px] text-[#64748B]">{language === 'bn' ? '(প্রকৃত বিশ্লেষণ যুক্ত নয়)' : '(No analysis connected)'}</div>
              </div>

              {/* Stat 4: 99.9% */}
              <div className="space-y-1">
                <div className="w-8 h-8 rounded-lg bg-[#D8E8DF] flex items-center justify-center text-[#123B32] mb-2">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="text-2xl font-bold text-[#123B32] font-serif-title">—</div>
                <div className="text-xs font-medium text-[#1F2933]">{language === 'bn' ? 'পরিষেবা সচলতার হার' : 'Service uptime'}</div>
                <div className="text-[11px] text-[#64748B]">{language === 'bn' ? '(এখনো পরিমাপ করা হয়নি)' : '(Not measured yet)'}</div>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
