import { bearerSecurity, errorResponses, jsonBody, messageResponse, okResponse } from '../helpers.js';

const standardErrors = {
  400: errorResponses.BadRequest,
  401: errorResponses.Unauthorized,
};

export const authPaths = {
  '/api/auth/register': {
    post: {
      tags: ['Auth'],
      summary: 'Register a new user with OTP',
      description: 'Creates an account after phone OTP verification. Sets auth cookies and returns JWT tokens.',
      security: [],
      requestBody: jsonBody({
        type: 'object',
        required: ['userType', 'phone', 'firstName', 'lastName', 'otp'],
        properties: {
          userType: {
            type: 'string',
            enum: ['patient', 'doctor', 'pharmacy', 'ambulance'],
          },
          phone: { type: 'string', example: '9876543210' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          otp: { type: 'string', minLength: 6, maxLength: 6 },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          gender: { type: 'string' },
          dateOfBirth: { type: 'string', format: 'date' },
        },
      }),
      responses: {
        201: okResponse({ $ref: '#/components/schemas/AuthTokens' }, 'User registered'),
        ...standardErrors,
      },
    },
  },
  '/api/auth/send-otp': {
    post: {
      tags: ['Auth'],
      summary: 'Send OTP to phone',
      security: [],
      requestBody: jsonBody({
        type: 'object',
        required: ['phone', 'purpose'],
        properties: {
          phone: { type: 'string', example: '9876543210' },
          purpose: { type: 'string', enum: ['login', 'register'] },
        },
      }),
      responses: {
        200: okResponse({
          type: 'object',
          properties: {
            message: { type: 'string' },
            expiresIn: { type: 'integer' },
          },
        }),
        ...standardErrors,
      },
    },
  },
  '/api/auth/login': {
    post: {
      tags: ['Auth'],
      summary: 'Login with email and password',
      description:
        'Returns `accessToken` in the response body. Click **Authorize**, paste `Bearer <accessToken>`, then use **Try it out** on protected routes.',
      security: [],
      requestBody: jsonBody({
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'patient@demo.com' },
          password: { type: 'string', example: 'Password@123' },
        },
      }),
      responses: {
        200: okResponse({ $ref: '#/components/schemas/AuthTokens' }),
        401: errorResponses.Unauthorized,
      },
    },
  },
  '/api/auth/login-otp': {
    post: {
      tags: ['Auth'],
      summary: 'Login with phone OTP',
      security: [],
      requestBody: jsonBody({
        type: 'object',
        required: ['phone', 'otp'],
        properties: {
          phone: { type: 'string', example: '9876543210' },
          otp: { type: 'string', minLength: 6, maxLength: 6 },
        },
      }),
      responses: {
        200: okResponse({ $ref: '#/components/schemas/AuthTokens' }),
        401: errorResponses.Unauthorized,
      },
    },
  },
  '/api/auth/demo-login': {
    post: {
      tags: ['Auth'],
      summary: 'Quick demo login (development)',
      description: 'Logs in a seeded demo patient by phone. Default phone: `9876543210`.',
      security: [],
      requestBody: jsonBody(
        {
          type: 'object',
          properties: {
            phone: { type: 'string', example: '9876543210' },
          },
        },
        false
      ),
      responses: {
        200: okResponse({ $ref: '#/components/schemas/AuthTokens' }),
        401: errorResponses.Unauthorized,
      },
    },
  },
  '/api/auth/verify-email': {
    post: {
      tags: ['Auth'],
      summary: 'Verify phone OTP',
      security: [],
      requestBody: jsonBody({
        type: 'object',
        required: ['phone', 'otp'],
        properties: {
          phone: { type: 'string' },
          otp: { type: 'string', minLength: 6, maxLength: 6 },
        },
      }),
      responses: {
        200: okResponse({ type: 'object' }),
        ...standardErrors,
      },
    },
  },
  '/api/auth/refresh-token': {
    post: {
      tags: ['Auth'],
      summary: 'Refresh access token',
      description: 'Accepts refresh token from cookie or request body.',
      security: [],
      requestBody: jsonBody(
        {
          type: 'object',
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        false
      ),
      responses: {
        200: okResponse({
          type: 'object',
          properties: { message: { type: 'string', example: 'Token refreshed' } },
        }),
        401: errorResponses.Unauthorized,
      },
    },
  },
  '/api/auth/unlock-account': {
    post: {
      tags: ['Auth'],
      summary: 'Unlock locked account',
      security: [],
      requestBody: jsonBody({
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string', minLength: 32 },
        },
      }),
      responses: {
        200: messageResponse('Account unlocked'),
        ...standardErrors,
      },
    },
  },
  '/api/auth/logout': {
    post: {
      tags: ['Auth'],
      summary: 'Logout current session',
      security: bearerSecurity,
      responses: {
        200: messageResponse('Logged out'),
        401: errorResponses.Unauthorized,
      },
    },
  },
  '/api/auth/profile': {
    get: {
      tags: ['Auth'],
      summary: 'Get current user profile',
      security: bearerSecurity,
      responses: {
        200: okResponse({ $ref: '#/components/schemas/User' }),
        401: errorResponses.Unauthorized,
      },
    },
    put: {
      tags: ['Auth'],
      summary: 'Update current user profile',
      security: bearerSecurity,
      requestBody: jsonBody({
        type: 'object',
        properties: {
          profile: {
            type: 'object',
            properties: {
              firstName: { type: 'string' },
              lastName: { type: 'string' },
              gender: { type: 'string' },
              dateOfBirth: { type: 'string', format: 'date' },
            },
          },
        },
      }),
      responses: {
        200: okResponse({ $ref: '#/components/schemas/User' }),
        401: errorResponses.Unauthorized,
      },
    },
  },
};
