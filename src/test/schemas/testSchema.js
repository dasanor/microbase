module.exports = {
  type: 'object',
  properties: {
    cartId: {
      type: 'string'
    },
    firstName: {
      type: 'string'
    },
    lastName: {
      type: 'string'
    }
  },
  required: [
    'cartId',
    'firstName',
    'lastName'
  ],
  additionalProperties: true
};