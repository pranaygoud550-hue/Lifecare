import {
  isExcludedSmallClinicName,
  isRecognizedHospitalName,
  isEmergencyCapableGooglePlace,
  isEmergencyCapableDbHospital,
} from '../../src/utils/emergencyHospitalFilter.js';

describe('emergencyHospitalFilter', () => {
  it('excludes small clinics and diagnostics', () => {
    expect(isExcludedSmallClinicName('FMS Dental Hospital')).toBe(true);
    expect(isExcludedSmallClinicName('Vishwa Medi Care and Diagnostic Centre')).toBe(true);
    expect(isExcludedSmallClinicName('City Nursing Home')).toBe(true);
  });

  it('includes recognized hospitals', () => {
    expect(isRecognizedHospitalName('Apollo Hospitals Jubilee Hills')).toBe(true);
    expect(isRecognizedHospitalName('Yashoda Hospitals Somajiguda')).toBe(true);
    expect(isRecognizedHospitalName('Government General Hospital')).toBe(true);
  });

  it('includes local hospitals like CMR Hospital', () => {
    expect(isRecognizedHospitalName('CMR Hospital')).toBe(true);
    expect(isRecognizedHospitalName('Konark Hospitals')).toBe(true);
    expect(isRecognizedHospitalName('Mythri Hospital')).toBe(true);
  });

  it('filters Google places without hospital type', () => {
    expect(
      isEmergencyCapableGooglePlace({
        place_id: 'x',
        name: 'Small Clinic',
        address: '',
        phone: null,
        distance: '1 km',
        distanceMeters: 1000,
        rating: null,
        isOpen: null,
        isEmergency: false,
        coordinates: { lat: 17.4, lng: 78.4 },
        photo_url: null,
        types: ['doctor'],
        specialtyTags: ['Clinic'],
      })
    ).toBe(false);
  });

  it('allows CMR Hospital from Google', () => {
    expect(
      isEmergencyCapableGooglePlace({
        place_id: 'cmr',
        name: 'CMR Hospital',
        address: 'Kandlakoya',
        phone: null,
        distance: '0.5 km',
        distanceMeters: 500,
        rating: null,
        isOpen: null,
        isEmergency: false,
        coordinates: { lat: 17.5976, lng: 78.489 },
        photo_url: null,
        types: ['hospital', 'health', 'point_of_interest', 'establishment'],
        specialtyTags: ['Hospital'],
      })
    ).toBe(true);
  });

  it('allows partner-style database hospitals', () => {
    expect(
      isEmergencyCapableDbHospital({
        name: 'Test Trauma Center Alpha',
        type: 'trauma-center',
        isActive: true,
        emergencyAvailable: true,
      } as never)
    ).toBe(true);
  });
});
