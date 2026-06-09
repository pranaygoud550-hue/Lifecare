/** Reusable OpenAPI component schemas for LifeCare+ API docs. */
export const schemas = {
  ApiSuccess: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
    },
    required: ['success'],
  },
  ApiError: {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string' },
    },
    required: ['success', 'message'],
  },
  User: {
    type: 'object',
    properties: {
      _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
      email: { type: 'string', format: 'email', example: 'patient@demo.com' },
      phone: { type: 'string', example: '9876543210' },
      userType: {
        type: 'string',
        enum: ['patient', 'doctor', 'pharmacy', 'ambulance', 'admin'],
      },
      profile: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          gender: { type: 'string' },
          dateOfBirth: { type: 'string', format: 'date' },
        },
      },
      isVerified: { type: 'boolean' },
    },
  },
  AuthTokens: {
    type: 'object',
    properties: {
      user: { $ref: '#/components/schemas/User' },
      accessToken: {
        type: 'string',
        description: 'JWT access token — paste into Authorize for protected endpoints',
      },
      refreshToken: { type: 'string' },
    },
  },
  Appointment: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      doctorId: { type: 'string' },
      patientId: { type: 'string' },
      consultationType: {
        type: 'string',
        enum: ['video', 'audio', 'chat', 'homeVisit'],
      },
      scheduledDate: { type: 'string', format: 'date' },
      scheduledTime: { type: 'string', example: '10:30' },
      status: {
        type: 'string',
        enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'rejected'],
      },
      paymentStatus: { type: 'string', enum: ['pending', 'paid', 'refunded'] },
      chiefComplaint: { type: 'string' },
    },
  },
  EmergencyRequest: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      status: {
        type: 'string',
        enum: ['searching', 'dispatched', 'en-route', 'arrived', 'completed', 'cancelled'],
      },
      emergencyType: { type: 'string', enum: ['cardiac', 'accident', 'breathing', 'other'] },
      patientLat: { type: 'number' },
      patientLng: { type: 'number' },
      ambulanceId: { type: 'string', nullable: true },
      pickupOtp: { type: 'string', description: '4-digit OTP shown to patient when ambulance arrives' },
      otpVerified: { type: 'boolean' },
    },
  },
  Medicine: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      name: { type: 'string', example: 'Paracetamol 500mg' },
      category: { type: 'string' },
      price: { type: 'number', example: 45 },
      stock: { type: 'integer' },
      form: { type: 'string', example: 'tablet' },
    },
  },
  PharmacyOrder: {
    type: 'object',
    properties: {
      _id: { type: 'string' },
      orderNumber: { type: 'string' },
      status: {
        type: 'string',
        enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
      },
      totalAmount: { type: 'number' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            medicineId: { type: 'string' },
            quantity: { type: 'integer' },
            price: { type: 'number' },
          },
        },
      },
    },
  },
  PaymentIntent: {
    type: 'object',
    properties: {
      clientSecret: { type: 'string' },
      paymentIntentId: { type: 'string' },
      amount: { type: 'number' },
      currency: { type: 'string', example: 'inr' },
    },
  },
} as const;
