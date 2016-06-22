var osmosis = require('osmosis');
var fs = require('fs');

var wstream = fs.createWriteStream('./data/dataProductsFridges.json');

function doIt(baseUrl, path) {

  const url = baseUrl + path;

  return new Promise((resolve, reject) => {

    console.log('********************');
    console.log(url);
    console.log('********************');

    let data = '';
    let a = 0;

    osmosis
      .get(url)
      .config('concurrency', 1)
      .config('tries', 3)
      .config('timeout', 2500)
      .paginate('.pagination > ul > li:last > a', 100)
      .find('.product')
      .set({
        data: 'span@data-json'
      })
      .then(function (context, data, next) {
        const dto = JSON.parse(data.data);
        Object.assign(data, dto);
        var items = context.find('div > div.product-image');
        next(items[0], data);
      })
      .set('location', 'a@href')
      .follow('a@href')

      // Product Page
      .find('#product-info')
      .set({
        description: 'div.description-container > p'
      })
      .find('.product-features')
      .set({
        type: 'dl>dt:contains("Tipo de frigorifico") + dd',
        classenerg: 'dl>dt:contains("Clasificación energética") + dd',
        capacity: 'dl>dt:contains("Capacidad útil del refrigerador") + dd',
        color: 'dl>dt:contains("Color de la puerta") + dd',
        dimensions: 'dl>dt:contains("Dimensiones (ancho x alto x fondo)") + dd',
      })
      .find('#product-images')
      .set({
        'img210': ['div > ul > li > img@src'],
        'img640': ['div > ul > li > img@data-screen-src'],
        'img1200': ['div > ul > li > img@data-zoom-src']
      })
      .data(function (data) {
        const saveData = {
          sku: data.id,
          title: data.name,
          brand: data.brand,
          price: data.price.original || data.price.final,
          salePrice: data.price.final || data.price.original,
          description: data.description,
          categories: [`categoryIdByTitle(${data.category[2]})`],
          isNetPrice: false,
          taxCode: 'default',
          status: 'ONLINE',
          classifications: [],
          medias: data.img210.map((img, i) => ({
            id: `210x210:${i + 1}`,
            url: img
          })).concat(data.img640.map((img, i) => ({
              id: `600x600:${i + 1}`,
              url: img
            })))
            .concat(data.img1200.map((img, i) => ({
              id: `1200x1200:${i + 1}`,
              url: img
            })))
            .filter(rec =>rec.url !== '')
        };
        if (data.classenerg) saveData.classifications.push({
          id: 'energy',
          value: data.classenerg
        });
        if (data.capacity) saveData.classifications.push({
          id: 'capacity',
          value: data.capacity.replace(' litros', '')
        });
        if (data.color) saveData.classifications.push({
          id: 'color',
          value: data.color
        });
        if (data.dimensions) {
          const dimensions = data.dimensions.split(' ');
          saveData.classifications.push({
            id: 'width',
            value: dimensions[0].replace(',', '.')
          });
          saveData.classifications.push({
            id: 'height',
            value: dimensions[2].replace(',', '.')
          });
          saveData.classifications.push({
            id: 'depth',
            value: dimensions[4].replace(',', '.')
          });

        }

        wstream.write(JSON.stringify(saveData) + '\n');
        console.log(++a, data.id, '', data.name);
      })
      .done(function () {
        resolve();
      })
      .error(console.log)
    //.log(console.log)
    //.debug(console.log)
  })
}

doIt('http://www.elcorteingles.es', '/electrodomesticos/search/?s=frigor%C3%ADficos')
  .then(() => {
    return doIt('http://www.elcorteingles.es', '/electrodomesticos/frigorificos-y-congeladores/congeladores/');
  })
  .then(() => {
    return doIt('http://www.elcorteingles.es', '/electrodomesticos/frigorificos-y-congeladores/vinotecas/');
  })
  .then(() => {
    wstream.end();
  });
