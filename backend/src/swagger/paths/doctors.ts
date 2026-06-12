import { bearerSecurity, errorResponses, jsonBody, okResponse } from '../helpers.js';

const authErrors = { 401: errorResponses.Unauthorized, 403: errorResponses.Forbidden };

export const doctorExtraPaths = {
  '/api/doctors/me/availability': {
    get: {
      tags: ['Doctors'],
      summary: 'Get my weekly availability',
      security: bearerSecurity,
      responses: { 200: okResponse({ type: 'array', items: { type: 'object' } }), ...authErrors },
    },
    patch: {
      tags: ['Doctors'],
      summary: 'Update weekly availability schedule',
      security: bearerSecurity,
      requestBody: jsonBody({
        type: 'object',
        properties: {
          availability: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                day: { type: 'string' },
                slots: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      startTime: { type: 'string', example: '09:00' },
                      endTime: { type: 'string', example: '18:00' },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      responses: { 200: okResponse({ type: 'array', items: { type: 'object' } }), ...authErrors },
    },
  },
  '/api/doctors/patients/{patientId}/vitals': {
    get: {
      tags: ['Doctors'],
      summary: 'Patient vitals for consultation',
      description: 'Doctor must have an appointment with the patient.',
      security: bearerSecurity,
      parameters: [
        { name: 'patientId', in: 'path', required: true, schema: { type: 'string' } },
        { name: 'days', in: 'query', schema: { type: 'integer', default: 30 } },
      ],
      responses: { 200: okResponse({ type: 'object' }), ...authErrors },
    },
  },
};
