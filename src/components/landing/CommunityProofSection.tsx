import React from 'react';
import { ArrowRight, Users } from 'lucide-react';
import type { Language, PageView } from '../../types';

interface CommunityProofSectionProps {
  language: Language;
  setCurrentPage: (page: PageView) => void;
}

export const CommunityProofSection: React.FC<CommunityProofSectionProps> = ({ language, setCurrentPage }) => (
  <section className="py-14 bg-[#F5F1E8] border-b border-[#D9E1DC]">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="bg-white rounded-2xl border border-[#D9E1DC] p-6 lg:p-8 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-4">
          <span className="text-xs uppercase font-extrabold tracking-widest text-[#123B32] font-mono">{language === 'bn' ? 'সম্প্রদায়ের প্রমাণ' : 'COMMUNITY CORROBORATION'}</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#123B32] font-serif-title">{language === 'bn' ? 'নদীভাঙন সম্পর্কে প্রত্যক্ষ বা শোনা তথ্য জমা দিন' : 'Share firsthand observations or information heard from others'}</h2>
          <p className="text-sm text-[#64748B] leading-relaxed">{language === 'bn' ? 'একটি বিদ্যমান দাবির ট্র্যাকিং নম্বর দিয়ে তথ্য জমা দিন। আপনার জমা ব্যক্তিগত দাবি-নথি প্রকাশ করবে না এবং নিজে থেকে দাবিটি যাচাই করবে না।' : 'Submit information for an existing claim using its tracking ID. Your submission will not reveal private claim documents or verify the underlying claim.'}</p>
        </div>
        <div className="lg:col-span-6 bg-[#F5F1E8] rounded-xl border border-[#D9E1DC] p-5 space-y-4">
          <p className="text-sm text-[#64748B]">{language === 'bn' ? 'নাম বা ফোন নম্বর চাওয়া হয় না। প্রতি অ্যাকাউন্ট থেকে একটি দাবিতে একবার জমা দেয়া যাবে। অনুমোদিত পর্যালোচক জমাটি দেখবেন।' : 'No name or phone number is requested. One account can submit once per claim. An authorized reviewer assesses each submission.'}</p>
          <button type="button" onClick={() => setCurrentPage('corroboration')} className="w-full py-3 px-4 rounded-lg bg-[#123B32] hover:bg-[#0c2822] text-white text-sm font-bold flex items-center justify-center gap-2">
            <Users className="w-4 h-4 text-[#C6A66B]" />{language === 'bn' ? 'সম্প্রদায়ের তথ্য জমা দিন' : 'Submit community information'}<ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </section>
);
