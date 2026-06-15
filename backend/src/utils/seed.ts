import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import connectDB from '../config/database.js';
import { User, Medicine, Coupon, Review, HealthRecord, Notification, Hospital, AmbulanceUnit } from '../models/index.js';
import { ensureInterviewDemoAppointment } from '../services/interviewDemoService.js';
import { slugify } from '../utils/cities.js';

export const runSeed = async () => {
  console.log('Seeding database...');

  const hashedPassword = await bcrypt.hash('Password@123', 10);

  // Admin user
  await User.findOneAndUpdate(
    { email: 'admin@lifecare.com' },
    {
      userType: 'admin',
      email: 'admin@lifecare.com',
      phone: '9999999999',
      password: hashedPassword,
      isEmailVerified: true,
      profile: { firstName: 'Admin', lastName: 'User' },
    },
    { upsert: true, new: true }
  );

  // Sample patient
  await User.findOneAndUpdate(
    { email: 'patient@demo.com' },
    {
      userType: 'patient',
      email: 'patient@demo.com',
      phone: '9876543210',
      password: hashedPassword,
      isEmailVerified: true,
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        gender: 'male',
        address: { city: 'Mumbai', state: 'Maharashtra', country: 'India', pincode: '400001' },
      },
      medicalHistory: {
        bloodGroup: 'O+',
        heightCm: 170,
        weightKg: 68,
        organDonor: false,
        smokingStatus: 'Never',
        alcoholUse: 'Occasional',
        profileCompleted: true,
        allergies: ['Penicillin'],
        chronicConditions: [],
      },
    },
    { upsert: true, new: true }
  );

  const doctors = [
    {
      email: 'dr.kavitha@lifecare.com',
      phone: '9876543221',
      firstName: 'Kavitha',
      lastName: 'Reddy',
      city: 'Mumbai',
      state: 'Maharashtra',
      specializations: ['General Physician'],
      experience: 12,
      bio: 'Experienced general physician offering video consultations for primary care, follow-ups, and preventive health.',
      fees: { video: 500, audio: 350, chat: 250, homeVisit: 1000 },
      rating: 4.9,
      hospitals: ['Apollo Hospitals Mumbai', 'Fortis Hospital Mulund'],
    },
    {
      email: 'dr.sharma@lifecare.com',
      phone: '9876543211',
      firstName: 'Rajesh',
      lastName: 'Sharma',
      city: 'Mumbai',
      state: 'Maharashtra',
      specializations: ['Cardiology'],
      experience: 15,
      bio: 'Senior Cardiologist with 15 years of experience in interventional cardiology.',
      fees: { video: 800, audio: 500, chat: 300, homeVisit: 1500 },
      rating: 4.8,
      hospitals: ['Apollo Hospitals Mumbai', 'Lilavati Hospital'],
    },
    {
      email: 'dr.patel@lifecare.com',
      phone: '9876543212',
      firstName: 'Priya',
      lastName: 'Patel',
      city: 'Mumbai',
      state: 'Maharashtra',
      specializations: ['Pediatrics'],
      experience: 10,
      bio: 'Pediatric specialist focused on child wellness and development.',
      fees: { video: 600, audio: 400, chat: 250, homeVisit: 1200 },
      rating: 4.9,
      hospitals: ['Kokilaben Dhirubhai Ambani Hospital'],
    },
    {
      email: 'dr.kumar@lifecare.com',
      phone: '9876543213',
      firstName: 'Amit',
      lastName: 'Kumar',
      city: 'Delhi',
      state: 'Delhi',
      specializations: ['General Physician'],
      experience: 8,
      bio: 'General physician providing comprehensive primary care services.',
      fees: { video: 400, audio: 300, chat: 200, homeVisit: 800 },
      rating: 4.7,
      hospitals: ['AIIMS Delhi', 'Max Super Speciality Hospital'],
    },
    {
      email: 'dr.singh@lifecare.com',
      phone: '9876543214',
      firstName: 'Anita',
      lastName: 'Singh',
      city: 'Bangalore',
      state: 'Karnataka',
      specializations: ['Dermatology'],
      experience: 12,
      bio: 'Dermatologist specializing in skin disorders and cosmetic dermatology.',
      fees: { video: 700, audio: 450, chat: 300, homeVisit: 1300 },
      rating: 4.6,
      hospitals: ['Manipal Hospital Bangalore'],
    },
    {
      email: 'dr.reddy@lifecare.com',
      phone: '9876543217',
      firstName: 'Vikram',
      lastName: 'Reddy',
      city: 'Hyderabad',
      state: 'Telangana',
      specializations: ['Neurology'],
      experience: 14,
      bio: 'Neurologist specializing in stroke and epilepsy care.',
      fees: { video: 900, audio: 550, chat: 350, homeVisit: 1600 },
      rating: 4.8,
      hospitals: ['Apollo Hospitals Hyderabad', 'Yashoda Hospitals'],
    },
    {
      email: 'dr.mehta@lifecare.com',
      phone: '9876543218',
      firstName: 'Sneha',
      lastName: 'Mehta',
      city: 'Pune',
      state: 'Maharashtra',
      specializations: ['Gynecology'],
      experience: 11,
      bio: 'Obstetrician and gynecologist with expertise in high-risk pregnancies.',
      fees: { video: 650, audio: 420, chat: 280, homeVisit: 1100 },
      rating: 4.7,
      hospitals: ['Ruby Hall Clinic', 'Jehangir Hospital'],
    },
    {
      email: 'dr.iyer@lifecare.com',
      phone: '9876543219',
      firstName: 'Arjun',
      lastName: 'Iyer',
      city: 'Chennai',
      state: 'Tamil Nadu',
      specializations: ['Orthopedics'],
      experience: 13,
      bio: 'Orthopedic surgeon specializing in joint replacement and sports injuries.',
      fees: { video: 750, audio: 480, chat: 320, homeVisit: 1400 },
      rating: 4.5,
      hospitals: ['Apollo Hospitals Chennai', 'Fortis Malar Hospital'],
    },
    {
      email: 'dr.banerjee@lifecare.com',
      phone: '9876543220',
      firstName: 'Debjani',
      lastName: 'Banerjee',
      city: 'Kolkata',
      state: 'West Bengal',
      specializations: ['Psychiatry'],
      experience: 9,
      bio: 'Psychiatrist offering therapy and medication management.',
      fees: { video: 550, audio: 380, chat: 250, homeVisit: 950 },
      rating: 4.6,
      hospitals: ['AMRI Hospitals Kolkata', 'Peerless Hospital'],
    },
  ];

  for (const doc of doctors) {
    await User.findOneAndUpdate(
      { email: doc.email },
      {
        userType: 'doctor',
        email: doc.email,
        phone: doc.phone,
        password: hashedPassword,
        isEmailVerified: true,
        profile: {
          firstName: doc.firstName,
          lastName: doc.lastName,
          gender: doc.firstName === 'Priya' || doc.firstName === 'Anita' || doc.firstName === 'Sneha' || doc.firstName === 'Debjani' || doc.firstName === 'Kavitha' ? 'female' : 'male',
          address: { city: doc.city, state: doc.state, country: 'India' },
        },
        doctorDetails: {
          registrationNumber: `MCI-${Math.floor(Math.random() * 100000)}`,
          qualifications: [
            'MBBS',
            'MD',
            ...(doc.specializations[0] ? [`DM / Fellowship (${doc.specializations[0]})`] : []),
          ],
          specializations: doc.specializations,
          experience: doc.experience,
          languages: ['English', 'Hindi', 'Marathi'].slice(0, doc.city === 'Mumbai' || doc.city === 'Pune' ? 3 : 2),
          bio: doc.bio,
          consultationFees: doc.fees,
          consultationTypes: ['video', 'audio', 'chat', 'homeVisit'],
          hospitalAffiliations: doc.hospitals,
          clinic: {
            name: doc.hospitals[0],
            address: doc.hospitals[0] + ', ' + doc.city,
            city: doc.city,
            state: doc.state,
            pincode: '400001',
            coordinates: {
              Mumbai: { lat: 19.076, lng: 72.8777 },
              Delhi: { lat: 28.6139, lng: 77.209 },
              Bangalore: { lat: 12.9716, lng: 77.5946 },
              Hyderabad: { lat: 17.385, lng: 78.4867 },
              Pune: { lat: 18.5204, lng: 73.8567 },
              Chennai: { lat: 13.0827, lng: 80.2707 },
              Kolkata: { lat: 22.5726, lng: 88.3639 },
            }[doc.city] || { lat: 20.5937, lng: 78.9629 },
          },
          education: [
            { degree: 'MBBS', institution: 'AIIMS', year: 2005 + Math.max(0, 20 - doc.experience) },
            { degree: 'MD', institution: 'PGIMER Chandigarh', year: 2010 + Math.max(0, 15 - doc.experience) },
            { degree: `Specialization in ${doc.specializations[0]}`, institution: 'National Board', year: 2012 + Math.max(0, 12 - doc.experience) },
          ],
          awards: [
            'Best Doctor Award - ' + doc.city + ' Medical Association',
            'Patient Choice Award ' + (2020 + Math.floor(Math.random() * 4)),
            'Excellence in ' + doc.specializations[0],
          ],
          availability: [
            { day: 'Monday', slots: [{ startTime: '09:00', endTime: '17:00' }] },
            { day: 'Tuesday', slots: [{ startTime: '09:00', endTime: '17:00' }] },
            { day: 'Wednesday', slots: [{ startTime: '09:00', endTime: '17:00' }] },
            { day: 'Thursday', slots: [{ startTime: '09:00', endTime: '17:00' }] },
            { day: 'Friday', slots: [{ startTime: '09:00', endTime: '17:00' }] },
            { day: 'Saturday', slots: [{ startTime: '09:00', endTime: '13:00' }] },
          ],
          verified: true,
          verificationStatus: 'approved',
          rating: doc.rating,
          reviewCount: Math.floor(Math.random() * 200) + 50,
        },
      },
      { upsert: true, new: true }
    );
  }

  // Hospitals across cities (with GeoJSON locations for emergency geospatial queries)
  const cityCoordinates: Record<string, { lat: number; lng: number }> = {
    Mumbai: { lat: 19.076, lng: 72.8777 },
    Delhi: { lat: 28.6139, lng: 77.209 },
    Bangalore: { lat: 12.9716, lng: 77.5946 },
    Hyderabad: { lat: 17.385, lng: 78.4867 },
    Pune: { lat: 18.5204, lng: 73.8567 },
    Chennai: { lat: 13.0827, lng: 80.2707 },
    Kolkata: { lat: 22.5726, lng: 88.3639 },
    Ahmedabad: { lat: 23.0225, lng: 72.5714 },
    Warangal: { lat: 17.9689, lng: 79.5941 },
  };

  const hospitals = [
    { name: 'Apollo Hospitals Mumbai', city: 'Mumbai', state: 'Maharashtra', address: 'Plot No 13, Off Carter Road, Tardeo', type: 'super-specialty', specialties: ['Cardiology', 'Neurology', 'Oncology'], rating: 4.7, emergency: true, beds: 500 },
    { name: 'Lilavati Hospital', city: 'Mumbai', state: 'Maharashtra', address: 'A-791, Bandra Reclamation, Bandra West', type: 'multi-specialty', specialties: ['Cardiology', 'Pediatrics', 'Orthopedics'], rating: 4.6, emergency: true, beds: 314 },
    { name: 'Kokilaben Dhirubhai Ambani Hospital', city: 'Mumbai', state: 'Maharashtra', address: 'Rao Saheb Achutrao Patwardhan Marg, Andheri West', type: 'super-specialty', specialties: ['Pediatrics', 'Neurology', 'Gynecology'], rating: 4.8, emergency: true, beds: 750 },
    { name: 'AIIMS Delhi', city: 'Delhi', state: 'Delhi', address: 'Sri Aurobindo Marg, Ansari Nagar', type: 'government', specialties: ['General Physician', 'Cardiology', 'Neurology'], rating: 4.9, emergency: true, beds: 2400 },
    { name: 'Max Super Speciality Hospital', city: 'Delhi', state: 'Delhi', address: '1, Press Enclave Road, Saket', type: 'super-specialty', specialties: ['Cardiology', 'Oncology', 'Orthopedics'], rating: 4.7, emergency: true, beds: 530 },
    { name: 'Manipal Hospital Bangalore', city: 'Bangalore', state: 'Karnataka', address: '98, HAL Airport Road, Old Airport Road', type: 'multi-specialty', specialties: ['Dermatology', 'Cardiology', 'ENT'], rating: 4.5, emergency: true, beds: 600 },
    { name: 'Apollo Hospitals Hyderabad', city: 'Hyderabad', state: 'Telangana', address: 'Jubilee Hills, Road No 72', type: 'super-specialty', specialties: ['Neurology', 'Cardiology', 'Gynecology'], rating: 4.7, emergency: true, beds: 550 },
    { name: 'Yashoda Hospitals', city: 'Hyderabad', state: 'Telangana', address: 'Raj Bhavan Road, Somajiguda', type: 'multi-specialty', specialties: ['Neurology', 'General Physician', 'Pediatrics'], rating: 4.4, emergency: true, beds: 400 },
    { name: 'Ruby Hall Clinic', city: 'Pune', state: 'Maharashtra', address: '40, Sassoon Road', type: 'multi-specialty', specialties: ['Gynecology', 'Pediatrics', 'General Physician'], rating: 4.5, emergency: true, beds: 550 },
    { name: 'Jehangir Hospital', city: 'Pune', state: 'Maharashtra', address: '32, Sassoon Road', type: 'multi-specialty', specialties: ['Gynecology', 'Orthopedics', 'Cardiology'], rating: 4.4, emergency: true, beds: 350 },
    { name: 'Apollo Hospitals Chennai', city: 'Chennai', state: 'Tamil Nadu', address: '21, Greams Lane, Off Greams Road', type: 'super-specialty', specialties: ['Orthopedics', 'Cardiology', 'Neurology'], rating: 4.6, emergency: true, beds: 560 },
    { name: 'Fortis Malar Hospital', city: 'Chennai', state: 'Tamil Nadu', address: '52, 1st Main Road, Gandhi Nagar, Adyar', type: 'multi-specialty', specialties: ['Orthopedics', 'General Physician', 'ENT'], rating: 4.3, emergency: true, beds: 180 },
    { name: 'AMRI Hospitals Kolkata', city: 'Kolkata', state: 'West Bengal', address: '230, Barakhola Lane, Mukundapur', type: 'multi-specialty', specialties: ['Psychiatry', 'Cardiology', 'Neurology'], rating: 4.5, emergency: true, beds: 300 },
    { name: 'Peerless Hospital', city: 'Kolkata', state: 'West Bengal', address: '360, Panchasayar', type: 'multi-specialty', specialties: ['Psychiatry', 'General Physician', 'Pediatrics'], rating: 4.2, emergency: true, beds: 400 },
    { name: 'Civil Hospital Ahmedabad', city: 'Ahmedabad', state: 'Gujarat', address: 'Asarwa, Ahmedabad', type: 'government', specialties: ['General Physician', 'Pediatrics', 'Orthopedics'], rating: 4.0, emergency: true, beds: 1200 },
    { name: 'Zydus Hospital', city: 'Ahmedabad', state: 'Gujarat', address: 'Zydus Hospitals Road, Thaltej', type: 'super-specialty', specialties: ['Cardiology', 'Neurology', 'Oncology'], rating: 4.6, emergency: true, beds: 350 },
    { name: 'Mahatma Gandhi Memorial Hospital', city: 'Warangal', state: 'Telangana', address: 'Kakatiya Medical College Campus, Warangal', type: 'government', specialties: ['General Physician', 'Emergency', 'Pediatrics'], rating: 4.2, emergency: true, beds: 800 },
    { name: 'City Hospital Warangal', city: 'Warangal', state: 'Telangana', address: 'Hanamkonda, Warangal', type: 'multi-specialty', specialties: ['General Physician', 'Orthopedics', 'Cardiology'], rating: 4.1, emergency: true, beds: 200 },
  ];

  for (const h of hospitals) {
    const base = cityCoordinates[h.city];
    if (!base) {
      console.warn(`Skipping hospital seed — unknown city: ${h.city}`);
      continue;
    }
    const lat = base.lat + (Math.random() - 0.5) * 0.04;
    const lng = base.lng + (Math.random() - 0.5) * 0.04;

    await Hospital.findOneAndUpdate(
      { slug: slugify(h.name) },
      {
        name: h.name,
        slug: slugify(h.name),
        city: h.city,
        state: h.state,
        address: h.address,
        phone: '+91 22 1234 5678',
        type: h.type,
        specialties: h.specialties,
        emergencyAvailable: h.emergency,
        beds: h.beds,
        rating: h.rating,
        reviewCount: Math.floor(Math.random() * 500) + 100,
        isActive: true,
        coordinates: { lat, lng },
        location: { type: 'Point', coordinates: [lng, lat] },
      },
      { upsert: true, new: true }
    );
  }

  // Pharmacy
  const pharmacy = await User.findOneAndUpdate(
    { email: 'pharmacy@lifecare.com' },
    {
      userType: 'pharmacy',
      email: 'pharmacy@lifecare.com',
      phone: '9876543215',
      password: hashedPassword,
      isEmailVerified: true,
      profile: { firstName: 'LifeCare', lastName: 'Pharmacy' },
      pharmacyDetails: {
        pharmacyName: 'LifeCare Pharmacy',
        licenseNumber: 'PH-12345',
        verified: true,
        rating: 4.5,
        deliveryRadius: 20,
      },
    },
    { upsert: true, new: true }
  );

  // Ambulance driver
  const ambulanceDriver = await User.findOneAndUpdate(
    { email: 'ambulance@lifecare.com' },
    {
      userType: 'ambulance',
      email: 'ambulance@lifecare.com',
      phone: '9876543216',
      password: hashedPassword,
      isEmailVerified: true,
      profile: { firstName: 'Ravi', lastName: 'Driver' },
      ambulanceDetails: {
        driverName: 'Ravi Driver',
        licenseNumber: 'DL-98765',
        vehicleNumber: 'MH-01-AB-1234',
        vehicleType: 'BLS',
        availability: true,
        currentLocation: { lat: 19.076, lng: 72.8777, timestamp: new Date() },
        location: { type: 'Point', coordinates: [72.8777, 19.076] },
        certifications: ['First Aid Certified', 'BLS Trained', 'ACLS Certified'],
        totalTrips: 1240,
        policeVerified: true,
        policeVerifiedAt: new Date('2024-06-01'),
        rating: 4.7,
      },
    },
    { upsert: true, new: true }
  );

  if (ambulanceDriver) {
    await AmbulanceUnit.findOneAndUpdate(
      { driverId: ambulanceDriver._id },
      {
        driverId: ambulanceDriver._id,
        vehicleNumber: 'MH-01-AB-1234',
        isAvailable: true,
        status: 'idle',
        lastUpdated: new Date(),
        currentLocation: {
          type: 'Point',
          coordinates: [72.8777, 19.076],
        },
      },
      { upsert: true, new: true }
    );
  }

  // Medicines
  const medicines = [
    { name: 'Paracetamol 500mg', genericName: 'Paracetamol', brand: 'Crocin', manufacturer: 'GSK Pharmaceuticals', category: 'OTC Medicines', form: 'Tablet', mrp: 30, price: 25, rx: false, stock: 250 },
    { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', brand: 'Mox', manufacturer: 'Sun Pharma', category: 'Prescription Medicines', form: 'Capsule', mrp: 120, price: 95, rx: true, stock: 80 },
    { name: 'Cetirizine 10mg', genericName: 'Cetirizine', brand: 'Zyrtec', manufacturer: 'Dr. Reddy\'s', category: 'OTC Medicines', form: 'Tablet', mrp: 45, price: 38, rx: false, stock: 120 },
    { name: 'Omeprazole 20mg', genericName: 'Omeprazole', brand: 'Omez', manufacturer: 'Torrent Pharma', category: 'Prescription Medicines', form: 'Capsule', mrp: 85, price: 70, rx: true, stock: 45 },
    { name: 'Vitamin D3 60000 IU', genericName: 'Cholecalciferol', brand: 'Calcirol', manufacturer: 'Cadila Healthcare', category: 'Vitamins & Supplements', form: 'Sachet', mrp: 35, price: 30, rx: false, stock: 200 },
    { name: 'Metformin 500mg', genericName: 'Metformin', brand: 'Glycomet', manufacturer: 'USV Ltd', category: 'Prescription Medicines', form: 'Tablet', mrp: 55, price: 45, rx: true, stock: 90 },
    { name: 'Azithromycin 500mg', genericName: 'Azithromycin', brand: 'Azithral', manufacturer: 'Alembic Pharma', category: 'Prescription Medicines', form: 'Tablet', mrp: 150, price: 120, rx: true, stock: 8 },
    { name: 'Hand Sanitizer 500ml', genericName: 'Ethanol', brand: 'LifeCare', manufacturer: 'LifeCare Wellness', category: 'Personal Care', form: 'Liquid', mrp: 199, price: 149, rx: false, stock: 60 },
    { name: 'Dolo 650mg', genericName: 'Paracetamol', brand: 'Dolo', manufacturer: 'Micro Labs', category: 'OTC Medicines', form: 'Tablet', mrp: 32, price: 28, rx: false, stock: 300 },
    { name: 'Benadryl Cough Syrup', genericName: 'Diphenhydramine', brand: 'Benadryl', manufacturer: 'Pfizer', category: 'OTC Medicines', form: 'Syrup', mrp: 110, price: 89, rx: false, stock: 55 },
    { name: 'Ascoril LS Syrup', genericName: 'Ambroxol + Levosalbutamol', brand: 'Ascoril', manufacturer: 'Glenmark', category: 'Prescription Medicines', form: 'Syrup', mrp: 145, price: 118, rx: true, stock: 40 },
    { name: 'Insulin Actrapid', genericName: 'Human Insulin', brand: 'Actrapid', manufacturer: 'Novo Nordisk', category: 'Prescription Medicines', form: 'Injection', mrp: 350, price: 299, rx: true, stock: 25 },
    { name: 'Ceftriaxone 1g Injection', genericName: 'Ceftriaxone', brand: 'Monocef', manufacturer: 'Aristo Pharma', category: 'Prescription Medicines', form: 'Injection', mrp: 85, price: 72, rx: true, stock: 0 },
    { name: 'Becosules Capsules', genericName: 'B-Complex + Vitamin C', brand: 'Becosules', manufacturer: 'Pfizer', category: 'Vitamins & Supplements', form: 'Capsule', mrp: 65, price: 52, rx: false, stock: 150 },
    { name: 'Zincovit Tablets', genericName: 'Multivitamin + Zinc', brand: 'Zincovit', manufacturer: 'Apex Labs', category: 'Vitamins & Supplements', form: 'Tablet', mrp: 95, price: 78, rx: false, stock: 110 },
    { name: 'Volini Pain Relief Spray', genericName: 'Diclofenac', brand: 'Volini', manufacturer: 'Sanofi', category: 'OTC Medicines', form: 'Liquid', mrp: 180, price: 149, rx: false, stock: 35 },
    { name: 'Telma 40mg', genericName: 'Telmisartan', brand: 'Telma', manufacturer: 'Glenmark', category: 'Prescription Medicines', form: 'Tablet', mrp: 180, price: 145, rx: true, stock: 70 },
    { name: 'ORS Rehydration Powder', genericName: 'Oral Rehydration Salts', brand: 'Electral', manufacturer: 'FDC Ltd', category: 'OTC Medicines', form: 'Sachet', mrp: 22, price: 18, rx: false, stock: 500 },
    { name: 'Cetaphil Gentle Skin Cleanser', genericName: 'Cetyl Alcohol + Propylene Glycol', brand: 'Cetaphil', manufacturer: 'Galderma', category: 'Skin Care', form: 'Liquid', mrp: 549, price: 459, rx: false, stock: 85 },
    { name: 'Lakme Sun Expert SPF 50', genericName: 'Avobenzone + Octinoxate', brand: 'Lakme', manufacturer: 'Hindustan Unilever', category: 'Skin Care', form: 'Liquid', mrp: 299, price: 249, rx: false, stock: 120 },
    { name: 'Neutrogena Hydro Boost Gel', genericName: 'Hyaluronic Acid', brand: 'Neutrogena', manufacturer: 'Johnson & Johnson', category: 'Skin Care', form: 'Liquid', mrp: 899, price: 749, rx: false, stock: 65 },
    { name: 'Boroline Antiseptic Cream', genericName: 'Boric Acid + Zinc Oxide', brand: 'Boroline', manufacturer: 'GD Pharmaceuticals', category: 'Skin Care', form: 'Liquid', mrp: 45, price: 38, rx: false, stock: 200 },
    { name: 'Himalaya Purifying Neem Face Wash', genericName: 'Neem + Turmeric', brand: 'Himalaya', manufacturer: 'Himalaya Wellness', category: 'Skin Care', form: 'Liquid', mrp: 180, price: 149, rx: false, stock: 95 },
    { name: 'Nivea Soft Light Moisturiser', genericName: 'Vitamin E + Jojoba Oil', brand: 'Nivea', manufacturer: 'Beiersdorf', category: 'Skin Care', form: 'Liquid', mrp: 320, price: 269, rx: false, stock: 110 },
    { name: 'Sebamed Clear Face Gel', genericName: 'Hyaluronic Acid + Aloe', brand: 'Sebamed', manufacturer: 'Sebapharma', category: 'Skin Care', form: 'Liquid', mrp: 650, price: 549, rx: false, stock: 48 },
    { name: 'Vaseline Healthy Bright Lotion', genericName: 'Niacinamide + SPF', brand: 'Vaseline', manufacturer: 'Hindustan Unilever', category: 'Skin Care', form: 'Liquid', mrp: 425, price: 359, rx: false, stock: 75 },
    { name: 'Acne-Aid Cleansing Soap', genericName: 'Sulphur + Resorcinol', brand: 'Acne-Aid', manufacturer: 'Stiefel', category: 'Skin Care', form: 'Liquid', mrp: 165, price: 139, rx: false, stock: 90 },
    { name: 'Aloe Vera Soothing Gel 100g', genericName: 'Aloe Barbadensis', brand: 'LifeCare', manufacturer: 'LifeCare Wellness', category: 'Skin Care', form: 'Liquid', mrp: 199, price: 159, rx: false, stock: 140 },
    { name: 'Mamaearth Vitamin C Face Serum', genericName: 'Vitamin C + Turmeric', brand: 'Mamaearth', manufacturer: 'Honasa Consumer', category: 'Skin Care', form: 'Liquid', mrp: 599, price: 499, rx: false, stock: 55 },
  ];

  for (const med of medicines) {
    const packSize =
      med.form === 'Tablet' || med.form === 'Capsule'
        ? '10 count'
        : med.form === 'Syrup'
          ? '100 ml'
          : med.form === 'Injection'
            ? '1 vial'
            : med.form === 'Sachet'
              ? '1 sachet'
              : '1 unit';

    await Medicine.findOneAndUpdate(
      { name: med.name, pharmacyId: pharmacy!._id },
      {
        name: med.name,
        genericName: med.genericName,
        brand: med.brand,
        manufacturer: med.manufacturer,
        category: med.category,
        form: med.form,
        strength: med.name.match(/\d+\s*\w+/)?.[0] || '',
        packSize,
        composition: med.genericName,
        uses: 'As directed by physician',
        prescriptionRequired: med.rx,
        pricing: { mrp: med.mrp, sellingPrice: med.price, discount: Math.round(((med.mrp - med.price) / med.mrp) * 100) },
        stock: med.stock,
        pharmacyId: pharmacy!._id,
        rating: 4 + Math.random() * 0.8,
        reviewCount: Math.floor(Math.random() * 80) + 5,
        isActive: true,
      },
      { upsert: true, new: true }
    );
  }

  // Coupon
  await Coupon.findOneAndUpdate(
    { code: 'WELCOME10' },
    {
      code: 'WELCOME10',
      description: '10% off on first consultation',
      discountType: 'percentage',
      discountValue: 10,
      maxDiscount: 200,
      minOrderValue: 300,
      applicableOn: 'consultation',
      validFrom: new Date(),
      validTill: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      usageLimit: 1000,
      isActive: true,
    },
    { upsert: true, new: true }
  );

  // Patient wallet
  await User.findOneAndUpdate(
    { email: 'patient@demo.com' },
    {
      $set: {
        'wallet.balance': 2500,
        'wallet.transactions': [
          { type: 'credit', amount: 3000, description: 'Wallet top-up', timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          { type: 'debit', amount: 500, description: 'Consultation payment', timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
        ],
      },
    }
  );

  const patient = await User.findOne({ email: 'patient@demo.com' });
  const doctor = await User.findOne({ email: 'dr.sharma@lifecare.com' });

  if (patient && doctor) {
    // Sample reviews
    await Review.deleteMany({ reviewedBy: patient._id });
    const reviewSamples = [
      { rating: 5, review: 'Excellent doctor. Very thorough and caring. Highly recommend!', daysAgo: 3 },
      { rating: 5, review: 'Explained everything clearly. Consultation was on time.', daysAgo: 12 },
      { rating: 4, review: 'Good experience overall. Wait time was a bit long.', daysAgo: 25 },
      { rating: 5, review: 'Very knowledgeable and patient with all my questions.', daysAgo: 40 },
      { rating: 4, review: 'Professional and friendly. Would visit again.', daysAgo: 55 },
      { rating: 5, review: 'Best specialist I have consulted. Treatment worked well.', daysAgo: 70 },
      { rating: 3, review: 'Decent consultation but parking at clinic was difficult.', daysAgo: 90 },
      { rating: 5, review: 'Caring approach and follow-up was appreciated.', daysAgo: 110 },
    ];
    await Review.create(
      reviewSamples.map((r) => ({
        reviewType: 'doctor',
        reviewFor: doctor._id,
        reviewedBy: patient._id,
        rating: r.rating,
        review: r.review,
        isVerified: true,
        status: 'approved',
        createdAt: new Date(Date.now() - r.daysAgo * 24 * 60 * 60 * 1000),
      }))
    );

    // Sample health records
    await HealthRecord.deleteMany({ patientId: patient._id });
    await HealthRecord.create([
      {
        patientId: patient._id,
        recordType: 'lab-report',
        title: 'Complete Blood Count',
        description: 'Annual health checkup CBC report',
        date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        tags: ['blood', 'annual'],
        files: [{ fileName: 'cbc-report.pdf', fileUrl: '/uploads/sample-cbc.pdf', fileType: 'application/pdf', uploadedAt: new Date() }],
      },
      {
        patientId: patient._id,
        recordType: 'vaccination',
        title: 'COVID-19 Vaccination Certificate',
        description: 'Booster dose certificate',
        date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        tags: ['vaccination', 'covid'],
        files: [{ fileName: 'vaccine-cert.pdf', fileUrl: '/uploads/sample-vaccine.pdf', fileType: 'application/pdf', uploadedAt: new Date() }],
      },
    ]);

    // Sample notifications
    await Notification.deleteMany({ userId: patient._id });
    await Notification.create([
      {
        userId: patient._id,
        type: 'appointment',
        title: 'Appointment Reminder',
        message: 'Your consultation with Dr. Sharma is tomorrow at 10:00 AM',
        isRead: false,
        sentAt: new Date(),
      },
      {
        userId: patient._id,
        type: 'promotional',
        title: 'Health Checkup Offer',
        message: 'Get 20% off on full body checkup this month!',
        isRead: true,
        sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        readAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ]);
  }

  await ensureInterviewDemoAppointment();

  console.log('Database seeded successfully!');
  console.log('\nDemo credentials (password: Password@123):');
  console.log('  Admin:    admin@lifecare.com');
  console.log('  Patient:  patient@demo.com');
  console.log('  Doctor:   dr.sharma@lifecare.com');
  console.log('  Pharmacy: pharmacy@lifecare.com');
  console.log('  Ambulance: ambulance@lifecare.com');
};

type SeedMedicine = {
  name: string;
  genericName: string;
  brand: string;
  manufacturer: string;
  category: string;
  form: string;
  mrp: number;
  price: number;
  rx: boolean;
  stock: number;
};

const SKIN_CARE_MEDICINES: SeedMedicine[] = [
  { name: 'Cetaphil Gentle Skin Cleanser', genericName: 'Cetyl Alcohol + Propylene Glycol', brand: 'Cetaphil', manufacturer: 'Galderma', category: 'Skin Care', form: 'Liquid', mrp: 549, price: 459, rx: false, stock: 85 },
  { name: 'Lakme Sun Expert SPF 50', genericName: 'Avobenzone + Octinoxate', brand: 'Lakme', manufacturer: 'Hindustan Unilever', category: 'Skin Care', form: 'Liquid', mrp: 299, price: 249, rx: false, stock: 120 },
  { name: 'Neutrogena Hydro Boost Gel', genericName: 'Hyaluronic Acid', brand: 'Neutrogena', manufacturer: 'Johnson & Johnson', category: 'Skin Care', form: 'Liquid', mrp: 899, price: 749, rx: false, stock: 65 },
  { name: 'Boroline Antiseptic Cream', genericName: 'Boric Acid + Zinc Oxide', brand: 'Boroline', manufacturer: 'GD Pharmaceuticals', category: 'Skin Care', form: 'Liquid', mrp: 45, price: 38, rx: false, stock: 200 },
  { name: 'Himalaya Purifying Neem Face Wash', genericName: 'Neem + Turmeric', brand: 'Himalaya', manufacturer: 'Himalaya Wellness', category: 'Skin Care', form: 'Liquid', mrp: 180, price: 149, rx: false, stock: 95 },
  { name: 'Nivea Soft Light Moisturiser', genericName: 'Vitamin E + Jojoba Oil', brand: 'Nivea', manufacturer: 'Beiersdorf', category: 'Skin Care', form: 'Liquid', mrp: 320, price: 269, rx: false, stock: 110 },
  { name: 'Sebamed Clear Face Gel', genericName: 'Hyaluronic Acid + Aloe', brand: 'Sebamed', manufacturer: 'Sebapharma', category: 'Skin Care', form: 'Liquid', mrp: 650, price: 549, rx: false, stock: 48 },
  { name: 'Vaseline Healthy Bright Lotion', genericName: 'Niacinamide + SPF', brand: 'Vaseline', manufacturer: 'Hindustan Unilever', category: 'Skin Care', form: 'Liquid', mrp: 425, price: 359, rx: false, stock: 75 },
  { name: 'Acne-Aid Cleansing Soap', genericName: 'Sulphur + Resorcinol', brand: 'Acne-Aid', manufacturer: 'Stiefel', category: 'Skin Care', form: 'Liquid', mrp: 165, price: 139, rx: false, stock: 90 },
  { name: 'Aloe Vera Soothing Gel 100g', genericName: 'Aloe Barbadensis', brand: 'LifeCare', manufacturer: 'LifeCare Wellness', category: 'Skin Care', form: 'Liquid', mrp: 199, price: 159, rx: false, stock: 140 },
  { name: 'Mamaearth Vitamin C Face Serum', genericName: 'Vitamin C + Turmeric', brand: 'Mamaearth', manufacturer: 'Honasa Consumer', category: 'Skin Care', form: 'Liquid', mrp: 599, price: 499, rx: false, stock: 55 },
];

async function upsertMedicineCatalog(pharmacyId: { _id: unknown }, med: SeedMedicine) {
  const packSize =
    med.form === 'Tablet' || med.form === 'Capsule'
      ? '10 count'
      : med.form === 'Syrup'
        ? '100 ml'
        : med.form === 'Injection'
          ? '1 vial'
          : med.form === 'Sachet'
            ? '1 sachet'
            : '100 ml';

  await Medicine.findOneAndUpdate(
    { name: med.name, pharmacyId: pharmacyId._id },
    {
      name: med.name,
      genericName: med.genericName,
      brand: med.brand,
      manufacturer: med.manufacturer,
      category: med.category,
      form: med.form,
      strength: med.name.match(/\d+\s*\w+/)?.[0] || '',
      packSize,
      composition: med.genericName,
      uses: med.category === 'Skin Care' ? 'For external use on skin as directed' : 'As directed by physician',
      prescriptionRequired: med.rx,
      pricing: {
        mrp: med.mrp,
        sellingPrice: med.price,
        discount: Math.round(((med.mrp - med.price) / med.mrp) * 100),
      },
      stock: med.stock,
      pharmacyId: pharmacyId._id,
      rating: 4.2,
      reviewCount: 24,
      isActive: true,
    },
    { upsert: true, new: true }
  );
}

/** Upserts skin-care catalog without a full re-seed (live demo deploys). */
export async function ensureSkinCareMedicines() {
  const pharmacy = await User.findOne({ email: 'pharmacy@lifecare.com' });
  if (!pharmacy) return;
  for (const med of SKIN_CARE_MEDICINES) {
    await upsertMedicineCatalog(pharmacy, med);
  }
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);

if (isMain) {
  connectDB()
    .then(runSeed)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
