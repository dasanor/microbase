const base = require('micro-base')();
const parse = require('csv-parse');
const transform = require('stream-transform');
const fs = require('fs');
const slug = require('slugg');
const Wreck = require('wreck');

const headers = base.config.get('gateway:defaultHeaders');
const categoryMap = new Map();

const wreck = Wreck.defaults({
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

function insertCategory(data) {

  function save(data) {
    return base.services.call({
        name: 'catalog:createCategory',
        method: 'POST',
        path: '/category',
        headers: headers
      }, data)
      .then(category => {
        categoryMap.set(category.title, category.id);
        return category;
      });
  }

  const id = categoryMap.get(data.title);
  if (id) return Promise.resolve(id);

  return getCategoryByTitle(data.title)
    .then(category => {
      // If it already exist return it
      if (category.data[0]) {
        categoryMap.set(data.title, category.data[0].id);
        return category.id;
      }
      // Convert parent id functions
      const mach = data.parent.match(/(\w*)\((.*)\)/);
      if (mach) {
        if (mach[1] === 'catIdByTitle') {
          return getCategoryByTitle(mach[2])
            .then(categories => {
              if (!categories.data[0]) throw new Error(`Category not found '${mach[2]}'`);
              data.parent = categories.data[0].id;
              return save(data);
            })
        }
        throw new Error(`Unrecognized function '${mach[1]}'`);
      }
      // no functions, just save
      return save(data);
    });
}

function insertProduct(data) {
  return base.services.call({
    name: 'catalog:createProduct',
    method: 'POST',
    path: '/product',
    headers: headers
  }, data);
}

function insertStock(data) {
  return base.services.call({
    name: 'stock:create',
    method: 'POST',
    path: '',
    headers: headers
  }, data);
}

function getCategoryByTitle(title) {
  return base.services.call({
    name: 'catalog:getCategory',
    method: 'GET',
    path: `/category?title=${title}`,
    headers: headers
  }, {});
}

const categoryData = [
  ['ROOT', 'Elecrodomésticos'],
  ['catIdByTitle(Elecrodomésticos)', 'Frigoríficos y Congeladores', [
    {
      "id": "energy",
      "description": "Energy classification",
      "type": "STRING",
      "mandatory": false
    },
    { "id": "width", "description": "Width dimension", "type": "NUMBER", "mandatory": false },
    { "id": "height", "description": "Height dimension", "type": "NUMBER", "mandatory": false },
    { "id": "depth", "description": "Depth dimension", "type": "NUMBER", "mandatory": false },
    { "id": "color", "description": "Color", "type": "STRING", "mandatory": false },
    { "id": "capacity", "description": "Volume capacity", "type": "NUMBER", "mandatory": false }
  ]],
  ['catIdByTitle(Frigoríficos y Congeladores)', 'Congeladores'],
  ['catIdByTitle(Frigoríficos y Congeladores)', 'Frigoríficos combi'],
  ['catIdByTitle(Frigoríficos y Congeladores)', 'Frigoríficos minis'],
  ['catIdByTitle(Frigoríficos y Congeladores)', 'Frigoríficos 1 puerta'],
  ['catIdByTitle(Frigoríficos y Congeladores)', 'Frigoríficos 2 puertas'],
  ['catIdByTitle(Frigoríficos y Congeladores)', 'Frigoríficos Side by Side'],
  ['catIdByTitle(Frigoríficos y Congeladores)', 'Vinotecas'],
  ['catIdByTitle(Frigoríficos y Congeladores)', 'Fabricador de cubitos']
];

categoryData.reduce(function (prev, curr) {
    return prev.then(function (val) {
      //curr = current arr value, val = return val from last iteration
      return insertCategory({
        parent: curr[0],
        title: curr[1],
        slug: slug(curr[1]),
        classifications: curr[2] || []
      });
    });
  }, Promise.resolve())
  .then(() => {
    return new Promise((resolve, reject) => {
      wreck.delete('http://localhost:9200/products', (err) => {
        if (err) return reject(err);
        return resolve();
      })
    })
  })
  .then(() => {

    return new Promise((resolve, reject) => {
      let i = 0;
      const parser = parse({});
      const input = fs.createReadStream('./data/data.csv');
      const transformer = transform(function (rec, callback) {

//        if (rec[0] != '001004721216770') return callback(null, '');

        const catName = rec[12].split(':')[2];
        const catId = categoryMap.get(catName);
        if (!catId) throw new Error(`Category '${catName}' not found`);

        const classifications = [];
        if (rec[7]) classifications.push({ id: 'energy', value: rec[7] });
        if (rec[8]) classifications.push({ id: 'capacity', value: rec[8].replace(' litros', '') });
        if (rec[9]) classifications.push({ id: 'color', value: rec[9] });
        if (rec[10]) {
          const values = rec[10].split(' ');
          classifications.push({ id: 'width', value: values[0].replace(',', '.') });
          classifications.push({ id: 'height', value: values[2].replace(',', '.') });
          classifications.push({ id: 'depth', value: values[4].replace(',', '.') });
        }

        insertProduct({
          sku: rec[0],
          status: 'ONLINE',
          title: rec[1],
          description: rec[11],
          categories: [categoryMap.get(rec[12].split(':')[2])],
          price: rec[3],
          salePrice: rec[4],
          brand: rec[2],
          medias: ('' + rec[13]).split(':').map((img, i) => ({
            id: `210x210:${i + 1}`,
            url: img
          })).filter(rec =>rec.url !== '')
            .concat(('' + rec[14]).split(':').map((img, i) => ({
              id: `600x600:${i + 1}`,
              url: img
            })).filter(rec =>rec.url !== ''))
            .concat(('' + rec[15]).split(':').map((img, i) => ({
              id: `1200x1200:${i + 1}`,
              url: img
            })).filter(rec =>rec.url !== '')),
          classifications: classifications
        })
          .then(response => {
            if (response.error) {
              console.log(rec);
              console.log(response);
              process.exit();
            }
            return insertStock({
              productId: response.id,
              warehouseId: "001",
              quantityInStock: 100,
              quantityReserved: 0
            })
          })
          .then(response => {
            if (response.error) {
              console.log(rec);
              console.log(response);
              process.exit();
            }
            callback(null, '' + ++i + ' ' + rec[0] + ' ' + rec[1] + '\n');
          })
          .catch(error => {
            console.error(error);
          });

      }, { parallel: 1 });
      transformer.on('finish', function () {
        setTimeout(() => {
          resolve()
        }, 2500)
      });
      input.pipe(parser).pipe(transformer).pipe(process.stdout);
    })

  })
  .then(() => {
    process.exit();
  })
  .catch(error => {
    console.log(error);
  });

function readProducts() {
  let a = 0;
  const parser = parse({});
  const input = fs.createReadStream('./data/data.csv');
  const transformer = transform(function (record, callback) {
    callback(null, '' + ++a + ' ' + record[12] + '\n');
    if (a === 10) process.exit();
  }, { parallel: 1 });
  input.pipe(parser).pipe(transformer).pipe(process.stdout);
}

module.exports = base;
