import React from 'react';
import { MapPin } from 'lucide-react';

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
  const update = (field: keyof AddressData, val: string) => {
    onChange({
      ...value,
      [field]: val
    });
  };

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-indigo-500" />
        <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200">
          Mailing & Residence Address
        </h3>
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
            placeholder="e.g. 102 Park Avenue, Suite 400"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
            placeholder="e.g. Colombo / San Francisco"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
            placeholder="e.g. Western Province / CA"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
            placeholder="e.g. 00500 / 94107"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
            placeholder="e.g. Sri Lanka / United States"
            className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

