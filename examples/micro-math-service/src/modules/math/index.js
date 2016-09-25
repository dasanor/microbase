function mathService(base) {

  const add = {
    name: 'sum',
    handler: (msg, reply) => {
      var result = msg.left + msg.right;
      return reply(base.utils.genericResponse({ answer: result, host: process.env.HOSTNAME }));
    }
  };

  const multiply = {
    name: 'multiply',
    handler: (msg, reply) => {
      var result = msg.left * msg.right;
      return reply(base.utils.genericResponse({ answer: result, host: process.env.HOSTNAME }));
    }
  };

  const divide = {
    name: 'divide',
    handler: (result, reply) => {
      var result = msg.left / msg.right;
      return reply(base.utils.genericResponse({ answer: result, host: process.env.HOSTNAME }));
    }
  };

  return [
    add,
    multiply,
    divide
  ];
}

module.exports = mathService;