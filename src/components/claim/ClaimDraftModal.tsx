import React, { useState } from 'react';
import { X, Copy, Check, Printer, FileText, CheckCircle2, Building } from 'lucide-react';
import { ClaimApplication, Language } from '../../types';

interface ClaimDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  claim: ClaimApplication;
  language: Language;
}

export const ClaimDraftModal: React.FC<ClaimDraftModalProps> = ({
  isOpen,
  onClose,
  claim,
  language
}) => {
  const [copied, setCopied] = useState(false);
  const [activeLangTab, setActiveLangTab] = useState<'bn' | 'en'>('bn');

  if (!isOpen) return null;

  const currentText = activeLangTab === 'bn' ? claim.applicationBanglaText : claim.applicationText;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-[#D9E1DC] overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-[#123B32] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building className="w-5 h-5 text-[#C6A66B]" />
            <div>
              <h3 className="font-bold text-sm font-serif-title">
                {language === 'bn' 
                  ? 'নমুনা পুনর্বাসন আবেদনপত্র'
                  : 'Sample resettlement petition'}
              </h3>
              <p className="text-[11px] text-[#D8E8DF]">
                {claim.targetOffice}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-full text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action and Language Switcher Toolbar */}
        <div className="bg-[#F5F1E8] px-6 py-3 border-b border-[#D9E1DC] flex flex-wrap items-center justify-between gap-3 text-xs">
          
          {/* Language Toggle */}
          <div className="flex bg-white rounded-lg border border-[#D9E1DC] p-0.5">
            <button
              onClick={() => setActiveLangTab('bn')}
              className={`px-3 py-1 rounded font-semibold transition-colors ${
                activeLangTab === 'bn' ? 'bg-[#123B32] text-white' : 'text-[#64748B]'
              }`}
            >
              বাংলা খসড়া (Official Bangla)
            </button>
            <button
              onClick={() => setActiveLangTab('en')}
              className={`px-3 py-1 rounded font-semibold transition-colors ${
                activeLangTab === 'en' ? 'bg-[#123B32] text-white' : 'text-[#64748B]'
              }`}
            >
              English Translation
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="bg-white hover:bg-gray-50 text-[#123B32] px-3 py-1.5 rounded-lg border border-[#D9E1DC] font-semibold flex items-center space-x-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied!' : 'Copy Text'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="bg-white hover:bg-gray-50 text-[#123B32] px-3 py-1.5 rounded-lg border border-[#D9E1DC] font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Draft</span>
            </button>
          </div>

        </div>

        {/* Application Content */}
        <div className="p-6 sm:p-8 max-h-[60vh] overflow-y-auto space-y-4 font-serif text-sm text-[#1F2933]">

          <div role="note" className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 font-sans">
            <strong className="block">{language === 'bn' ? 'শুধু নমুনা — কোনো দপ্তরে দাখিল হয়নি' : 'Sample only — this has not been submitted to any office'}</strong>
            <span>{language === 'bn' ? 'নিচের নাম, আবেদন তথ্য ও সংযুক্তির উল্লেখ উদাহরণ। Shikor কোনো দপ্তরে আবেদন, ডকেট বা SMS পাঠায়নি।' : 'Names, claim details and enclosure references below are examples. Shikor has not sent an application, docket or SMS to any office.'}</span>
          </div>

          {/* Legal reference banner */}
          <div className="bg-[#D8E8DF]/60 p-3 rounded-lg border border-[#b8d6c4] text-xs font-sans text-[#123B32] flex items-center justify-between">
            <span className="font-bold">Statutory Authority: {claim.actSection}</span>
            <span className="font-mono text-[11px] text-[#123B32]">Recommended Plot: {claim.recommendedKhasMouza}</span>
          </div>

          {/* Letter text with pristine indentation */}
          <div className="bg-white p-6 rounded-lg border border-[#D9E1DC] whitespace-pre-line leading-relaxed shadow-inner font-sans text-xs sm:text-sm">
            {currentText}
          </div>

          {/* Enclosures Checklist */}
          <div className="border border-[#D9E1DC] rounded-lg p-4 bg-[#F5F1E8]/60 text-xs font-sans space-y-2">
            <span className="font-bold text-[#123B32] uppercase tracking-wider block">
              Example Enclosures (নমুনা সংযুক্তি — প্রকৃত ফাইল নয়):
            </span>
            <ul className="space-y-1 text-[#64748B]">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Shikor Sentinel-2 Satellite Submersion Certificate (SHK-KUR-2024-00284)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Attested CS/RS Cadastral Mouza Map Highlighting Submerged Dag #284</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>NID Photocopy & 14 Peer Community Geotagged Attestations</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="bg-[#F5F1E8] px-6 py-4 border-t border-[#D9E1DC] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#64748B]">
            {language === 'bn' ? 'অবস্থা:' : 'Status:'} <span className="font-bold text-amber-800">{language === 'bn' ? 'নমুনা — দাখিল করা হয়নি' : 'Sample — not submitted'}</span>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-[#64748B] hover:text-[#1F2933]"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center space-x-2 shadow-md bg-[#123B32] hover:bg-[#0c2822] text-white"
            >
              <Copy className="w-3.5 h-3.5 text-[#C6A66B]" />
              <span>{language === 'bn' ? 'নমুনা খসড়া কপি করুন' : 'Copy sample draft'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
