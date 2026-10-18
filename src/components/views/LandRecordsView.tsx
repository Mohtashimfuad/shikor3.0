import React, { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, FileText, Filter, MapPin, RefreshCw, ShieldCheck } from 'lucide-react';
import type { Language, PageView } from '../../types';
import { getPublicErosionRecords, type PublicErosionRecord } from '../../lib/erosionClaims';

interface LandRecordsViewProps {
  language: Language;
  onOpenClaimDemo: () => void;
  onStartClaim: () => void;
  setCurrentPage: (page: PageView) => void;
}

export const LandRecordsView: React.FC<LandRecordsViewProps> = ({ language, onOpenClaimDemo, onStartClaim, setCurrentPage }) => {
  const [filterDistrict, setFilterDistrict] = useState('all');
  const [records, setRecords] = useState<PublicErosionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const copy = (bn: string, en: string) => language === 'bn' ? bn : en;

  const load = async () => {
    setLoading(true);
    const result = await getPublicErosionRecords();
    setRecords(result.records);
    setLoadError(result.error);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const districts = Array.from(new Set(records.map((record) => record.district)));
  const filteredRecords = records.filter((record) => filterDistrict === 'all' || record.district === filterDistrict);

  return (
    <div className="py-10 bg-[#F5F1E8] min-h-[85vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#D9E1DC] pb-6">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs uppercase font-extrabold tracking-widest text-[#123B32] font-mono">
                {copy('নদীভাঙন ভূমি রেকর্ড রেজিস্ট্রি', 'RIVER EROSION LAND RECORDS REGISTRY')}
              </span>
              <span className="w-8 h-0.5 bg-[#123B32]"></span>
            </div>
            <h1 className="text-3xl font-bold text-[#123B32] font-serif-title">
              {copy('প্রকাশিত যাচাইকৃত ভাঙন রেকর্ড', 'Published verified erosion records')}
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B] mt-1 max-w-3xl">
              {copy('শুধু প্রশাসক কর্তৃক প্রকাশিত যাচাইকৃত এলাকার তথ্য এখানে দেখানো হয়। দাবিদারের নাম, NID, খতিয়ান ও দাগ নম্বর প্রকাশ করা হয় না।', 'Only verified area summaries explicitly published by an Admin appear here. Claimant names, NID, khatian and dag numbers are not exposed.')}
            </p>
          </div>
          <button onClick={onStartClaim} className="bg-[#123B32] hover:bg-[#0c2822] text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm">
            + {copy('নতুন ভাঙন দাবি দাখিল', 'File a new erosion claim')}
          </button>
        </div>

        {records.length > 0 && <div className="bg-white p-4 rounded-xl border border-[#D9E1DC] shadow-sm flex items-center gap-3">
          <Filter className="w-4 h-4 text-[#64748B]" />
          <select value={filterDistrict} onChange={(event) => setFilterDistrict(event.target.value)} className="text-xs px-3 py-2 rounded-lg border border-[#D9E1DC] bg-white font-medium text-[#123B32]">
            <option value="all">{copy('সকল জেলা', 'All districts')}</option>
            {districts.map((district) => <option key={district} value={district}>{district}</option>)}
          </select>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-800"><ShieldCheck className="w-4 h-4" />{copy('প্রশাসক-প্রকাশিত', 'Admin published')}</span>
        </div>}

        {loading ? <div className="bg-white rounded-xl border border-[#D9E1DC] p-8 text-center text-sm text-[#64748B]">{copy('প্রকাশিত রেকর্ড লোড হচ্ছে…', 'Loading published records…')}</div> : loadError ? (
          <div role="alert" className="bg-white rounded-xl border border-rose-200 p-8 text-center text-sm text-rose-700">{copy('প্রকাশিত রেকর্ড লোড করা যায়নি। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।', 'Published records could not be loaded. Check the connection and try again.')}<button onClick={() => void load()} className="ml-3 inline-flex items-center gap-1 font-bold underline"><RefreshCw className="w-3 h-3" />{copy('আবার চেষ্টা করুন', 'Retry')}</button></div>
        ) : filteredRecords.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#D9E1DC] p-8 text-center space-y-2">
            <MapPin className="w-8 h-8 mx-auto text-[#C6A66B]" />
            <p className="text-sm font-bold text-[#123B32]">{copy('এখনো কোনো প্রকাশিত যাচাইকৃত রেকর্ড নেই।', 'There are no published verified records yet.')}</p>
            <p className="text-xs text-[#64748B]">{copy('দাবির ব্যক্তিগত নথি প্রকাশ্য তালিকায় দেখানো হয় না।', 'Private claim dossiers are not shown in this public list.')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredRecords.map((record) => (
              <article key={record.id} className="bg-white rounded-xl border border-[#D9E1DC] p-5 shadow-sm flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#D9E1DC] gap-2">
                    <span className="text-[10px] font-mono text-[#64748B] font-bold">{copy('প্রকাশিত', 'Published')} · {new Date(record.publishedAt).toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-GB')}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{copy('যাচাইকৃত', 'Verified')}</span>
                  </div>
                  <h2 className="text-sm font-bold text-[#123B32] flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-[#C6A66B]" />{record.upazila}, {record.district}</h2>
                  <p className="text-xs text-[#64748B]">{record.unionName}, {record.mouzaName} · {record.erosionYear}</p>
                  <div className="bg-[#F5F1E8] p-3 rounded-lg text-xs space-y-1.5">
                    <div className="flex justify-between gap-3"><span className="text-[#64748B]">{copy('নিমজ্জিত / মোট এলাকা', 'Submerged / total area')}</span><strong className="text-red-700">{record.submergedAreaAcre} / {record.totalAreaAcre} acres</strong></div>
                    <div className="flex justify-between gap-3"><span className="text-[#64748B]">{copy('নদী অববাহিকা', 'River basin')}</span><strong className="text-[#123B32]">{record.riverBasin}</strong></div>
                  </div>
                </div>
                <button onClick={onOpenClaimDemo} className="mt-4 bg-[#D8E8DF] hover:bg-[#c6dfd0] text-[#123B32] py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border border-[#a8cfb9]">
                  <FileText className="w-3.5 h-3.5" />{copy('নিজের দাবি ও খসড়ায় যান', 'Open my claims and drafts')}<ArrowRight className="w-3.5 h-3.5" />
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
