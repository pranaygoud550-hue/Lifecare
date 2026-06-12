import { bearerSecurity, errorResponses, jsonBody, okResponse } from '../helpers.js';

const authErrors = { 401: errorResponses.Unauthorized, 403: errorResponses.Forbidden };

export const navigationPaths = {
  '/api/navigation/route': {
    post: {
      tags: ['Navigation'],
      summary: 'Get driving route (Google Directions)',
      description: '**Auth required** · Returns polyline, steps, traffic ETA.',
      security: bearerSecurity,
      requestBody: jsonBody({
        type: 'object',
        required: ['originLat', 'originLng', 'destLat', 'destLng'],
        properties: {
          originLat: { type: 'number' },
          originLng: { type: 'number' },
          destLat: { type: 'number' },
          destLng: { type: 'number' },
          mode: { type: 'string', enum: ['driving', 'walking', 'ambulance'] },
        },
      }),
      responses: { 200: okResponse({ type: 'object' }), 503: errorResponses.NotFound, ...authErrors },
    },
  },
  '/api/navigation/eta': {
    get: {
      tags: ['Navigation'],
      summary: 'Live navigation ETA for emergency',
      security: bearerSecurity,
      parameters: [{ name: 'requestId', in: 'query', required: true, schema: { type: 'string' } }],
      responses: { 200: okResponse({ type: 'object' }), ...authErrors },
    },
  },
};
