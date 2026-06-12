import { PageSEO } from '@/components/seo/PageSEO';
import { HeroSection } from '@/components/home/HeroSection';
import { TrustStrip } from '@/components/landing/TrustStrip';
import { MediScanShowcaseSection } from '@/components/landing/MediScanShowcaseSection';
import { ServicesOverview } from '@/components/landing/ServicesOverview';
import { SpecializationsSection } from '@/components/landing/SpecializationsSection';
import { FeaturedDoctorsSection } from '@/components/landing/FeaturedDoctorsSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { StatsSection } from '@/components/home/FeaturedSections';
import { AppDownloadSection } from '@/components/landing/AppDownloadSection';

export function HomePage() {
  return (
    <>
      <PageSEO titleKey="seo.homeTitle" descriptionKey="seo.homeDescription" path="/" />
      <HeroSection />
      <TrustStrip id="how-it-works" />
      <MediScanShowcaseSection />
      <ServicesOverview />
      <SpecializationsSection />
      <FeaturedDoctorsSection />
      <TestimonialsSection />
      <StatsSection />
      <AppDownloadSection />
    </>
  );
}
