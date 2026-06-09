import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, MapPin, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useGetDoctorsQuery, useGetSpecialtiesQuery, useGetCityDetailsQuery } from '@/features/api/apiSlice';
import { DoctorCard } from '@/components/doctor/DoctorCard';
import { DoctorFilters, type DoctorFilterValues } from '@/components/doctor/DoctorFilters';
import { CitySearchInput } from '@/components/search/CitySearchInput';
import { HospitalsSection } from '@/components/hospital/HospitalsSection';
import { cn } from '@/lib/utils';
import type { Doctor } from '@/types';

function parseFilters(params: URLSearchParams): DoctorFilterValues {
  return {
    specialty: params.get('specialty') || '',
    minRating: params.get('minRating') || '',
    consultationType: params.get('consultationType') || '',
    minExperience: params.get('minExperience') || '0',
    minFee: params.get('minFee') || '0',
    maxFee: params.get('maxFee') || '3000',
    sort: params.get('sort') || 'relevance',
    gender: params.get('gender') || '',
    language: params.get('language') || '',
    mode: params.get('mode') || '',
    availableToday: params.get('availableToday') || '',
  };
}

export function DoctorsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const scanBooking = (location.state as { scanBooking?: { specialty?: string } } | null)
    ?.scanBooking;
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const feeRange: [number, number] = [
    Number(filters.minFee) || 0,
    Number(filters.maxFee) || 3000,
  ];
  const experienceRange = Number(filters.minExperience) || 0;

  useEffect(() => {
    setCity(searchParams.get('city') || '');
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);

  useEffect(() => {
    if (scanBooking?.specialty && !searchParams.get('specialty')) {
      const params = new URLSearchParams(searchParams);
      params.set('specialty', scanBooking.specialty);
      setSearchParams(params, { replace: true });
    }
  }, [scanBooking?.specialty, searchParams, setSearchParams]);

  const bookingFromScan =
    searchParams.get('fromScan') === '1' || Boolean(scanBooking);

  const queryParams: Record<string, string | undefined> = {
    search: searchParams.get('search') || undefined,
    city: searchParams.get('city') || undefined,
    page: searchParams.get('page') || '1',
    specialty: filters.specialty || undefined,
    minRating: filters.minRating || undefined,
    consultationType: filters.consultationType || undefined,
    minExperience: experienceRange > 0 ? String(experienceRange) : undefined,
    minFee: feeRange[0] > 0 ? String(feeRange[0]) : undefined,
    maxFee: feeRange[1] < 3000 ? String(feeRange[1]) : undefined,
    sort: filters.sort || 'relevance',
    gender: filters.gender || undefined,
    language: filters.language || undefined,
    mode: filters.mode || undefined,
    availableToday: filters.availableToday || undefined,
  };

  const selectedCity = searchParams.get('city') || '';
  const { data, isLoading, isFetching } = useGetDoctorsQuery(queryParams);
  const { data: specialtiesData } = useGetSpecialtiesQuery();
  const { data: cityDetails } = useGetCityDetailsQuery(selectedCity, { skip: !selectedCity });
  const specialties = specialtiesData?.data || [];

  const updateParams = (updater: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams);
    updater(params);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams((params) => {
      if (search) params.set('search', search);
      else params.delete('search');
    });
  };

  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    updateParams((params) => {
      if (newCity) params.set('city', newCity);
      else params.delete('city');
    });
  };

  const handleFilterChange = (key: string, value: string) => {
    updateParams((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
  };

  const handleFeeRangeChange = (min: number, max: number) => {
    updateParams((params) => {
      params.set('minFee', String(min));
      params.set('maxFee', String(max));
    });
  };

  const handleExperienceChange = (years: number) => {
    updateParams((params) => {
      if (years > 0) params.set('minExperience', String(years));
      else params.delete('minExperience');
    });
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams();
    const searchVal = searchParams.get('search');
    const cityVal = searchParams.get('city');
    if (searchVal) params.set('search', searchVal);
    if (cityVal) params.set('city', cityVal);
    params.set('sort', 'relevance');
    setSearchParams(params);
  };

  const doctors = (data?.data?.doctors || []) as Doctor[];
  const pagination = data?.data?.pagination;

  const filterPanel = (
    <DoctorFilters
      filters={filters}
      specialties={specialties}
      feeRange={feeRange}
      experienceRange={experienceRange}
      onChange={handleFilterChange}
      onFeeRangeChange={handleFeeRangeChange}
      onExperienceChange={handleExperienceChange}
      onClear={handleClearFilters}
    />
  );

  return (
    <div className="bg-background min-h-screen">
      {bookingFromScan && (
        <div className="bg-primary/5 border-b border-primary/20">
          <div className="container-custom py-3 text-sm">
            <p className="font-medium text-primary">Doctors for your MediScan result</p>
            <p className="text-muted mt-0.5">
              Showing specialists matched to your scan type
              {filters.specialty ? ` (${filters.specialty})` : ''}.
            </p>
          </div>
        </div>
      )}
      {/* Top search bar — Practo style */}
      <div className="bg-white border-b border-border shadow-sm sticky top-16 z-40">
        <div className="container-custom py-4">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-[2]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted z-10" />
              <Input
                placeholder={t('doctors.searchPlaceholder')}
                className="pl-10 h-11 rounded-lg"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <CitySearchInput
              value={city}
              onChange={handleCityChange}
              placeholder={t('doctors.cityPlaceholder')}
              inputClassName="h-11 rounded-lg"
              className="flex-1 min-w-[180px]"
            />
            <Button type="submit" className="h-11 px-8 rounded-lg shrink-0">
              {t('common.search')}
            </Button>
          </form>
        </div>
      </div>

      <div className="container-custom py-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">{t('doctors.pageTitle')}</h1>
          <p className="text-muted text-sm md:text-base">
            {selectedCity
              ? t('doctors.subtitleCity', {
                  city: selectedCity,
                  state: cityDetails?.data?.state ? `, ${cityDetails.data.state}` : '',
                })
              : t('doctors.subtitle')}
          </p>
          {selectedCity && cityDetails?.data && (
            <p className="flex items-center gap-1 text-sm text-muted mt-2">
              <MapPin className="h-4 w-4 text-primary" />
              {cityDetails.data.doctorCount} doctors · {cityDetails.data.hospitalCount} hospitals
            </p>
          )}
        </div>

        {selectedCity && (
          <HospitalsSection city={selectedCity} search={searchParams.get('search') || undefined} />
        )}

        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Desktop filters */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-36 bg-card rounded-2xl border border-border p-5 shadow-sm">
              {filterPanel}
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <p className="text-sm text-muted">
                {isFetching ? 'Updating...' : (
                  <><span className="font-semibold text-foreground">{pagination?.total ?? doctors.length}</span> doctors found</>
                )}
              </p>

              <div className="flex items-center gap-2">
                <select
                  className="h-9 rounded-lg border border-input bg-card px-3 text-sm"
                  value={filters.sort}
                  onChange={(e) => handleFilterChange('sort', e.target.value)}
                >
                  <option value="relevance">Sort: Relevance</option>
                  <option value="rating">Sort: Rating</option>
                  <option value="experience">Sort: Experience</option>
                  <option value="fee-low">Sort: Fee ↑</option>
                  <option value="fee-high">Sort: Fee ↓</option>
                </select>

                <div className="hidden sm:flex border border-border rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={cn('p-2', viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'bg-card')}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={cn('p-2', viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'bg-card')}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden gap-1"
                  onClick={() => setMobileFiltersOpen(true)}
                >
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                </Button>
              </div>
            </div>

            {/* Active filter chips */}
            {(filters.specialty || filters.mode || filters.availableToday || experienceRange > 0) && (
              <div className="flex flex-wrap gap-2 mb-4">
                {filters.specialty && (
                  <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">{filters.specialty}</span>
                )}
                {filters.mode && (
                  <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full capitalize">{filters.mode}</span>
                )}
                {filters.availableToday === 'true' && (
                  <span className="text-xs bg-secondary/10 text-secondary px-3 py-1 rounded-full">Available today</span>
                )}
                {experienceRange > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">{experienceRange}+ yrs exp</span>
                )}
              </div>
            )}

            {isLoading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-36 bg-border rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : doctors.length === 0 ? (
              <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-card">
                <p className="text-lg font-medium">No doctors match your filters</p>
                <p className="text-sm text-muted mt-2 mb-6">Try changing city, fee range, or clear filters</p>
                <Button variant="outline" onClick={handleClearFilters}>Clear filters</Button>
              </div>
            ) : (
              <>
                <div className={cn(
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-5'
                    : 'flex flex-col gap-4'
                )}>
                  {doctors.map((doctor) => (
                    <DoctorCard key={doctor._id} doctor={doctor} variant={viewMode} />
                  ))}
                </div>

                {pagination && pagination.pages > 1 && (
                  <div className="flex justify-center gap-2 mt-10 flex-wrap">
                    {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={pagination.page === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          const params = new URLSearchParams(searchParams);
                          params.set('page', String(page));
                          setSearchParams(params);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filters drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-card shadow-xl overflow-y-auto p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Filters</h3>
              <Button variant="ghost" size="sm" onClick={() => setMobileFiltersOpen(false)}>Done</Button>
            </div>
            {filterPanel}
          </div>
        </div>
      )}
    </div>
  );
}
