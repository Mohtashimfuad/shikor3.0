import React from 'react';
import { X, Printer, Download, CheckCircle2, QrCode, Shield, Scale, MapPin } from 'lucide-react';
import { LandLossRecord, Language } from '../../types';

interface CertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: LandLossRecord;
  language: Language;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({
  isOpen,
  onClose,
  record,
  language
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl border-2 border-[#123B32] overflow-hidden my-8">
        
        {/* Top bar with actions */}
        <div className="bg-[#123B32] text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scale className="w-5 h-5 text-[#C6A66B]" />
            <span className="font-serif-title font-bold text-sm tracking-wide">
              {language === 'bn' ? 'নদীভাঙন রেকর্ডের নমুনা' : 'Sample erosion record'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded text-xs font-semibold flex items-center space-x-1 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'প্রিন্ট' : 'Print'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Paper Body with Ornamental Border */}
        <div className="p-8 sm:p-10 bg-[#Fdfbf7] relative">

          <div role="note" className="mb-5 rounded-lg border-2 border-amber-500 bg-amber-50 px-4 py-3 text-center text-xs font-bold text-amber-950">
            {language === 'bn' ? 'নমুনা মাত্র — এটি সরকারি সনদ নয়, প্রকৃত যাচাইকরণ বা জমির অধিকার প্রমাণ করে না' : 'SAMPLE ONLY — not an official certificate and does not verify a real claim or land right'}
          </div>
          
          {/* Subtle watermark seal */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
            <Scale className="w-96 h-96 text-[#123B32]" />
          </div>

          {/* Inner Ornate Frame */}
          <div className="border-4 border-double border-[#123B32] p-6 sm:p-8 relative bg-white shadow-sm">
            
            {/* Header of Certificate */}
            <div className="text-center space-y-1 mb-6 border-b border-[#D9E1DC] pb-4">
              <div className="inline-block px-3 py-0.5 rounded-full bg-[#123B32] text-[#C6A66B] font-mono text-[10px] uppercase tracking-widest font-bold mb-1">
                CIVIC GEOSPATIAL CITIZEN EVIDENCE DOSSIER
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#123B32] font-serif-title">
                SAMPLE RECORD OF REPORTED INUNDATION
              </h2>
              <p className="text-sm font-semibold text-[#123B32]/90 font-serif-title">
                নদীভাঙনে জমি হারানোর প্রতিবেদনের নমুনা
              </p>
              <p className="text-[11px] text-[#64748B] font-mono">
                Issued under Bangladesh State Acquisition and Tenancy Act 1950 (Section 86) & Char Land Settlement Framework
              </p>
            </div>

            {/* Tracking ID & Status Bar */}
            <div className="flex flex-wrap items-center justify-between text-xs bg-[#F5F1E8] p-3 rounded border border-[#D9E1DC] mb-6 font-mono">
              <div>
                <span className="text-[#64748B]">SAMPLE TRACKING ID: </span>
                <span className="font-bold text-[#123B32]">{record.trackingId}</span>
              </div>
              <div>
                <span className="text-[#64748B]">ISSUED DATE: </span>
                <span className="font-semibold text-[#1F2933]">{record.issuedDate}</span>
              </div>
              <div className="flex items-center space-x-1 text-emerald-800 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>DEMO DATA ONLY</span>
              </div>
            </div>

            {/* Main Descriptive Paragraph */}
            <div className="text-xs sm:text-sm text-[#1F2933] leading-relaxed mb-6 space-y-3 font-serif">
              <p>
                This sample record contains information attributed to <strong>{record.ownerName}</strong> ({record.ownerBanglaName}).
                It does not verify a government identity number or establish an official land decision. The parcel described below
                is shown as an example of reported riverbank erosion in the <strong>{record.riverBasin}</strong> area.
              </p>
            </div>

            {/* Cadastral & Survey Specifications Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#Fdfbf7] p-4 rounded border border-[#D9E1DC] text-xs mb-6">
              <div>
                <span className="block text-[10px] text-[#64748B] uppercase">District / Upazila</span>
                <span className="font-bold text-[#123B32]">{record.district}, {record.upazila}</span>
              </div>
              <div>
                <span className="block text-[10px] text-[#64748B] uppercase">Mouza & JL No.</span>
                <span className="font-bold text-[#123B32]">{record.mouza} (JL #{record.jlNumber})</span>
              </div>
              <div>
                <span className="block text-[10px] text-[#64748B] uppercase">Khatian / Dag No.</span>
                <span className="font-bold text-[#123B32]">{record.khatianNo} / Dag #{record.dagNo}</span>
              </div>
              <div>
                <span className="block text-[10px] text-[#64748B] uppercase">Submerged Area</span>
                <span className="font-bold text-red-700">{record.submergedAreaAcre} of {record.totalAreaAcre} Acres</span>
              </div>
            </div>

            {/* Evidence & Technical Grounding */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-b border-[#D9E1DC] py-4 mb-6 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#123B32] uppercase tracking-wider block">
                  Satellite Earth Observation
                </span>
                <p className="text-[11px] text-[#64748B]">
                  Example value only: <strong className="text-[#123B32]">{record.satelliteSentinelMatch}%</strong>. This screen has no connected satellite verification result.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#123B32] uppercase tracking-wider block">
                  Community Proof of Possession
                </span>
                <p className="text-[11px] text-[#64748B]">
                  <strong className="text-[#123B32]">{record.witnessCount} Peer Witnesses</strong> & local UP representatives signed digital attestation affidavits.
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#123B32] uppercase tracking-wider block">
                  GPS Coordinates Centroid
                </span>
                <p className="text-[11px] font-mono text-[#123B32]">
                  {record.gpsCoords.lat.toFixed(4)}° N, {record.gpsCoords.lng.toFixed(4)}° E
                </p>
              </div>
            </div>

            {/* Signatures & QR Code Section */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-2">
              
              {/* QR Code and Hash */}
              <div className="flex items-center space-x-3">
                <div className="w-16 h-16 bg-white border border-[#123B32] p-1 rounded flex items-center justify-center shadow-sm">
                  <QrCode className="w-14 h-14 text-[#123B32]" />
                </div>
                <div className="text-[10px] space-y-0.5">
                  <div className="font-bold text-[#123B32]">Scan to Verify on Shikor (শিকড়)</div>
                  <div className="text-[#64748B] font-mono truncate max-w-[180px]">Hash: {record.certificateHash}</div>
                  <div className="text-emerald-700 font-semibold">Status: Eligible for Khas Land Resettlement</div>
                </div>
              </div>

              {/* Digital Seals and Signatures */}
              <div className="flex items-center space-x-6 text-center text-xs">
                <div>
                  <div className="w-24 h-10 border-b border-dashed border-[#123B32] mx-auto flex items-end justify-center pb-1">
                    <span className="font-serif italic text-xs text-[#123B32]">Shikor GeoAI</span>
                  </div>
                  <span className="text-[10px] text-[#64748B] block mt-1">Automated Geo-Auditor</span>
                </div>

                <div>
                  <div className="w-24 h-10 border-b border-dashed border-[#123B32] mx-auto flex items-end justify-center pb-1">
                    <span className="font-serif font-bold text-xs text-[#123B32]">AC Land Desk</span>
                  </div>
                  <span className="text-[10px] text-[#64748B] block mt-1">Forwarded to Upazila Registry</span>
                </div>
              </div>

            </div>

          </div>

          {/* Footer note */}
          <div className="text-center text-[10px] text-[#64748B] mt-4 font-mono">
            Generated via Shikor Citizen Evidence Protocol • Chilmari & Char Belt Pilot Edition
          </div>

        </div>

      </div>
    </div>
  );
};
