import { bearerSecurity, errorResponses, jsonBody, okResponse } from '../helpers.js';

const authErrors = {
  401: errorResponses.Unauthorized,
  403: errorResponses.Forbidden,
};

export const paymentPaths = {
  '/api/payments/config': {
    get: {
      tags: ['Payments'],
      summary: 'Get Stripe publishable key',
      description: '**Auth required**',
      security: bearerSecurity,
      responses: {
        200: okResponse({
          type: 'object',
          properties: {
            publishableKey: { type: 'string' },
            currency: { type: 'string', example: 'inr' },
          },
        }),
        401: errorResponses.Unauthorized,
      },
    },
  },
  '/api/payments/create-intent': {
    post: {
      tags: ['Payments'],
      summary: 'Create Stripe payment intent',
      description: '**Auth required** · Role: `patient` or `admin`',
      security: bearerSecurity,
      requestBody: jsonBody({
        type: 'object',
        required: ['amount'],
        properties: {
          amount: { type: 'number', example: 500, description: 'Amount in INR' },
          currency: { type: 'string', example: 'inr', minLength: 3, maxLength: 3 },
          metadata: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
        },
      }),
      responses: {
        200: okResponse({ $ref: '#/components/schemas/PaymentIntent' }),
        400: errorResponses.BadRequest,
        ...authErrors,
      },
    },
  },
  '/api/payments/verify': {
    post: {
      tags: ['Payments'],
      summary: 'Verify completed payment',
      description: '**Auth required** · Role: `patient` or `admin`',
      security: bearerSecurity,
      requestBody: jsonBody({
        type: 'object',
        required: ['paymentIntentId', 'type', 'referenceId'],
        properties: {
          paymentIntentId: { type: 'string' },
          type: { type: 'string', enum: ['appointment', 'order', 'ambulance'] },
          referenceId: { type: 'string' },
        },
      }),
      responses: {
        200: okResponse({ type: 'object' }),
        400: errorResponses.BadRequest,
        ...authErrors,
      },
    },
  },
  '/api/payments/apply-coupon': {
    post: {
      tags: ['Payments'],
      summary: 'Apply discount coupon',
      description: '**Auth required** · Role: `patient` or `admin`',
      security: bearerSecurity,
      requestBody: jsonBody({
        type: 'object',
        required: ['code', 'orderAmount'],
        properties: {
          code: { type: 'string', example: 'HEALTH10' },
          orderAmount: { type: 'number', example: 1000 },
          applicableOn: { type: 'string' },
        },
      }),
      responses: {
        200: okResponse({
          type: 'object',
          properties: {
            discount: { type: 'number' },
            finalAmount: { type: 'number' },
            coupon: { type: 'object' },
          },
        }),
        400: errorResponses.BadRequest,
        ...authErrors,
      },
    },
  },
};
