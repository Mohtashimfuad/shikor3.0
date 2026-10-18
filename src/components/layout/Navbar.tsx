import React, { useState } from 'react';
import { Scale, Menu, X, Globe, LogOut } from 'lucide-react';
import { PageView, Language } from '../../types';
import type { AuthProfile } from '../../context/AuthContext';

interface NavbarProps {
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currentUser?: AuthProfile | null;
  onLogout?: () => void;
  onOpenSearch?: () => void;
  onOpenBackendSetup?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  setCurrentPage,
  language,
  setLanguage,
  currentUser,
  onLogout,
  onOpenSearch,
  onOpenBackendSetup
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const accountPage: PageView = currentUser?.role === 'admin'
    ? 'admin-dashboard'
    : currentUser?.role === 'officer'
      ? 'officer-dashboard'
      : 'profile';

  const navItems: { id: PageView; labelEn: string; labelBn: string }[] = [
    { id: 'home', labelEn: 'Home', labelBn: 'মূলপাতা' },
    { id: 'evidence', labelEn: 'Land Records', labelBn: 'জমি রেকর্ড' },
    { id: 'satellite', labelEn: 'Services', labelBn: 'সেবাসমূহ' },
    { id: 'about', labelEn: 'About', labelBn: 'আমাদের সম্পর্কে' },
    { id: 'claims', labelEn: 'My Claims', labelBn: 'আমার দাবি' },
    { id: 'corroboration', labelEn: 'Community evidence', labelBn: 'সামাজিক প্রমাণ' }
  ];
  const visibleNavItems = navItems.filter((item) => item.id !== 'claims' || !currentUser || currentUser.role === 'citizen');

  return (
    <header className="sticky top-0 z-50 bg-[#123B32] text-white border-b border-[#1b4e43] shadow-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 xl:px-6">
        <div className="flex items-center justify-between gap-3 h-20">
          
          {/* Logo & Tagline */}
          <div 
            onClick={() => { setCurrentPage('home'); setMobileMenuOpen(false); }}
            className="flex min-w-0 shrink-0 items-center gap-3 cursor-pointer group xl:w-[205px]"
          >
            <div className="w-11 h-11 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white group-hover:bg-[#C6A66B] group-hover:text-[#123B32] transition-colors duration-200">
              <Scale className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-bold tracking-tight text-white font-serif-title">Shikor</span>
                <span className="hidden 2xl:inline-block rounded border border-[#C6A66B]/30 bg-[#C6A66B]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#C6A66B]">
                  LandTech
                </span>
              </div>
              <p className="truncate text-[10px] text-[#D8E8DF]/80 font-normal tracking-wide sm:text-[11px]">
                {language === 'bn' ? 'নদীভাঙন প্রমাণ ও ন্যায্য পুনর্বাসন' : 'Land Records for a Fairer Tomorrow'}
              </p>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav aria-label={language === 'bn' ? 'প্রধান নেভিগেশন' : 'Main navigation'} className="hidden min-w-0 flex-1 items-center justify-center gap-4 xl:flex 2xl:gap-5">
            {visibleNavItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`relative whitespace-nowrap py-2 text-xs font-medium transition-colors 2xl:text-sm ${
                    isActive 
                      ? 'text-[#C6A66B] font-semibold' 
                      : 'text-[#D8E8DF] hover:text-white'
                  }`}
                >
                  {language === 'bn' ? item.labelBn : item.labelEn}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C6A66B] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Items */}
          <div className="hidden shrink-0 items-center gap-2 xl:flex">
            
            {/* Supabase Backend Setup Hub Button */}
            <button
              onClick={onOpenBackendSetup}
              className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2.5 text-xs font-bold text-emerald-300 shadow-sm transition-colors hover:bg-emerald-500/30"
              title="Connect Supabase Backend"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>⚡ Supabase</span>
            </button>

            {/* Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              className="flex h-9 items-center gap-1 rounded-lg border border-white/20 px-2.5 text-xs font-semibold text-[#D8E8DF] transition-colors hover:border-white/40 hover:text-white"
              title={language === 'bn' ? 'ইংরেজি ভাষা নির্বাচন করুন' : 'Switch to Bangla'}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'BN' : 'EN'}</span>
            </button>

            {/* User Session Profile OR Login / Sign Up */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                {currentUser.role === 'citizen' && (
                  <button
                    onClick={() => setCurrentPage('officer-register')}
                    className="h-9 whitespace-nowrap rounded-full border border-white/25 px-2.5 text-xs font-semibold text-[#D8E8DF] transition-colors hover:bg-white/10 2xl:px-3"
                  >
                    {language === 'bn' ? 'অফিসার আবেদন' : 'Officer Registration'}
                  </button>
                )}
                {/* Profile Pill Button */}
                <button
                  onClick={() => setCurrentPage(accountPage)}
                  className={`flex h-9 items-center gap-2 rounded-full border py-1 pl-1.5 pr-2.5 shadow-sm transition-all duration-200 2xl:pr-3 ${
                    currentPage === accountPage
                      ? 'bg-white text-[#123B32] border-white ring-2 ring-[#C6A66B]'
                      : 'bg-[#1b4e43] border-[#C6A66B]/50 hover:border-[#C6A66B] text-white hover:bg-[#235e52]'
                  }`}
                  title={language === 'bn' ? 'আমার প্রোফাইল দেখুন' : 'View Citizen Profile'}
                >
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    currentPage === accountPage ? 'bg-[#123B32] text-white' : 'bg-[#C6A66B] text-[#123B32]'
                  }`}>
                    {currentUser.role !== 'citizen' ? '🏛️' : (currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U')}
                  </div>
                  <div className="text-left">
                    <span className="block max-w-[92px] truncate text-xs font-bold leading-tight 2xl:max-w-[110px]">
                      {currentUser.displayName.split(' ')[0]}
                    </span>
                    <span className="block text-[9px] uppercase tracking-wider text-[#C6A66B] font-semibold">
                      {currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'officer' ? 'Officer' : 'Citizen'}
                    </span>
                  </div>
                </button>

                {/* Sign Out Button */}
                <button
                  onClick={onLogout}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-[#D8E8DF] transition-colors hover:border-rose-400/30 hover:bg-rose-500/20 hover:text-rose-300"
                  title={language === 'bn' ? 'লগআউট' : 'Sign Out'}
                  aria-label="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                {/* Login Button (Outline Pill) */}
                <button
                  onClick={() => setCurrentPage('signin')}
                  className={`h-9 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-all duration-200 ${
                    currentPage === 'signin'
                      ? 'bg-white text-[#123B32] border-white'
                      : 'border-white/70 text-white hover:bg-white/10'
                  }`}
                >
                  {language === 'bn' ? 'লগইন' : 'Login'}
                </button>

                {/* Sign Up Button (Accent Gold) */}
                <button
                  onClick={() => setCurrentPage('signup')}
                  className={`h-9 whitespace-nowrap rounded-full px-3 text-xs font-bold shadow-sm transition-all duration-200 ${
                    currentPage === 'signup'
                      ? 'bg-white text-[#123B32]'
                      : 'bg-[#C6A66B] hover:bg-[#b5955a] text-[#123B32]'
                  }`}
                >
                  {language === 'bn' ? 'নিবন্ধন' : 'Sign Up'}
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex shrink-0 items-center gap-2 xl:hidden">
            <button
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              className="h-9 min-w-12 rounded-lg border border-white/20 px-2 text-xs font-semibold text-[#D8E8DF]"
            >
              {language === 'en' ? 'বাং' : 'EN'}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white transition-colors hover:bg-white/10"
              aria-label={language === 'bn' ? 'মেনু খুলুন বা বন্ধ করুন' : 'Toggle menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#0d2a24] border-t border-[#1b4e43] px-4 pt-3 pb-6 space-y-3">
          <div className="grid grid-cols-2 gap-2 border-b border-[#1b4e43] pb-3">
            <button onClick={() => { onOpenBackendSetup?.(); setMobileMenuOpen(false); }} className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/20 px-2 text-xs font-bold text-emerald-300" title={language === 'bn' ? 'Supabase সংযোগ সেটিংস খুলুন' : 'Open Supabase connection settings'}>
              <span aria-hidden="true">⚡</span><span>Supabase</span>
            </button>
            <button onClick={() => { onOpenSearch?.(); setMobileMenuOpen(false); }} className="flex h-9 items-center justify-center rounded-full border border-white/20 px-2 text-xs font-semibold text-[#D8E8DF]" aria-label={language === 'bn' ? 'খুঁজুন' : 'Search'}>
              {language === 'bn' ? 'খুঁজুন' : 'Search'}
            </button>
          </div>
          <nav aria-label={language === 'bn' ? 'প্রধান নেভিগেশন' : 'Main navigation'} className="space-y-1">
            {visibleNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentPage(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                  currentPage === item.id
                    ? 'bg-[#1b4e43] text-[#C6A66B] font-semibold'
                    : 'text-[#D8E8DF] hover:bg-white/5'
                }`}
              >
                {language === 'bn' ? item.labelBn : item.labelEn}
              </button>
            ))}
          </nav>

          <div className="pt-3 border-t border-[#1b4e43]">
            {currentUser ? (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-[#1b4e43] border border-[#C6A66B]/30 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-[#C6A66B] text-[#123B32] font-bold flex items-center justify-center text-sm">
                      {currentUser.displayName ? currentUser.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">
                        {currentUser.displayName}
                      </p>
                      <p className="text-[10px] text-[#C6A66B]">
                        {currentUser.role === 'admin' ? 'Administrator' : currentUser.role === 'officer' ? 'Approved Officer' : 'Citizen'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setCurrentPage(accountPage);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2 text-xs font-bold text-center rounded-lg bg-white text-[#123B32]"
                  >
                    {language === 'bn' ? 'আমার প্রোফাইল' : 'My Profile'}
                  </button>
                  <button
                    onClick={() => {
                      if (onLogout) onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2 text-xs font-medium text-center rounded-lg border border-rose-400/50 text-rose-300 hover:bg-rose-500/20"
                  >
                    {language === 'bn' ? 'লগআউট' : 'Sign Out'}
                  </button>
                </div>
                {currentUser.role === 'citizen' && (
                  <button
                    onClick={() => {
                      setCurrentPage('officer-register');
                      setMobileMenuOpen(false);
                    }}
                    className="w-full py-2 text-xs font-semibold text-center rounded-lg border border-[#C6A66B]/50 text-[#C6A66B]"
                  >
                    {language === 'bn' ? 'অফিসার নিবন্ধন' : 'Officer Registration'}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setCurrentPage('signin');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 text-xs font-medium text-center rounded-full border border-white/60 text-white hover:bg-white/10"
                >
                  {language === 'bn' ? 'লগইন' : 'Login'}
                </button>
                <button
                  onClick={() => {
                    setCurrentPage('signup');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 text-xs font-bold text-center rounded-full bg-[#C6A66B] text-[#123B32]"
                >
                  {language === 'bn' ? 'নিবন্ধন' : 'Sign Up'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
