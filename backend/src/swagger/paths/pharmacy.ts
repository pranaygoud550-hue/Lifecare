import { bearerSecurity, errorResponses, jsonBody, okResponse } from '../helpers.js';

const authErrors = {
  401: errorResponses.Unauthorized,
  403: errorResponses.Forbidden,
};

export const pharmacyPaths = {
  '/api/pharmacy/medicines': {
    get: {
      tags: ['Pharmacy'],
      summary: 'Browse medicine catalog',
      description: 'Public endpoint — no authentication required.',
      security: [],
      parameters: [
        { name: 'search', in: 'query', schema: { type: 'string' } },
        { name: 'category', in: 'query', schema: { type: 'string' } },
        { name: 'form', in: 'query', schema: { type: 'string' } },
        { name: 'sort', in: 'query', schema: { type: 'string' } },
        { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'] } },
        { name: 'page', in: 'query', schema: { type: 'string' } },
        { name: 'limit', in: 'query', schema: { type: 'string' } },
        { name: 'minPrice', in: 'query', schema: { type: 'string' } },
        { name: 'maxPrice', in: 'query', schema: { type: 'string' } },
      ],
      responses: {
        200: okResponse({
          type: 'object',
          properties: {
            medicines: {
              type: 'array',
              items: { $ref: '#/components/schemas/Medicine' },
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
      },
    },
  },
  '/api/pharmacy/medicines/{id}': {
    get: {
      tags: ['Pharmacy'],
      summary: 'Get medicine details',
      description: 'Public endpoint — no authentication required.',
      security: [],
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: okResponse({ $ref: '#/components/schemas/Medicine' }),
        404: errorResponses.NotFound,
      },
    },
  },
  '/api/pharmacy/orders': {
    post: {
      tags: ['Pharmacy'],
      summary: 'Place pharmacy order',
      description: '**Auth required** · Role: `patient` · Debits wallet when paymentMethod is wallet.',
      security: bearerSecurity,
      requestBody: jsonBody({
        type: 'object',
        required: ['items', 'deliveryAddress', 'paymentMethod'],
        properties: {
          items: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['medicineId', 'quantity'],
              properties: {
                medicineId: { type: 'string' },
                quantity: { type: 'integer', minimum: 1, maximum: 99 },
              },
            },
          },
          deliveryAddress: {
            type: 'object',
            required: ['name', 'phone', 'street', 'city', 'state', 'pincode'],
            properties: {
              name: { type: 'string' },
              phone: { type: 'string' },
              street: { type: 'string' },
              city: { type: 'string' },
              state: { type: 'string' },
              pincode: { type: 'string' },
            },
          },
          deliveryType: {
            type: 'string',
            enum: ['standard', 'express', 'same-day'],
            default: 'standard',
          },
          paymentMethod: { type: 'string', example: 'wallet' },
        },
      }),
      responses: {
        201: okResponse({ $ref: '#/components/schemas/PharmacyOrder' }),
        400: errorResponses.BadRequest,
        ...authErrors,
      },
    },
    get: {
      tags: ['Pharmacy'],
      summary: 'List patient orders',
      description: '**Auth required** · Role: `patient`',
      security: bearerSecurity,
      responses: {
        200: okResponse({
          type: 'array',
          items: { $ref: '#/components/schemas/PharmacyOrder' },
        }),
        ...authErrors,
      },
    },
  },
  '/api/pharmacy/orders/{id}': {
    get: {
      tags: ['Pharmacy'],
      summary: 'Get order by ID',
      description: '**Auth required** · Role: `patient`',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: okResponse({ $ref: '#/components/schemas/PharmacyOrder' }),
        404: errorResponses.NotFound,
        ...authErrors,
      },
    },
  },
  '/api/pharmacy/orders/{id}/cancel': {
    put: {
      tags: ['Pharmacy'],
      summary: 'Cancel pharmacy order',
      description: '**Auth required** · Role: `patient`',
      security: bearerSecurity,
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: okResponse({ $ref: '#/components/schemas/PharmacyOrder' }),
        ...authErrors,
      },
    },
  },
};
