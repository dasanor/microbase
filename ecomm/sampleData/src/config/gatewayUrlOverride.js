function gatewayUrlOverrride(/* base */) {
  const urls = {
    stock: 'http://localhost:3000',
    cart: 'http://localhost:3001',
    catalog: 'http://localhost:3002'
  };
  return (serviceName /* , serviceVersion, operationName */) => urls[serviceName];
}

module.exports = gatewayUrlOverrride;
