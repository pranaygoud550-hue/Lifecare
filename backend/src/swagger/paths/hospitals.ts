import { bearerSecurity, errorResponses, okResponse } from '../helpers.js';

const authErrors = { 401: errorResponses.Unauthorized, 403: errorResponses.Forbidden };

export const hospitalPaths = {
  '/api/hospitals/nearby': {
    get: {
      tags: ['Hospitals'],
      summary: 'Nearby hospitals (Google Places)',
      description: 'Returns hospitals/clinics/pharmacies near lat/lng. Falls back to seeded DB without API key.',
      security: [],
      parameters: [
        { name: 'lat', in: 'query', required: true, schema: { type: 'number' } },
        { name: 'lng', in: 'query', required: true, schema: { type: 'number' } },
        { name: 'radius', in: 'query', schema: { type: 'number', default: 5 } },
        {
          name: 'type',
          in: 'query',
          schema: { type: 'string', enum: ['all', 'hospital', 'clinic', 'pharmacy', 'diagnostic'] },
        },
        { name: 'sort', in: 'query', schema: { type: 'string', enum: ['distance', 'rating', 'open'] } },
        { name: 'openNow', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
      ],
      responses: {
        200: okResponse({
          type: 'object',
          properties: {
            count: { type: 'number' },
            source: { type: 'string' },
            hospitals: { type: 'array', items: { type: 'object' } },
          },
        }),
      },
    },
  },
  '/api/hospitals/recommend': {
    get: {
      tags: ['Hospitals'],
      summary: 'Smart hospital recommendation (MediScan + Places)',
      description: '**Auth required** · Role: `patient` · Uses latest chest scan to rank hospitals.',
      security: bearerSecurity,
      parameters: [
        { name: 'lat', in: 'query', required: true, schema: { type: 'number' } },
        { name: 'lng', in: 'query', required: true, schema: { type: 'number' } },
        { name: 'radius', in: 'query', schema: { type: 'number', default: 15 } },
      ],
      responses: { 200: okResponse({ type: 'object' }), ...authErrors },
    },
  },
  '/api/hospitals/{id}': {
    get: {
      tags: ['Hospitals'],
      summary: 'Hospital or Google Place details',
      description: 'Pass Mongo `_id` or Google `place_id` (ChIJ…).',
      security: [],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 200: okResponse({ type: 'object' }), 404: errorResponses.NotFound },
    },
  },
};
