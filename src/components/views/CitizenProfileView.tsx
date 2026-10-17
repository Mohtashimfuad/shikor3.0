import React from 'react';
import { ArrowRight, Building2, FileText, LogOut, Mail, MapPin, Phone, ShieldCheck, User } from 'lucide-react';
import type { Language, PageView } from '../../types';
import type { AuthProfile } from '../../context/AuthContext';

interface CitizenProfileViewProps {
  language: Language;
  currentUser: AuthProfile | null;
  onLogout: () => void;
  setCurrentPage: (page: PageView) => void;
}

export const CitizenProfileView: React.FC<CitizenProfileViewProps> = ({ language, currentUser, onLogout, setCurrentPage }) => {
  const copy = (bn: string, en: string) => language === 'bn' ? bn : en;
  if (!currentUser) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-16 bg-[#F5F1E8]">
        <div className="bg-white border border-[#D9E1DC] rounded-2xl p-8 max-w-md w-full text-center shadow-md">
          <User className="w-10 h-10 text-[#123B32] mx-auto mb-4" />
          <h2 className="text-xl font-bold text-[#123B32] mb-2">{copy('নাগরিক ড্যাশবোর্ডে প্রবেশ করুন', 'Sign in to your Citizen Dashboard')}</h2>
          <button onClick={() => setCurrentPage('signin')} className="mt-3 px-6 py-2.5 rounded-full bg-[#123B32] text-white text-sm font-semibold">{copy('লগইন', 'Sign in')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-[#F5F1E8] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="bg-gradient-to-r from-[#123B32] via-[#1a4a40] to-[#0e2c26] text-white rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#C6A66B] text-[#123B32] font-black text-2xl flex items-center justify-center border-2 border-white/20">
              {currentUser.displayName.slice(0, 1).toUpperCase() || 'U'}
            </div>
            <div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                <ShieldCheck className="w-3.5 h-3.5" />{copy('নাগরিক অ্যাকাউন্ট', 'Citizen account')}
              </span>
              <h1 className="text-xl sm:text-2xl font-black mt-2">{currentUser.displayName}</h1>
              <p className="text-xs text-white/70 mt-1">{copy('ইমেইল যাচাইকৃত অ্যাকাউন্ট', 'Email-verified account')}</p>
            </div>
          </div>
          <button onClick={onLogout} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-rose-600/80 text-white text-xs font-semibold border border-white/20">
            <LogOut className="w-3.5 h-3.5" />{copy('লগআউট', 'Sign out')}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <section className="bg-white border border-[#D9E1DC] rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-[#123B32] mb-4 flex items-center gap-2"><User className="w-4 h-4 text-[#C6A66B]" />{copy('অ্যাকাউন্ট তথ্য', 'Account information')}</h2>
            <div className="space-y-4 text-xs">
              <div><span className="text-[#64748B] block mb-1">{copy('ইমেইল', 'Email')}</span><p className="flex items-center gap-2 font-medium text-[#1F2933]"><Mail className="w-3.5 h-3.5 text-emerald-700" />{currentUser.email}</p></div>
              <div><span className="text-[#64748B] block mb-1">{copy('মোবাইল নম্বর', 'Phone number')}</span><p className="flex items-center gap-2 font-medium text-[#1F2933]"><Phone className="w-3.5 h-3.5 text-emerald-700" />{currentUser.phoneNumber || copy('যোগ করা হয়নি', 'Not provided')}</p></div>
              <p className="text-[11px] leading-relaxed text-[#64748B]">{copy('আপনার NID এই ড্যাশবোর্ডে প্রদর্শিত হয় না। Shikor সরকারি NID যাচাইকরণ দাবি করে না।', 'Your NID is not displayed on this dashboard. Shikor does not claim government NID verification.')}</p>
            </div>
          </section>

          <section className="lg:col-span-2 bg-white border border-[#D9E1DC] rounded-2xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-[#123B32] mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-[#C6A66B]" />{copy('সেবা ও আবেদন', 'Services and applications')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => setCurrentPage('officer-register')} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-[#D9E1DC] hover:border-[#123B32] hover:bg-[#F5F1E8] text-left">
                <span><strong className="block text-xs text-[#123B32]">{copy('Officer নিবন্ধন', 'Officer Registration')}</strong><span className="block text-[11px] text-[#64748B] mt-1">{copy('সরকারি কর্মকর্তা হিসেবে আবেদন জমা দিন', 'Submit an application as a government officer')}</span></span><ArrowRight className="w-4 h-4 text-[#C6A66B] shrink-0" />
              </button>
              <button onClick={() => setCurrentPage('officer-status')} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-[#D9E1DC] hover:border-[#123B32] hover:bg-[#F5F1E8] text-left">
                <span><strong className="block text-xs text-[#123B32]">{copy('Officer আবেদনের অবস্থা', 'Officer application status')}</strong><span className="block text-[11px] text-[#64748B] mt-1">{copy('নিজের আবেদনের সিদ্ধান্ত দেখুন', 'Check the decision on your application')}</span></span><ArrowRight className="w-4 h-4 text-[#C6A66B] shrink-0" />
              </button>
              <button onClick={() => setCurrentPage('evidence')} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-[#D9E1DC] hover:border-[#123B32] hover:bg-[#F5F1E8] text-left">
                <span><strong className="block text-xs text-[#123B32]">{copy('Land Records', 'Land Records')}</strong><span className="block text-[11px] text-[#64748B] mt-1">{copy('নমুনা রেকর্ড ও তথ্য দেখুন', 'Browse the existing records view')}</span></span><FileText className="w-4 h-4 text-[#C6A66B] shrink-0" />
              </button>
              <button onClick={() => setCurrentPage('claims')} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-[#D9E1DC] hover:border-[#123B32] hover:bg-[#F5F1E8] text-left">
                <span><strong className="block text-xs text-[#123B32]">{copy('ভাঙন দাবি ও অগ্রগতি', 'Erosion claims and tracking')}</strong><span className="block text-[11px] text-[#64748B] mt-1">{copy('নিজের দাবি জমা দিন ও অবস্থা দেখুন', 'Submit a claim and track its status')}</span></span><MapPin className="w-4 h-4 text-[#C6A66B] shrink-0" />
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
