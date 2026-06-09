import { Filter, SlidersHorizontal, Video, Building2, CalendarCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DoctorFilterValues {
  specialty: string;
  minRating: string;
  consultationType: string;
  minExperience: string;
  minFee: string;
  maxFee: string;
  sort: string;
  gender: string;
  language: string;
  mode: string;
  availableToday: string;
}

interface DoctorFiltersProps {
  filters: DoctorFilterValues;
  specialties: string[];
  feeRange: [number, number];
  experienceRange: number;
  onChange: (key: string, value: string) => void;
  onFeeRangeChange: (min: number, max: number) => void;
  onExperienceChange: (years: number) => void;
  onClear: () => void;
  className?: string;
}

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu', 'Bengali', 'Marathi'];

export function DoctorFilters({
  filters,
  specialties,
  feeRange,
  experienceRange,
  onChange,
  onFeeRangeChange,
  onExperienceChange,
  onClear,
  className,
}: DoctorFiltersProps) {
  const selectClass =
    'w-full h-10 rounded-lg border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

  const activeCount = [
    filters.specialty,
    filters.minRating,
    filters.consultationType,
    filters.gender,
    filters.language,
    filters.mode,
    filters.availableToday,
    filters.minExperience !== '0' ? filters.minExperience : '',
    feeRange[0] > 0 || feeRange[1] < 3000 ? 'fee' : '',
  ].filter(Boolean).length;

  return (
    <div className={cn('space-y-5', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          Filters
          {activeCount > 0 && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </h3>
        <button type="button" className="text-xs text-primary hover:underline font-medium" onClick={onClear}>
          Clear all
        </button>
      </div>

      {/* Consultation mode */}
      <div>
        <label className="text-sm font-medium mb-2 block">Consultation mode</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange('mode', filters.mode === 'online' ? '' : 'online')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-medium transition-colors',
              filters.mode === 'online'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/50'
            )}
          >
            <Video className="h-4 w-4" /> Online
          </button>
          <button
            type="button"
            onClick={() => onChange('mode', filters.mode === 'in-clinic' ? '' : 'in-clinic')}
            className={cn(
              'flex items-center justify-center gap-1.5 py-2.5 rounded-lg border text-sm font-medium transition-colors',
              filters.mode === 'in-clinic'
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border hover:border-primary/50'
            )}
          >
            <Building2 className="h-4 w-4" /> In-clinic
          </button>
        </div>
      </div>

      {/* Available today */}
      <label className="flex items-center justify-between p-3 rounded-lg border border-border bg-card cursor-pointer hover:border-primary/30">
        <span className="flex items-center gap-2 text-sm font-medium">
          <CalendarCheck className="h-4 w-4 text-secondary" />
          Available today
        </span>
        <input
          type="checkbox"
          checked={filters.availableToday === 'true'}
          onChange={(e) => onChange('availableToday', e.target.checked ? 'true' : '')}
          className="h-5 w-5 rounded accent-primary"
        />
      </label>

      <div>
        <label className="text-sm font-medium mb-1 block">Specialization</label>
        <select
          className={selectClass}
          value={filters.specialty}
          onChange={(e) => onChange('specialty', e.target.value)}
        >
          <option value="">All specializations</option>
          {specialties.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Consultation type</label>
        <select
          className={selectClass}
          value={filters.consultationType}
          onChange={(e) => onChange('consultationType', e.target.value)}
        >
          <option value="">Any type</option>
          <option value="video">Video</option>
          <option value="audio">Audio</option>
          <option value="chat">Chat</option>
          <option value="homeVisit">Home visit</option>
        </select>
      </div>

      <div>
        <div className="flex justify-between text-sm mb-2">
          <label className="font-medium">Experience</label>
          <span className="text-muted">{experienceRange}+ years</span>
        </div>
        <input
          type="range"
          min={0}
          max={25}
          step={1}
          value={experienceRange}
          onChange={(e) => onExperienceChange(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none bg-border accent-primary cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted mt-1">
          <span>Any</span>
          <span>25+ yrs</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-sm mb-2">
          <label className="font-medium flex items-center gap-1">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Consultation fee
          </label>
          <span className="text-muted text-xs">
            ₹{feeRange[0]} – ₹{feeRange[1] >= 3000 ? '3000+' : feeRange[1]}
          </span>
        </div>
        <div className="space-y-3">
          <div>
            <span className="text-xs text-muted">Min ₹{feeRange[0]}</span>
            <input
              type="range"
              min={0}
              max={3000}
              step={50}
              value={feeRange[0]}
              onChange={(e) => {
                const min = Number(e.target.value);
                onFeeRangeChange(min, Math.max(min, feeRange[1]));
              }}
              className="w-full h-2 rounded-lg appearance-none bg-border accent-primary cursor-pointer"
            />
          </div>
          <div>
            <span className="text-xs text-muted">Max ₹{feeRange[1] >= 3000 ? '3000+' : feeRange[1]}</span>
            <input
              type="range"
              min={0}
              max={3000}
              step={50}
              value={feeRange[1]}
              onChange={(e) => {
                const max = Number(e.target.value);
                onFeeRangeChange(Math.min(feeRange[0], max), max);
              }}
              className="w-full h-2 rounded-lg appearance-none bg-border accent-primary cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Minimum rating</label>
        <select
          className={selectClass}
          value={filters.minRating}
          onChange={(e) => onChange('minRating', e.target.value)}
        >
          <option value="">Any rating</option>
          <option value="4">4+ stars</option>
          <option value="4.5">4.5+ stars</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Doctor gender</label>
        <select
          className={selectClass}
          value={filters.gender}
          onChange={(e) => onChange('gender', e.target.value)}
        >
          <option value="">Any gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Language spoken</label>
        <select
          className={selectClass}
          value={filters.language}
          onChange={(e) => onChange('language', e.target.value)}
        >
          <option value="">Any language</option>
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium mb-1 block">Sort by</label>
        <select
          className={selectClass}
          value={filters.sort}
          onChange={(e) => onChange('sort', e.target.value)}
        >
          <option value="relevance">Relevance</option>
          <option value="rating">Highest rated</option>
          <option value="experience">Most experienced</option>
          <option value="fee-low">Fee: low to high</option>
          <option value="fee-high">Fee: high to low</option>
        </select>
      </div>
    </div>
  );
}
