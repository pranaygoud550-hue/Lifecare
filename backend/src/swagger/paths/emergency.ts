import { bearerSecurity, errorResponses, jsonBody, okResponse } from '../helpers.js';

const authErrors = {
  401: errorResponses.Unauthorized,
  403: errorResponses.Forbidden,
};

export const emergencyPaths = {
  '/api/emergency/nearby-hospitals': {
    get: {
      tags: ['Emergency'],
      summary: 'Find nearby hospitals',
      description: 'Public endpoint — no authentication required.',
      security: [],
      parameters: [
        { name: 'lat', in: 'query', required: true, schema: { type: 'number', example: 19.076 } },
        { name: 'lng', in: 'query', required: true, schema: { type: 'number', example: 72.8777 } },
        {
          name: 'radius',
          in: 'query',
          schema: { type: 'number', default: 10, description: 'Search radius in km' },
        },
      ],
      responses: {
        200: okResponse({
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              name: { type: 'string' },
              address: { type: 'string' },
              distanceKm: { type: 'number' },
              coordinates: {
                type: 'object',
                properties: { lat: { type: 'number' }, lng: { type: 'number' } },
              },
            },
          },
        }),
        400: errorResponses.BadRequest,
      },
    },
  },
  '/api/emergency/sos': {
    post: {
      tags: ['Emergency'],
      summary: 'Trigger emergency SOS',
      description: '**Auth required** · Role: `patient` · Dispatches nearest available ambulance.',
      security: bearerSecurity,
      requestBody: jsonBody({
        type: 'object',
        required: ['patientLat', 'patientLng', 'emergencyType'],
        properties: {
          patientLat: { type: 'number', example: 19.076 },
          patientLng: { type: 'number', example: 72.8777 },
          emergencyType: {
            type: 'string',
            enum: ['cardiac', 'accident', 'breathing', 'other'],
          },
          patientId: { type: 'string' },
          userId: { type: 'string' },
        },
      }),
      responses: {
        201: okResponse({ $ref: '#/components/schemas/EmergencyRequest' }),
        400: errorResponses.BadRequest,
        ...authErrors,
      },
    },
  },
  '/api/emergency/requests/{id}/eta': {
    get: {
      tags: ['Emergency'],
      summary: 'Get ambulance ETA for request',
      description: '**Auth required**',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: okResponse({
          type: 'object',
          properties: {
            etaMinutes: { type: 'number' },
            distanceKm: { type: 'number' },
            status: { type: 'string' },
          },
        }),
        404: errorResponses.NotFound,
        ...authErrors,
      },
    },
  },
  '/api/emergency/requests/{id}/cancel': {
    put: {
      tags: ['Emergency'],
      summary: 'Cancel emergency request',
      description: '**Auth required** · Role: `patient` or `admin`',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: okResponse({ $ref: '#/components/schemas/EmergencyRequest' }),
        ...authErrors,
      },
    },
  },
  '/api/emergency/requests/{id}/verify-otp': {
    post: {
      tags: ['Emergency'],
      summary: 'Verify patient pickup OTP',
      description: '**Auth required** · Role: `ambulance` · Confirms patient identity at pickup.',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: okResponse({ $ref: '#/components/schemas/EmergencyRequest' }),
        ...authErrors,
      },
    },
  },
  '/api/emergency/ambulance/location': {
    patch: {
      tags: ['Emergency'],
      summary: 'Update ambulance GPS location',
      description: '**Auth required** · Role: `ambulance`',
      security: bearerSecurity,
      requestBody: jsonBody({
        type: 'object',
        required: ['lat', 'lng', 'ambulanceId'],
        properties: {
          lat: { type: 'number' },
          lng: { type: 'number' },
          ambulanceId: { type: 'string' },
        },
      }),
      responses: {
        200: okResponse({ type: 'object' }),
        ...authErrors,
      },
    },
  },
  '/api/emergency/driver/active-request': {
    get: {
      tags: ['Emergency'],
      summary: 'Get active dispatch for driver',
      description: '**Auth required** · Role: `ambulance`',
      security: bearerSecurity,
      responses: {
        200: okResponse({ $ref: '#/components/schemas/EmergencyRequest' }),
        ...authErrors,
      },
    },
  },
  '/api/emergency/driver/status': {
    patch: {
      tags: ['Emergency'],
      summary: 'Set driver availability',
      description: '**Auth required** · Role: `ambulance`',
      security: bearerSecurity,
      requestBody: jsonBody({
        type: 'object',
        required: ['isAvailable'],
        properties: {
          isAvailable: { type: 'boolean' },
        },
      }),
      responses: {
        200: okResponse({ type: 'object' }),
        ...authErrors,
      },
    },
  },
};
