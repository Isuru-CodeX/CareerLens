import React, { useState } from 'react';
import { MapPin, Sparkles, Loader2, Check } from 'lucide-react';
import { api } from '../services/api';

export interface AddressData {
  address_line1?: string | null;
  city?: string | null;
  region?: string | null;
  postal_code?: string | null;
  country?: string | null;
}

interface AddressFieldsProps {
  value: AddressData;
  onChange: (val: AddressData) => void;
}

export const AddressFields: React.FC<AddressFieldsProps> = ({ value, onChange }) => {
  const [enriching, setEnriching] = useState(false);
  const [enrichedOk, setEnrichedOk] = useState(false);
  const [highlighted, setHighlighted] = useState(false);

  const update = (field: keyof AddressData, val: string) => {
    onChange({
      ...value,
      [field]: val
    });
  };

  const handleAutoEnrich = async () => {
    if (enriching) return;
    setEnriching(true);
    setEnrichedOk(false);
    try {
      const res = await api.enrichAddress({
        line1: value.address_line1 || undefined,
        city: value.city || undefined,
        region: value.region || undefined,
        postalCode: value.postal_code || undefined,
        country: value.country || undefined,
      });
      onChange({
        address_line1: (res.line1 ?? res.address_line1 ?? value.address_line1) || null,
        city: (res.city ?? value.city) || null,
        region: (res.region ?? value.region) || null,
        postal_code: (res.postalCode ?? res.postal_code ?? value.postal_code) || null,
        country: (res.country ?? value.country) || null,
      });
      setEnrichedOk(true);
      setHighlighted(true);
      setTimeout(() => setEnrichedOk(false), 3500);
      setTimeout(() => setHighlighted(false), 3500);
    } catch (err) {
      console.error('Failed to enrich address:', err);
    } finally {
      setEnriching(false);
    }
  };

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-500" />
          <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200">
            Mailing & Residence Address
          </h3>
        </div>

        <button
          type="button"
          onClick={handleAutoEnrich}
          disabled={enriching}
          className="px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-900 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
          title="Search online to complete city, state/region, and postal code automatically"
        >
          {enriching ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Searching Online...</span>
            </>
          ) : enrichedOk ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Address Enriched!</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Auto-Complete & Find Postal Code</span>
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        {/* Street address */}
        <div className="sm:col-span-3">
          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
            Street Address
          </label>
          <input
            type="text"
            autoComplete="address-line1"
            value={value.address_line1 || ''}
            onChange={(e) => update('address_line1', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAutoEnrich();
              }
            }}
            placeholder="e.g. 177 Great Portland Street, London W1W 6PQ"
            className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all ${
              highlighted
                ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          />
        </div>

        {/* City */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
            City
          </label>
          <input
            type="text"
            autoComplete="address-level2"
            value={value.city || ''}
            onChange={(e) => update('city', e.target.value)}
            placeholder="e.g. London / New York"
            className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all ${
              highlighted
                ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          />
        </div>

        {/* State / Province */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
            State / Province / Region
          </label>
          <input
            type="text"
            autoComplete="address-level1"
            value={value.region || ''}
            onChange={(e) => update('region', e.target.value)}
            placeholder="e.g. Greater London / NY"
            className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all ${
              highlighted
                ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          />
        </div>

        {/* Postal code */}
        <div>
          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
            Postal Code / ZIP
          </label>
          <input
            type="text"
            autoComplete="postal-code"
            value={value.postal_code || ''}
            onChange={(e) => update('postal_code', e.target.value)}
            placeholder="e.g. W1W 6PQ / 10001"
            className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all ${
              highlighted
                ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          />
        </div>

        {/* Country */}
        <div className="sm:col-span-3">
          <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
            Country of Residence
          </label>
          <input
            type="text"
            autoComplete="country-name"
            value={value.country || ''}
            onChange={(e) => update('country', e.target.value)}
            placeholder="e.g. United Kingdom / United States"
            className={`w-full px-3 py-2 rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition-all ${
              highlighted
                ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20'
                : 'border-slate-300 dark:border-slate-700'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

