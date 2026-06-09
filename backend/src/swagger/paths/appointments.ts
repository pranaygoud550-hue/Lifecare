import { bearerSecurity, errorResponses, jsonBody, okResponse } from '../helpers.js';

const authErrors = {
  401: errorResponses.Unauthorized,
  403: errorResponses.Forbidden,
};

export const appointmentPaths = {
  '/api/appointments/book': {
    post: {
      tags: ['Appointments'],
      summary: 'Book a consultation',
      description: '**Auth required** · Role: `patient`',
      security: bearerSecurity,
      requestBody: jsonBody({
        type: 'object',
        required: ['doctorId', 'consultationType', 'scheduledDate', 'scheduledTime'],
        properties: {
          doctorId: { type: 'string', example: '507f1f77bcf86cd799439011' },
          consultationType: {
            type: 'string',
            enum: ['video', 'audio', 'chat', 'homeVisit'],
          },
          scheduledDate: { type: 'string', format: 'date', example: '2026-06-15' },
          scheduledTime: { type: 'string', example: '10:30' },
          chiefComplaint: { type: 'string' },
          patientNotes: { type: 'string' },
          homeVisitAddress: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              pincode: { type: 'string' },
              coordinates: {
                type: 'object',
                properties: { lat: { type: 'number' }, lng: { type: 'number' } },
              },
            },
          },
        },
      }),
      responses: {
        201: okResponse({ $ref: '#/components/schemas/Appointment' }),
        400: errorResponses.BadRequest,
        ...authErrors,
      },
    },
  },
  '/api/appointments': {
    get: {
      tags: ['Appointments'],
      summary: 'List appointments for current user',
      description: '**Auth required** · Returns appointments for the authenticated patient or doctor.',
      security: bearerSecurity,
      parameters: [
        { name: 'status', in: 'query', schema: { type: 'string' } },
        { name: 'page', in: 'query', schema: { type: 'string', pattern: '^\\d+$' } },
        { name: 'limit', in: 'query', schema: { type: 'string', pattern: '^\\d+$' } },
      ],
      responses: {
        200: okResponse({
          type: 'object',
          properties: {
            appointments: {
              type: 'array',
              items: { $ref: '#/components/schemas/Appointment' },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
              },
            },
          },
        }),
        ...authErrors,
      },
    },
  },
  '/api/appointments/{id}': {
    get: {
      tags: ['Appointments'],
      summary: 'Get appointment by ID',
      description: '**Auth required**',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: okResponse({ $ref: '#/components/schemas/Appointment' }),
        404: errorResponses.NotFound,
        ...authErrors,
      },
    },
  },
  '/api/appointments/{id}/payment-intent': {
    post: {
      tags: ['Appointments'],
      summary: 'Create Stripe payment intent for appointment',
      description: '**Auth required** · Role: `patient`',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: okResponse({ $ref: '#/components/schemas/PaymentIntent' }),
        ...authErrors,
      },
    },
  },
  '/api/appointments/{id}/pay': {
    post: {
      tags: ['Appointments'],
      summary: 'Confirm appointment payment',
      description: '**Auth required** · Role: `patient` · Pay via wallet, card, or clinic.',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: jsonBody({
        type: 'object',
        required: ['method'],
        properties: {
          method: { type: 'string', enum: ['wallet', 'card', 'clinic'] },
          paymentIntentId: { type: 'string' },
        },
      }),
      responses: {
        200: okResponse({ $ref: '#/components/schemas/Appointment' }),
        ...authErrors,
      },
    },
  },
  '/api/appointments/{id}/accept': {
    put: {
      tags: ['Appointments'],
      summary: 'Accept appointment (doctor)',
      description: '**Auth required** · Role: `doctor`',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: okResponse({ $ref: '#/components/schemas/Appointment' }),
        ...authErrors,
      },
    },
  },
  '/api/appointments/{id}/reject': {
    put: {
      tags: ['Appointments'],
      summary: 'Reject appointment (doctor)',
      description: '**Auth required** · Role: `doctor`',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: jsonBody({
        type: 'object',
        properties: { reason: { type: 'string' } },
      }),
      responses: {
        200: okResponse({ $ref: '#/components/schemas/Appointment' }),
        ...authErrors,
      },
    },
  },
  '/api/appointments/{id}/cancel': {
    put: {
      tags: ['Appointments'],
      summary: 'Cancel appointment',
      description: '**Auth required** · Role: `patient` or `admin`',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: jsonBody(
        {
          type: 'object',
          properties: { reason: { type: 'string' } },
        },
        false
      ),
      responses: {
        200: okResponse({ $ref: '#/components/schemas/Appointment' }),
        ...authErrors,
      },
    },
  },
  '/api/appointments/{id}/join': {
    post: {
      tags: ['Appointments'],
      summary: 'Join video/audio consultation',
      description: '**Auth required** · Role: `patient` or `doctor` · Requires paid appointment.',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: okResponse({
          type: 'object',
          properties: {
            roomId: { type: 'string' },
            token: { type: 'string' },
            appointment: { $ref: '#/components/schemas/Appointment' },
          },
        }),
        ...authErrors,
      },
    },
  },
  '/api/appointments/{id}/complete': {
    post: {
      tags: ['Appointments'],
      summary: 'Mark consultation complete',
      description: '**Auth required** · Role: `doctor`',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: okResponse({ $ref: '#/components/schemas/Appointment' }),
        ...authErrors,
      },
    },
  },
  '/api/appointments/{id}/rate': {
    post: {
      tags: ['Appointments'],
      summary: 'Rate completed appointment',
      description: '**Auth required** · Role: `patient`',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      requestBody: jsonBody({
        type: 'object',
        required: ['score'],
        properties: {
          score: { type: 'number', minimum: 1, maximum: 5 },
          review: { type: 'string' },
        },
      }),
      responses: {
        201: okResponse({ type: 'object' }),
        ...authErrors,
      },
    },
  },
};
