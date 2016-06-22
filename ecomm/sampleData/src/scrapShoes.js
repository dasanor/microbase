var osmosis = require('osmosis');
var fs = require('fs');
var wreck = require('wreck');

var wstream = fs.createWriteStream('./data/dataProductsShoes.json');

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
        defaultColor: 'p.variant-ctrl',
        defaultColor2: 'ul.variants-selector > i > a',
        description: 'div.description-container > p'
      })
      .find('.product-features')
      .set({
        pisada: 'dl>dt:contains("Tipo de pisada") + dd'
      })
      .find('#product-images')
      .set({
        'img210': ['div > ul > li > img@src'],
        'img640': ['div > ul > li > img@data-screen-src'],
        'img1200': ['div > ul > li > img@data-zoom-src']
      })
      .find('aside + script + script')
      .set('product')
      .then(function (context, data, next) {
          //if (data.name != 'Zapatillas de running de hombre Gel Noosa Tri 11 Asics') return next(context, data);

          if (data.name.match(/mujer/i)) data.genero = 'mujer';
          if (data.name.match(/niños/i)) data.genero = 'niños';
          if (data.name.match(/bebés/i)) data.genero = 'bebés';
          if (data.name.match(/hombre/i)) data.genero = 'hombre';

          data.modifiers = ['color', 'talla'];

          const product0 = JSON.parse(data.product.substr(14).replace(/'/g, '"'));
          const k = Object.keys(product0)[0];
          data.k = k;
          data.product = product0[k];
          const skus = Object.keys(data.product.skus);

          let p;
          if (data.product.colorSelected !== undefined) {
            data.defaultColor2 = data.product.lookup[0].values[data.product.colorSelected].name;
            // Get "other" color(s) images
            const colorToSearch = -data.product.colorSelected + 1;
            const skuToSearch = skus.find(s => data.product.skus[s][0] == colorToSearch);
            p = new Promise((resolve, reject) => {
              wreck.request(
                'GET',
                baseUrl + '/api/product/' + k + '/?skus=' + skuToSearch + '&store_id=26',
                {},
                (error, response) => {
                  if (error) return reject(error);
                  wreck.read(response, { json: 'smart' }, (error, payload) => {
                    if (error) return reject(error);
                    resolve(payload);
                  });
                });
            })
          } else {
            p = Promise.resolve();
          }

          p.then(json => {
            let vimgs;
            if (json) {
              const imgs = [json.image_link].concat(json.additional_image_links);
              vimgs = imgs.reduce((prev, actual) => {
                if (actual.small) prev.img210.push(actual.small.url);
                if (actual.big) prev.img640.push(actual.big.url);
                if (actual.zoom) prev.img1200.push(actual.zoom.url);
                return prev;
              }, { img210: [], img640: [], img1200: [] });
            }

            data.variantsData = [];
            skus.forEach(sku => {
              const dv = { sku: sku, variations: [] };
              data.product.skus[sku].forEach((variantId, index) => {
                dv.variations.push(
                  data.product.lookup[index].key + ':' + data.product.lookup[index].values[variantId].name
                );
              });
              if (dv.variations.length === 1) {
                dv.variations.push('color:' + data.defaultColor);
              }
              dv.pricing = data.product.pricing[sku];

              //console.log(data.id, sku);
              if (data.product.colorSelected === undefined) {
                dv.img210 = data.img210;
                dv.img640 = data.img640;
                dv.img1200 = data.img1200;
              } else if (data.product.colorSelected == data.product.skus[dv.sku][0]) {
                dv.img210 = data.img210;
                dv.img640 = data.img640;
                dv.img1200 = data.img1200;
              } else {
                dv.img210 = vimgs.img210;
                dv.img640 = vimgs.img640;
                dv.img1200 = vimgs.img1200;
              }

              data.variantsData.push(dv);
            });
            next(context, data);
          });

        }
      )
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
          modifiers: data.modifiers,
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
        if (data.defaultColor || data.defaultColor2) saveData.classifications.push({
          id: 'color',
          value: data.defaultColor || data.defaultColor2
        });
        if (data.genero) saveData.classifications.push({
          id: 'genre',
          value: data.genero
        });
        if (data.pisada) saveData.classifications.push({
          id: 'footprint',
          value: data.pisada
        });

        wstream.write(JSON.stringify(saveData) + '\n');
        console.log(++a, data.id, '', data.name);

        try {
          data.variantsData.forEach(v => {
            const saveData = {
              sku: v.sku,
              base: `productIdBySku(${data.id})`,
              title: data.name,
              brand: data.brand,
              price: v.pricing.price,
              salePrice: v.pricing.sale_price,
              description: data.description,
              categories: [`categoryIdByTitle(${data.category[2]})`],
              isNetPrice: false,
              taxCode: 'default',
              status: 'ONLINE',
              classifications: [],
              medias: v.img210.map((img, i) => ({
                id: `210x210:${i + 1}`,
                url: img
              })).concat(v.img640.map((img, i) => ({
                  id: `600x600:${i + 1}`,
                  url: img
                })))
                .concat(v.img1200.map((img, i) => ({
                  id: `1200x1200:${i + 1}`,
                  url: img
                })))
                .filter(rec =>rec.url !== ''),
              variations: v.variations.reduce((prev, v) => {
                const vdata = v.split(':');
                prev.push({ id: vdata[0], value: vdata[1] });
                return prev;
              }, [])
            };
            if (data.defaultColor || v.variations.find(v => v.match(/color:/)).split(':')[1]) saveData.classifications.push({
              id: 'color',
              value: data.defaultColor || v.variations.find(v => v.match(/color:/)).split(':')[1]
            });
            if (data.genero) saveData.classifications.push({
              id: 'genre',
              value: data.genero
            });
            if (data.pisada) saveData.classifications.push({
              id: 'footprint',
              value: data.pisada
            });

            wstream.write(JSON.stringify(saveData) + '\n');
            console.log(++a, v.sku, data.id, data.name);
          })
        } catch (e) {
          console.log(e);
          console.log(data);
        }

      })
      .done(function () {
        resolve();
      })
      .error(console.log)
    //.log(console.log)
    //.debug(console.log)
  })
}

//doIt('http://www.elcorteingles.es', '/deportes/search/?s=Gel+Noosa+Tri+11+hombre');
doIt('http://www.elcorteingles.es', '/deportes/running/zapatillas/')
  .then(() => {
    wstream.end();
  });
