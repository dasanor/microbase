// Helper to insert a Tax

function helpers(base) {

  const headers = base.config.get('gateway:defaultHeaders');

  const productMapBySku = new Map();
  const categoryMapByTitle = new Map();
  const timeout = 10000;

  const setProperty = function (obj, property, value, parent) {
    if (typeof parent == 'array') {
      parent[property] = value;
    } else {
      obj[property] = value;
    }
  };

  function productIdBySku(obj, property, sku, retryTimes, retryTimeout, parent) {
    const existingProduct = productMapBySku.get(sku);
    if (existingProduct) {
      setProperty(obj, property, existingProduct, parent);
      return Promise.resolve();
    }
    return base.services.call({
      name: 'catalog:product.list',
        headers: headers,
        timeout: timeout
    }, { sku: sku })
      .then((result) => {
        if (result.ok == false || result.data.length == 0) {
          if (retryTimes == 0) throw new Error(`Product not found '${sku}'`);
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(productIdBySku(obj, property, sku, retryTimes - 1, retryTimeout, parent));
            }, retryTimeout);
          })
        }
        productMapBySku.set(sku, result.data[0].id);
        setProperty(obj, property, result.data[0].id, parent);
      });
  }

  const categoryIdByTitle = function (obj, property, title, retryTimes, retryTimeout, parent) {
    const existingCategory = categoryMapByTitle.get(title);
    if (existingCategory) {
      setProperty(obj, property, existingCategory, parent);
      return Promise.resolve();
    }
    return base.services.call({
      name: 'catalog:category.list',
        headers: headers,
        timeout: timeout
    }, { title: title })
      .then(result => {
        if (result.ok == false || result.data.length == 0) {
          if (retryTimes == 0) throw new Error(`Category not found '${title}'`);
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(categoryIdByTitle(obj, property, title, retryTimes - 1, retryTimeout, parent));
            }, retryTimeout);
          })
        }
        categoryMapByTitle.set(title, result.data[0].id);
        setProperty(obj, property, result.data[0].id, parent);
      });
  };

  const allowedFunctions = {
    categoryIdByTitle: categoryIdByTitle,
    productIdBySku: productIdBySku
  };

  function handleFunction(promises, obj, property, value) {
    const mach = value.match(/^(\w*[^ ])\((.*)\)$/);
    if (mach) {
      if (allowedFunctions[mach[1]]) {
        promises.push(allowedFunctions[mach[1]](obj, property, mach[2], 3, 1000));
      } else {
        throw new Error(`Unrecognized function '${mach[0]}-${mach[1]}'`);
      }
    }
  }

  function handleFunctions(promises, obj, parent) {
    for (var property in obj) {
      if (obj.hasOwnProperty(property)) {
        if (typeof obj[property] == 'object') {
          handleFunctions(promises, obj[property], property);
        } else {
          if (typeof obj[property] == 'string') handleFunction(promises, obj, property, obj[property], parent);
        }
      }
    }
    return promises;
  }

  function insertTax(data) {
    return Promise.all(handleFunctions([], data))
      .then(() => {
        return base.services.call({
          name: 'cart:tax.create',
          headers: headers,
          timeout: timeout
        }, data);
      })
  }

  function insertCategory(data) {
    return Promise.all(handleFunctions([], data))
      .then(() => {
        return base.services.call({
          name: 'catalog:category.create',
          headers: headers,
          timeout: timeout
        }, data);
      })
  }

  function insertProduct(data) {
    return Promise.all(handleFunctions([], data))
      .then(() => {
        return base.services.call({
          name: 'catalog:product.create',
          headers: headers,
          timeout: timeout
        }, data);
      })
  }

  return {
    insertTax,
    insertCategory,
    insertProduct
  };
}

module.exports = helpers;
