import React from 'react';
import { Language, PageView } from '../../types';
import { SatelliteDateComparison } from '../map/SatelliteDateComparison';

interface SatelliteServicesViewProps {
  language: Language;
  onOpenCertificateDemo: () => void;
  onOpenClaimDemo: () => void;
  setCurrentPage: (page: PageView) => void;
}

export const SatelliteServicesView: React.FC<SatelliteServicesViewProps> = ({
  language,
  onOpenCertificateDemo,
  onOpenClaimDemo,
  setCurrentPage
}) => {
  const services = [
    {
      title: 'Historical satellite image comparison (NASA MODIS)',
      banglaTitle: 'ঐতিহাসিক উপগ্রহ চিত্র তুলনা (NASA MODIS)',
      desc: 'Available below for the Chilmari study area. This daily true-color browse imagery is regional context only; it does not calculate parcel loss or verify a claim.',
      badge: 'Available · browse imagery'
    },
    {
      title: 'CS, RS & BS Scanned Mouza Georeferencer',
      banglaTitle: 'সিএস, আরএস ও বিএস মৌজা নকশার জিওরেফারেন্সিং',
      desc: 'No scanned cadastral map georeferencing workflow or sub-meter boundary dataset is connected in this project yet.',
      badge: 'Not implemented'
    },
    {
      title: 'Verifiable Land Loss Certificate (নদীভাঙন সনদ)',
      banglaTitle: 'যাচাইযোগ্য ডিজিটাল নদীভাঙন সনদপত্র',
      desc: 'Shikor can prepare a printable user-provided evidence report. It is not an official certificate, legal determination, or government submission.',
      badge: 'Civic report · not official'
    },
    {
      title: 'Automated 1-No. Khas Land Resettlement Petition Draft',
      banglaTitle: '১-নং খাস জমি বন্দোবস্ত ও পুনর্বাসন স্বয়ংক্রিয় আবেদন',
      desc: 'No government land-service integration or legally reviewed petition automation is connected. Available claim information remains a user submission.',
      badge: 'No government integration'
    }
  ];

  return (
    <div className="py-12 bg-[#F5F1E8] min-h-[85vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Section Heading */}
        <div className="max-w-3xl">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#123B32] font-mono">
              {language === 'bn' ? 'প্রযুক্তিগত সেবাসমূহ' : 'CORE SATELLITE & CIVIC SERVICES'}
            </span>
            <span className="w-8 h-0.5 bg-[#123B32]"></span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-[#123B32] font-serif-title">
            {language === 'bn' 
              ? 'নদীভাঙন ক্ষতিগ্রস্তদের জন্য উন্মুক্ত ভূ-উপাত্ত সেবা' 
              : 'Citizen-Powered Spatial Evidence & Resettlement Services'}
          </h1>
          <p className="text-sm sm:text-base text-[#64748B] mt-2 leading-relaxed">
            {language === 'bn'
              ? 'চিলমারীর জন্য উন্মুক্ত NASA দৈনিক চিত্র তুলনা এবং শিকড়ের নাগরিক নথির বর্তমান সীমা।'
              : 'Explore an open NASA daily-image comparison for Chilmari and the current limits of Shikor’s citizen evidence records.'}
          </p>
        </div>

        <SatelliteDateComparison language={language} />

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {services.map((svc, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-[#D9E1DC] p-6 shadow-sm hover:shadow-md transition-shadow space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-[#D8E8DF] text-[#123B32] border border-[#b8d6c4]">
                  {svc.badge}
                </span>
                <span className="text-xs font-mono text-[#64748B]">0{idx + 1}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#123B32] font-serif-title leading-snug">
                  {svc.title}
                </h3>
                <p className="text-xs font-semibold text-[#123B32]/80 mt-0.5">
                  {svc.banglaTitle}
                </p>
              </div>
              <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
                {svc.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Call to Actions Bar */}
        <div className="bg-[#123B32] text-white rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-1 max-w-xl">
            <h3 className="text-xl font-bold font-serif-title text-[#C6A66B]">
              {language === 'bn' ? 'আপনার জমি নদীগর্ভে বিলীন হয়েছে?' : 'Has Your Land Been Lost to Riverbank Erosion?'}
            </h3>
            <p className="text-xs text-[#D8E8DF]">
              {language === 'bn'
              ? 'আপনার দেওয়া তথ্যসহ নাগরিক প্রমাণ প্রতিবেদন তৈরি করুন; এটি সরকারি সনদ বা আবেদন নয়।'
              : 'Prepare a civic evidence report from information you provide; it is not a government certificate or filing.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenCertificateDemo}
              className="bg-[#C6A66B] hover:bg-[#b89759] text-[#123B32] px-5 py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
            >
              {language === 'bn' ? 'নমুনা প্রতিবেদন খুলুন' : 'Open Sample Report'}
            </button>
            <button
              onClick={onOpenClaimDemo}
              className="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-lg text-xs font-semibold border border-white/30 transition-colors"
            >
              {language === 'bn' ? 'নাগরিক দাবিতে যান' : 'Open citizen claims'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
