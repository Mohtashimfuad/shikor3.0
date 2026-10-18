import React from 'react';
import { 
  FileCheck2, 
  Search, 
  Satellite, 
  ShieldCheck, 
  Users, 
  ArrowRight,
  Camera,
  ScrollText,
  Building2
} from 'lucide-react';
import { Language, PageView } from '../../types';

interface FeatureCardsProps {
  language: Language;
  setCurrentPage: (page: PageView) => void;
  onOpenCertificateDemo: () => void;
  onOpenClaimDemo: () => void;
}

export const FeatureCards: React.FC<FeatureCardsProps> = ({
  language,
  setCurrentPage,
  onOpenCertificateDemo,
  onOpenClaimDemo
}) => {
  const cards = [
    {
      id: 'verify-docs',
      icon: FileCheck2,
      titleEn: 'Verify Land Documents',
      titleBn: 'ভূমি রেকর্ড ও দলিল যাচাই',
      descEn: 'Check CS, RS, and BS record details and historical ownership pedigree.',
      descBn: 'সিএস, আরএস ও বিএস রেকর্ডের তথ্য ও বংশানুক্রমিক মালিকানা হিস্ট্রি মিলিয়ে দেখুন।',
      action: () => setCurrentPage('evidence')
    },
    {
      id: 'detect-inconsistency',
      icon: Search,
      titleEn: 'Detect Inconsistencies',
      titleBn: 'অসঙ্গতি ও ভাঙন শনাক্তকরণ',
      descEn: 'Detect river course shifts, submerged plots, and overlapping land claims.',
      descBn: 'নদী ভাঙনে বিলীন হওয়া দাগ ও নথিপত্রের অমিল মুহূর্তেই শনাক্ত করুন।',
      action: () => setCurrentPage('satellite')
    },
    {
      id: 'satellite-mouza',
      icon: Satellite,
      titleEn: 'Satellite & Mouza Overlay',
      titleBn: 'স্যাটেলাইট ও মৌজা ম্যাপ তুলক',
      descEn: 'Overlay free Sentinel-2 multispectral imagery with scanned mouza maps.',
      descBn: 'ইউরোপিয়ান স্পেস এজেন্সির সেন্টিনেল স্যাটেলাইটের সাথে মৌজা নকশা ওভারলে।',
      action: () => setCurrentPage('satellite')
    },
    {
      id: 'ensure-transparency',
      icon: ShieldCheck,
      titleEn: 'Land Loss Certificate',
      titleBn: 'ভূমিহীন নদীভাঙন সনদপত্র',
      descEn: 'Generate cryptographic certificates proving past possession and submersion.',
      descBn: 'পূর্বতন দখল ও নদীগর্ভে বিলীন হওয়ার কিউআর কোডযুক্ত সরকারি সনদ জেনারেট।',
      action: onOpenCertificateDemo
    },
    {
      id: 'for-citizens-officials',
      icon: Users,
      titleEn: 'For Citizens & Officials',
      titleBn: 'নাগরিক ও এসিল্যান্ডের সংযোগ',
      descEn: 'Prepare an editable application draft from your existing citizen claim. Shikor does not submit it to an office.',
      descBn: 'বিদ্যমান নাগরিক দাবি থেকে সম্পাদনাযোগ্য আবেদন খসড়া তৈরি করুন। Shikor এটি কোনো দপ্তরে পাঠায় না।',
      action: onOpenClaimDemo
    }
  ];

  return (
    <section className="py-12 bg-[#F5F1E8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Responsive Grid of 5 Cards directly matching the reference photo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={card.action}
                className="bg-white rounded-xl p-6 border border-[#D9E1DC] shadow-sm hover:shadow-md hover:border-[#123B32]/40 transition-all duration-200 flex flex-col justify-between cursor-pointer group hover:-translate-y-1"
              >
                <div>
                  {/* Icon with soft circular sage-green background */}
                  <div className="w-12 h-12 rounded-full bg-[#D8E8DF] flex items-center justify-center text-[#123B32] mb-5 group-hover:bg-[#123B32] group-hover:text-white transition-colors duration-200">
                    <Icon className="w-6 h-6 stroke-[1.8]" />
                  </div>

                  {/* Card Title */}
                  <h3 className="text-base font-bold text-[#123B32] mb-2 leading-snug group-hover:text-[#123B32]">
                    {language === 'bn' ? card.titleBn : card.titleEn}
                  </h3>

                  {/* Card Description */}
                  <p className="text-xs text-[#64748B] leading-relaxed">
                    {language === 'bn' ? card.descBn : card.descEn}
                  </p>
                </div>

                {/* Arrow Link at bottom matching picture */}
                <div className="pt-6 flex items-center text-[#123B32] font-semibold text-xs group-hover:translate-x-1 transition-transform">
                  <ArrowRight className="w-4 h-4 text-[#123B32]" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
