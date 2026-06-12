import { bearerSecurity, errorResponses, okResponse } from '../helpers.js';

const authErrors = { 401: errorResponses.Unauthorized, 403: errorResponses.Forbidden };

export const reminderPaths = {
  '/api/reminders': {
    get: {
      tags: ['Reminders'],
      summary: 'List active medicine reminders',
      description: '**Auth required** · Role: `patient`',
      security: bearerSecurity,
      responses: { 200: okResponse({ type: 'array', items: { type: 'object' } }), ...authErrors },
    },
  },
  '/api/reminders/from-prescription/{prescriptionId}': {
    post: {
      tags: ['Reminders'],
      summary: 'Enable reminders from prescription',
      description: 'Parses medication frequency into daily reminder times.',
      security: bearerSecurity,
      parameters: [{ name: 'prescriptionId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 201: okResponse({ type: 'array', items: { type: 'object' } }), ...authErrors },
    },
  },
};
