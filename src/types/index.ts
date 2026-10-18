export type PageView =
  | 'home'
  | 'signin'
  | 'signup'
  | 'evidence'
  | 'satellite'
  | 'claims'
  | 'corroboration'
  | 'about'
  | 'profile'
  | 'officer-register'
  | 'officer-status'
  | 'officer-dashboard'
  | 'admin-dashboard'
  | 'account-activation';

export type Language = 'en' | 'bn';

export interface PilotUpazila {
  id: string;
  name: string;
  banglaName: string;
  district: string;
  river: string;
  erosionRate: string;
  displacedFamilies: number;
  activeClaims: number;
  coordinates: { x: number; y: number }; // percentage on Bangladesh map
  status: 'Active Pilot' | 'Phase 2 Scale' | 'Planned';
}

export interface LandLossRecord {
  id: string;
  trackingId: string;
  ownerName: string;
  ownerBanglaName: string;
  district: string;
  upazila: string;
  union: string;
  mouza: string;
  jlNumber: string;
  khatianNo: string;
  dagNo: string;
  totalAreaAcre: number;
  submergedAreaAcre: number;
  submersionYear: number;
  riverBasin: string;
  gpsCoords: { lat: number; lng: number };
  status: 'Verified by Satellite' | 'Pending Community Endorsement' | 'AC Land Review' | 'Khas Land Allocated';
  satelliteSentinelMatch: number; // percentage
  witnessCount: number;
  certificateHash: string;
  issuedDate: string;
}
