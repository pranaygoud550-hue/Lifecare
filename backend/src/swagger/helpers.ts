export const bearerSecurity = [{ bearerAuth: [] }];

type Schema = Record<string, unknown>;

export function jsonBody(schema: Schema, required = true) {
  return {
    required,
    content: {
      'application/json': { schema },
    },
  };
}

export function okResponse(dataSchema: Schema, description = 'Success') {
  return {
    description,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: dataSchema,
          },
        },
      },
    },
  };
}

export function messageResponse(description = 'Success') {
  return {
    description,
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
          },
        },
      },
    },
  };
}

export const errorResponses = {
  BadRequest: {
    description: 'Validation error',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
      },
    },
  },
  Unauthorized: {
    description: 'Authentication required or invalid token',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
      },
    },
  },
  Forbidden: {
    description: 'Insufficient role permissions',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
      },
    },
  },
  NotFound: {
    description: 'Resource not found',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/ApiError' },
      },
    },
  },
};
