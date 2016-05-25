function mathService(base) {

  const add = {
    name: 'sum',
    path: '',
    handler: (msg, reply) => {
      var sum = msg.left + msg.right;
      return reply({ answer: sum, host: process.env.HOSTNAME });
    }
  };

  const multiply = {
    name: 'multiply',
    handler: (msg, reply) => {
      var sum = msg.left * msg.right;
      return reply({ answer: sum, host: process.env.HOSTNAME });
    }
  };

  const divide = {
    name: 'divide',
    handler: (msg, reply) => {
      var sum = msg.left / msg.right;
      return reply({ answer: sum, host: process.env.HOSTNAME });
    }
  };

  return [
    add,
    multiply,
    divide
  ];
}

module.exports = mathService;