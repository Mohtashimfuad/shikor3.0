/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useRef, useState } from 'react';
import { PageView, Language, LandLossRecord } from './types';
import { SAMPLE_LOSS_RECORDS } from './data/mockData';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { HeroSection } from './components/landing/HeroSection';
import { FeatureCards } from './components/landing/FeatureCards';
import { InteractiveEvidenceLab } from './components/landing/InteractiveEvidenceLab';
import { InteractiveErosionMap } from './components/map/InteractiveErosionMap';
import { CommunityProofSection } from './components/landing/CommunityProofSection';
import { AboutSection } from './components/landing/AboutSection';
import { SignInPage } from './components/auth/SignInPage';
import { SignUpPage } from './components/auth/SignUpPage';
import { LandRecordsView } from './components/views/LandRecordsView';
import { SatelliteServicesView } from './components/views/SatelliteServicesView';
import { AboutRoadmapView } from './components/views/AboutRoadmapView';
import { CitizenProfileView } from './components/views/CitizenProfileView';
import { CertificateModal } from './components/certificate/CertificateModal';
import { BackendSetupModal } from './components/backend/BackendSetupModal';
import { OfficerRegistrationView } from './components/officer/OfficerRegistrationView';
import { OfficerStatusView } from './components/officer/OfficerStatusView';
import { OfficerDashboardView } from './components/officer/OfficerDashboardView';
import { AdminOfficerApplicationsView } from './components/admin/AdminOfficerApplicationsView';
import { AccountActivationView } from './components/auth/AccountActivationView';
import { CitizenClaimsView } from './components/claim/CitizenClaimsView';
import { CommunityCorroborationView } from './components/community/CommunityCorroborationView';

const SUPPORTED_PAGES: PageView[] = ['home', 'signin', 'signup', 'evidence', 'satellite', 'claims', 'corroboration', 'about', 'profile', 'officer-register', 'officer-status', 'officer-dashboard', 'admin-dashboard', 'account-activation'];

function getPageFromUrl(): PageView {
  const requestedPage = new URLSearchParams(window.location.search).get('page');
  return SUPPORTED_PAGES.includes(requestedPage as PageView) ? requestedPage as PageView : 'home';
}

// ---------------------------------------------------------------------------
// Inner app — reads auth from context (must be inside AuthProvider)
// ---------------------------------------------------------------------------
function AppInner() {
  const { profile, loading, signOut } = useAuth();

  const [currentPage, setCurrentPageState] = useState<PageView>(getPageFromUrl);
  const currentPageRef = useRef(currentPage);
  const setCurrentPage = useCallback((pageOrUpdater: React.SetStateAction<PageView>) => {
    const target = typeof pageOrUpdater === 'function' ? pageOrUpdater(currentPageRef.current) : pageOrUpdater;
    if (target === currentPageRef.current) return;

    window.history.pushState({ page: target }, '', `/?page=${target}`);
    currentPageRef.current = target;
    setCurrentPageState(target);
  }, []);
  const redirectTo = useCallback((target: PageView) => {
    window.history.replaceState({ page: target }, '', `/?page=${target}`);
    currentPageRef.current = target;
    setCurrentPageState(target);
  }, []);
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const savedLanguage = localStorage.getItem('shikor_language');
      return savedLanguage === 'en' || savedLanguage === 'bn' ? savedLanguage : 'bn';
    } catch {
      return 'bn';
    }
  });

  // Modal states
  const [isCertificateOpen, setIsCertificateOpen] = useState(false);
  const [isBackendSetupOpen, setIsBackendSetupOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<LandLossRecord>(SAMPLE_LOSS_RECORDS[0]);

  // Scroll to top on page change
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentPage]);

  React.useEffect(() => {
    const handlePopState = () => {
      const page = getPageFromUrl();
      currentPageRef.current = page;
      setCurrentPageState(page);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  React.useEffect(() => {
    try {
      localStorage.setItem('shikor_language', language);
    } catch {
      // Language remains available in memory if browser storage is disabled.
    }
  }, [language]);

  // Route guard: redirect to sign-in for protected pages when not logged in
  React.useEffect(() => {
    const protectedPages: PageView[] = ['profile', 'claims', 'corroboration', 'officer-status', 'officer-dashboard', 'admin-dashboard'];
    if (!loading && !profile && protectedPages.includes(currentPage)) {
      redirectTo('signin');
    }
    if (loading || !profile) return;
    if (currentPage === 'profile' && profile.role !== 'citizen') {
      redirectTo(profile.role === 'officer' ? 'officer-dashboard' : 'admin-dashboard');
    }
    if (currentPage === 'claims' && profile.role !== 'citizen') {
      redirectTo(profile.role === 'officer' ? 'officer-dashboard' : 'admin-dashboard');
    }
    if (currentPage === 'officer-dashboard' && profile.role !== 'officer') {
      redirectTo(profile.role === 'citizen' ? 'officer-status' : 'home');
    }
    if (currentPage === 'admin-dashboard' && profile.role !== 'admin') redirectTo('home');
    if (currentPage === 'officer-register' && profile.role !== 'citizen') {
      redirectTo(profile.role === 'officer' ? 'officer-dashboard' : 'admin-dashboard');
    }
  }, [profile, loading, currentPage, redirectTo]);

  const handleLogout = async () => {
    await signOut();
    setCurrentPage('home');
  };

  const handleOpenCertificate = (record?: LandLossRecord) => {
    setSelectedRecord(record ?? SAMPLE_LOSS_RECORDS[0]);
    setIsCertificateOpen(true);
  };

  const handleOpenClaimAssistant = () => setCurrentPage(profile?.role === 'citizen' ? 'claims' : 'signin');

  const handleSearch = (_query: string) => {
    setCurrentPage('evidence');
  };

  // Show nothing while the initial session check is in progress
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8]">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 border-4 border-[#123B32] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#64748B] font-medium">Loading session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F1E8] text-[#1F2933]">

      {/* Universal Top Navigation Header */}
      <Navbar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        language={language}
        setLanguage={setLanguage}
        currentUser={profile}
        onLogout={handleLogout}
        onOpenSearch={() => setCurrentPage('evidence')}
        onOpenBackendSetup={() => setIsBackendSetupOpen(true)}
      />

      {/* Main Page Layout Switcher */}
      <main className="flex-1">
        {currentPage === 'home' && (
          <>
            <HeroSection
              language={language}
              onSearch={handleSearch}
              setCurrentPage={setCurrentPage}
              onOpenCertificateDemo={() => handleOpenCertificate()}
            />
            <FeatureCards
              language={language}
              setCurrentPage={setCurrentPage}
              onOpenCertificateDemo={() => handleOpenCertificate()}
              onOpenClaimDemo={handleOpenClaimAssistant}
            />
            <InteractiveErosionMap
              language={language}
              onOpenCertificateDemo={() => handleOpenCertificate()}
              onOpenClaimDemo={handleOpenClaimAssistant}
            />
            <InteractiveEvidenceLab
              language={language}
              onOpenCertificateDemo={() => handleOpenCertificate()}
              onOpenClaimDemo={handleOpenClaimAssistant}
            />
            <CommunityProofSection language={language} setCurrentPage={setCurrentPage} />
            <AboutSection
              language={language}
              setCurrentPage={setCurrentPage}
              onOpenCertificateDemo={() => handleOpenCertificate()}
            />
          </>
        )}

        {currentPage === 'signin' && (
          <SignInPage
            language={language}
            setCurrentPage={setCurrentPage}
          />
        )}

        {currentPage === 'signup' && (
          <SignUpPage
            language={language}
            setCurrentPage={setCurrentPage}
          />
        )}

        {currentPage === 'profile' && (
          <CitizenProfileView
            language={language}
            currentUser={profile}
            onLogout={handleLogout}
            setCurrentPage={setCurrentPage}
          />
        )}

        {currentPage === 'claims' && profile?.role === 'citizen' && (
          <CitizenClaimsView language={language} currentUser={profile} />
        )}

        {currentPage === 'corroboration' && profile && (
          <CommunityCorroborationView language={language} currentUser={profile} />
        )}

        {currentPage === 'officer-register' && (
          <OfficerRegistrationView language={language} currentUser={profile} setCurrentPage={setCurrentPage} />
        )}

        {currentPage === 'officer-status' && (
          <OfficerStatusView language={language} currentUser={profile} setCurrentPage={setCurrentPage} />
        )}

        {currentPage === 'officer-dashboard' && profile?.role === 'officer' && (
          <OfficerDashboardView language={language} currentUser={profile} setCurrentPage={setCurrentPage} />
        )}

        {currentPage === 'admin-dashboard' && profile?.role === 'admin' && (
          <AdminOfficerApplicationsView language={language} currentUser={profile} />
        )}

        {currentPage === 'account-activation' && (
          <AccountActivationView language={language} currentUser={profile} setCurrentPage={setCurrentPage} />
        )}

        {currentPage === 'evidence' && (
          <LandRecordsView
            language={language}
            onOpenClaimDemo={handleOpenClaimAssistant}
            onStartClaim={() => setCurrentPage(profile?.role === 'citizen' ? 'claims' : 'signup')}
            setCurrentPage={setCurrentPage}
          />
        )}

        {currentPage === 'satellite' && (
          <>
            <InteractiveErosionMap
              language={language}
              onOpenCertificateDemo={() => handleOpenCertificate()}
              onOpenClaimDemo={handleOpenClaimAssistant}
            />
            <SatelliteServicesView
              language={language}
              onOpenCertificateDemo={() => handleOpenCertificate()}
              onOpenClaimDemo={handleOpenClaimAssistant}
              setCurrentPage={setCurrentPage}
            />
          </>
        )}

        {currentPage === 'about' && (
          <AboutRoadmapView language={language} setCurrentPage={setCurrentPage} />
        )}

      </main>

      <Footer setCurrentPage={setCurrentPage} language={language} />

      <CertificateModal
        isOpen={isCertificateOpen}
        onClose={() => setIsCertificateOpen(false)}
        record={selectedRecord}
        language={language}
      />

      <BackendSetupModal
        isOpen={isBackendSetupOpen}
        onClose={() => setIsBackendSetupOpen(false)}
        language={language}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root export — wraps AppInner with AuthProvider
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
