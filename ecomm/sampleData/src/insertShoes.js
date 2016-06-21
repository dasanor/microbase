const base = require('micro-base')();
const parse = require('csv-parse');
const transform = require('stream-transform');
const fs = require('fs');
const slug = require('slugg');
const Wreck = require('wreck');
const DatabaseCleaner = require('database-cleaner');

const databaseCleaner = new DatabaseCleaner('mongodb');
const connect = require('mongodb').connect;
const headers = base.config.get('gateway:defaultHeaders');

const categoryMap = new Map();
const productsMap = new Map();

// TODO: get from parameters
const cleanDatabase = false;
const insertCategories = false;
const insertProducts = true;
const insertStocks = true;

const wreck = Wreck.defaults({
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Helper to clean the database
function initDB() {
  console.log(cleanDatabase ? 'Cleaning database' : 'Skipping database cleaning');
  if (!cleanDatabase) return Promise.resolve();
  return new Promise((resolve) => {
    connect(base.db.url, (err, db) => {
      databaseCleaner.clean(db, () => {
        console.log('Database cleaned');
        resolve();
      });
    });
  })
}

// Helper to insert a Category
function insertCategory(data) {
  if (!insertCategories) return;

  function save(data) {
    return base.services.call({
        name: 'catalog:createCategory',
        method: 'POST',
        path: '/category',
        headers: headers
      }, data)
      .then(category => {
        categoryMap.set(category.title, category);
        return category;
      });
  }

  return getCategoryByTitle(data.title)
    .then(category => {
      // If it already exist return it
      if (category) {
        return category;
      }
      // Convert parent id functions
      const mach = data.parent.match(/(\w*)\((.*)\)/);
      if (mach) {
        if (mach[1] === 'catIdByTitle') {
          return getCategoryByTitle(mach[2])
            .then(parentCategory => {
              if (!parentCategory) throw new Error(`Category not found '${mach[2]}'`);
              data.parent = parentCategory.id;
              return save(data);
            })
        }
        throw new Error(`Unrecognized function '${mach[1]}'`);
      }
      // no functions, just save
      return save(data);
    });
}

// Helper to insert a Product
function insertProduct(data) {
  if (!insertProducts) return;
  return base.services.call({
    name: 'catalog:createProduct',
    method: 'POST',
    path: '/product',
    headers: headers
  }, data);
}

// Helper to insert Stock
function insertStock(data) {
  if (!insertStocks) return;
  return base.services.call({
    name: 'stock:create',
    method: 'POST',
    path: '',
    headers: headers
  }, data);
}

// Helper to get a Category by title and cache it
function getCategoryByTitle(title) {
  const existingCategory = categoryMap.get(title);
  if (existingCategory) return Promise.resolve(existingCategory);
  return base.services.call({
      name: 'catalog:listCategories',
      method: 'GET',
      path: `/category?title=${title}`,
      headers: headers
    }, {})
    .then((result) => {
      if (result.data[0]) categoryMap.set(title, result.data[0]);
      return result.data[0];
    });
}

// Helper to get a Product by sku and cache it
function getProductBySku(sku) {
  const existingProduct = productsMap.get(sku);
  if (existingProduct) return Promise.resolve(existingProduct);
  return base.services.call({
      name: 'catalog:listProducts',
      method: 'GET',
      path: `/product?sku=${sku}`,
      headers: headers
    }, {})
    .then((result) => {
      if (result.data[0]) productsMap.set(sku, result.data[0]);
      return result.data[0];
    });
}

// TODO: convert to csv
const categoryData = [
  ['ROOT', 'Deportes'],
  ['catIdByTitle(Deportes)', 'Running'],
  ['catIdByTitle(Running)', 'Zapatillas', [
    { "id": "color", "description": "Color", "type": "STRING", "mandatory": false },
    { "id": "genre", "description": "Female/Male/Kids", "type": "STRING", "mandatory": false },
    { "id": "footprint", "description": "Motion mechanics", "type": "STRING", "mandatory": false }
  ]]
];

// Clean DB & insert data
initDB()
  .then(() => {
    console.log(insertCategories ? 'Inserting categories' : 'Skipping categories');
    // Insert category data
    return categoryData.reduce(function (prev, curr) {
      // Sequencially insert Category data
      return prev.then(function (val) {
        // curr = current arr value, val = return val from last iteration
        return insertCategory({
          parent: curr[0],
          title: curr[1],
          slug: slug(curr[1]),
          classifications: curr[2] || []
        });
      });
    }, Promise.resolve())
  })
  .then(() => {
    // Remove index server "products" index
    console.log(cleanDatabase ? 'Cleanning products index' : 'Skipping products index cleaning');
    if (!cleanDatabase) return Promise.resolve();
    return new Promise((resolve, reject) => {
      wreck.delete('http://localhost:9200/products', (err) => {
        if (err) return reject(err);
        return resolve();
      })
    })
  })
  .then(() => {
    // Parse products csv and insert them
    return new Promise((resolve, reject) => {
      let i = 0;
      const parser = parse({});
      const input = fs.createReadStream('./data/dataShoes.csv');
      const transformer = transform(function (rec, callback) {
        // if (rec[0] != '001004721216770') return callback(null, '');
        // TODO: Clean csv data before and not in this script
        // TODO: Convert classification data to CSV
        const catName = rec[10];
        getCategoryByTitle(catName)
          .then(category => {
            if (!category) throw new Error(`Category '${catName}' not found`);

            const data = {
              sku: rec[0],
              status: 'ONLINE',
              title: rec[2],
              description: rec[9],
              categories: [category.id],
              price: rec[4],
              salePrice: rec[5],
              isNetPrice: false,
              taxCode: 'default',
              brand: rec[3],
              medias: ('' + rec[12]).split(':').map((img, i) => ({
                id: `210x210:${i + 1}`,
                url: img
              })).filter(rec =>rec.url !== '')
                .concat(('' + rec[13]).split(':').map((img, i) => ({
                  id: `600x600:${i + 1}`,
                  url: img
                })).filter(rec =>rec.url !== ''))
                .concat(('' + rec[14]).split(':').map((img, i) => ({
                  id: `1200x1200:${i + 1}`,
                  url: img
                })).filter(rec =>rec.url !== ''))
            };
            const classifications = [];
            if (rec[6]) classifications.push({ id: 'color', value: rec[6] });
            if (rec[7]) classifications.push({ id: 'genre', value: rec[7] });
            if (rec[8]) classifications.push({ id: 'footprint', value: rec[8] });
            data.classifications = classifications;
            if (rec[1]) {
              // variant product
              return Promise
                .resolve()
                .then(() => {
                  return getProductBySku(rec[1]);
                })
                .then(baseProduct => {
                  if (!baseProduct) throw new Error(`Product '${rec[1]}' not found`);
                  data.base = baseProduct.id;
                  data.variations = rec[11].split('#').reduce((prev, v) => {
                    const vdata = v.split(':');
                    prev.push({ id: vdata[0], value: vdata[1] });
                    return prev;
                  }, []);
                  return insertProduct(data);
                })
            } else {
              // base product
              data.modifiers = rec[11].split(':');
              return insertProduct(data);
            }
          })
          .then(response => {
            if (response.error && response.statusCode != 403) {
              console.log(rec);
              console.log(response);
              process.exit();
            }
            if (!response.error || response.statusCode != 403) {
              return insertStock({
                productId: response.id,
                warehouseId: "001",
                quantityInStock: 100,
                quantityReserved: 0
              })
            } else {
              return ({});
            }
          })
          .then(response => {
            if (response.error) {
              console.log(rec);
              console.log(response);
              process.exit();
            }
          })
          .then(() => {
            callback(null, '' + ++i + ' ' + rec[0] + ' ' + rec[1] + '\n');
          })
          .catch(error => {
            console.error(error);
            process.exit();
          });

      }, { parallel: 1 });
      transformer.on('finish', function () {
        setTimeout(() => {
          resolve()
        }, insertProducts ? 2500 : 0);
      });
      console.log(insertProducts ? 'Inserting products' : 'Skipping products');
      input.pipe(parser).pipe(transformer).pipe(process.stdout);
    })

  })
  .then(() => {
    process.exit();
  })
  .catch(error => {
    console.log(error);
  });

module.exports = base;
