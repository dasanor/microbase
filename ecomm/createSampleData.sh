#!/usr/bin/env bash

if [ -z "$1" ]
then
  echo Usage: ./createSampleData.sh CatalogUrl [StockUrl]
  echo Usage: ./createSampleData.sh http://localhost:3000 http://localhost:3000
  exit 1
fi

catalogUrl=$1
stockUrl=$2
if [ "$stockUrl" = "" ]
then
  stockUrl=$catalogUrl
fi

AuthHeader='authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL21pY3JvYmFzZS5pbyIsInN1YiI6InVzZXIiLCJzY29wZSI6ImFwaSIsImp0aSI6ImZmYjVhOTQxLTQwYWMtNDBjNy1iMDNiLWIzZjdiMTdlOGRlMCIsImlhdCI6MTQ2NDYwNzU1MCwiZXhwIjoxNDk2MTQzNTUwfQ.kgFdYAGjwLC7wrY2gcm-8swDzwSCuEwLhgSx10rKZew'
AcceptHeader='accept: application/json'
ContentTypeHeader='content-type: application/json'

function jsonValue() {
  key=$1
  num=$2
  awk -F"[,:}]" '{for(i=1;i<=NF;i++){if($i~/'${key}'\042/){print $(i+1)}}}' | tr -d '"' | sed -n ${num}p
}

function insertCategory() {
  parent=$1
  title=$2
  slug=$3
  read -r -d '' data <<- EOM
  {
    "parent": "${parent}",
    "title": "${title}",
    "slug": "${slug}"
  }
EOM
  curl -s -X POST --url ${catalogUrl}/services/catalog/v1/category -H "$AuthHeader" -H "$ContentTypeHeader" -H "$AcceptHeader" \
       -d "$data" | jsonValue id 1
}

function getCategoryIdBySlug() {
  slug=$1
  curl -s -X GET --url ${catalogUrl}/services/catalog/v1/category?slug=${slug}\&fields=id -H "$AuthHeader" -H "$ContentTypeHeader" -H "$AcceptHeader" | jsonValue id 1
}

function insertProduct() {
  category=$1
  sku=$2
  status=$3
  brand=$4
  title=$5
  description=$6
  price=$7
  salePrice=$8
  medias=$9
  read -r -d '' data <<- EOM
  {
    "categories": ["${category}"],
    "sku": "${sku}",
    "status": "${status}",
    "brand": "${brand}",
    "title": "${title}",
    "description": "${description}",
    "price": ${price},
    "salePrice": ${salePrice},
    "medias": ${medias}
  }
EOM
  curl -s -X POST --url ${catalogUrl}/services/catalog/v1/product -H "$AuthHeader" -H "$ContentTypeHeader" -H "$AcceptHeader" \
        -d "$data" | jsonValue id 1
}

function getProductIdBySku() {
  sku=$1
  curl -s -X GET --url ${catalogUrl}/services/catalog/v1/product?sku=${sku}\&fields=id -H "$AuthHeader" -H "$ContentTypeHeader" -H "$AcceptHeader" | jsonValue id 1
}

function insertStock() {
  productId=$1
  warehouseId=$2
  quantityInStock=$3
  quantityReserved=$4
  read -r -d '' data <<- EOM
  {
    "productId": "${productId}",
    "warehouseId": "${warehouseId}",
    "quantityInStock": ${quantityInStock},
    "quantityReserved": ${quantityReserved}
  }
EOM
  curl -s -X POST --url ${stockUrl}/services/stock/v1 -H "$AuthHeader" -H "$ContentTypeHeader" -H "$AcceptHeader" \
       -d "$data" | jsonValue id 1
}

# Categories

LastID=`insertCategory 'ROOT' 'Sound Devices' 'sound'`
LastID=`insertCategory $LastID 'Headphones' 'headphones'`
LastID=`insertCategory $LastID 'MP3 Players' 'mp3'`
LastID=`insertCategory $LastID 'Musical Instruments' 'instruments'`

LastID=`insertCategory 'ROOT' 'Cameras' 'cameras'`
LastID=`insertCategory $LastID 'Digital SLRs' 'slr'`
LastID=`insertCategory $LastID 'Point and Shoot' 'pointandshoot'`
LastID=`insertCategory $LastID 'Compact System Cameras' 'compact'`
LastID=`insertCategory $LastID 'Accessories' 'accessories'`

LastID=`insertCategory 'ROOT' 'Computers' 'computers'`
LastID=`insertCategory $LastID 'Desktops' 'desktops'`
LastID=`insertCategory $LastID 'Laptops' 'laptops'`
LastID=`insertCategory $LastID 'Accessories' 'accessories'`
LastID=`insertCategory $LastID 'Monitors' 'monitors'`

# Products

CatID=`getCategoryIdBySlug 'headphones'`
LastID=`insertProduct $CatID '0101' 'ONLINE' 'Sennheiser' 'Sennheiser HD 202 II'          'Sennheiser HD 202 II Professional Headphones' 39.95 24.95 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0102' 'ONLINE' 'Apple'      'Apple MD827LL/A'               'Apple MD827LL/A EarPods with Remote and Mic' 10.92 10.92 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0103' 'ONLINE' 'Panasonic'  'Panasonic RP-HT21'             'Panasonic On-Ear Stereo Headphones RP-HT21' 6.99 6.99 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0104' 'ONLINE' 'Bose'       'Bose QuietComfort 25'          'Bose QuietComfort 25 Acoustic Noise Cancelling Headphones' 299.00 299.00 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0105' 'ONLINE' 'Beats'      'Powerbeats 2'                  'Powerbeats 2 Wireless In-Ear Headphone' 199.95 129.99 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0106' 'ONLINE' 'Panasonic'  'Panasonic ErgoFit RP-TCM125-K' 'Panasonic ErgoFit Best in Class In-Ear Earbuds Headphones with Mic/Controller RP-TCM125-K' 19.99 11.70 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0107' 'ONLINE' 'Sony'       'Sony MDR7506'                  'Sony MDR7506 Professional Large Diaphragm' 129.00 129.00 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0108' 'ONLINE' 'HyperX'     'HyperX Cloud II'               'HyperX Cloud II Gaming Headset for PC & PS4' 87.99 87.97 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0109' 'ONLINE' 'Beats'      'Beats Solo2 Wireless'          'Beats Solo2 Wireless On-Ear Headphones' 199.99 179.99 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0110' 'ONLINE' 'LG'         'LG Tone HBS-730'               'LG Tone HBS-730 Wireless Stereo Headset' 49.23 49.23 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0111' 'ONLINE' 'Bose'       'Bose QuietComfort 20'          'Bose QuietComfort 20 Acoustic Noise Cancelling Headphones' 299.00 299.00 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0112' 'ONLINE' 'HIFIMAN'    'HIFIMAN HE1000'                'HIFIMAN HE1000 Over Ear Planar Magnetic Headphone' 2999.00 2861.27 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0113' 'ONLINE' 'PIONEER'    'PIONEER SE-MASTER1'            'PIONEER headband headphones SE-MASTER1' 2500.00 2500.00 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`

CatID=`getCategoryIdBySlug 'mp3'`
LastID=`insertProduct $CatID '0201' 'ONLINE' 'Diver'    'Diver DB-10 4GB'         'Diver DB-10 4GB Waterproof MP3 Player with Waterproof Earphones' 89.95 49.95 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0202' 'ONLINE' 'Polaroid' 'Polaroid PMP120-4PK'     'Polaroid PMP120-4PK Built-In Sports Clip Touch Screen Mp3 Player with Noise Isolating Earbuds for Sport Activities' 19.99 15.99 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0203' 'ONLINE' 'Haoponer' 'Haoponer Portable Sport' 'Haoponer Portable Sport Mini Multimedia Digital Speaker USB Falsh Drive Micro SD Card Music MP3 Player FM Radio for Outdoor Computer Mobile Phone Travel Bicycle' 21.99 21.99 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0204' 'ONLINE' 'Sony'     'Sony NWZE384'            'Sony NWZE384 8 GB Walkman MP3 Video Player' 65.99 35.99 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`

CatID=`getCategoryIdBySlug 'slr'`
LastID=`insertProduct $CatID '0301' 'ONLINE' 'Canon'  'Canon EOS 80D'      'Canon EOS 80D Digital SLR Kit with EF-S 18-55mm f/3.5-5.6 Image Stabilization STM Lens' 1349.00 1349.00 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0302' 'ONLINE' 'Nikon'  'Nikon D3300'        'Nikon D3300 24.2 MP CMOS Digital SLR with Auto Focus-S DX NIKKOR 18-55mm f/3.5-5.6G VR II Zoom Lens' 546.95 546.95 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0303' 'ONLINE' 'Canon'  'Canon EOS Rebel T6' 'Canon EOS Rebel T6 Digital SLR Camera Kit with EF-S 18-55mm f/3.5-5.6 IS II Lens' 549.00 499.00  '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`
LastID=`insertProduct $CatID '0304' 'ONLINE' 'Pentax' 'Pentax K-50'        'Pentax K-50 16MP Digital SLR Camera with 3-Inch LCD - Body Only' 349.95 349.95 '[{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]'`

# Stock
ProductID=`getProductIdBySku '0101'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0102'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0103'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0104'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0105'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0106'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0107'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0108'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0109'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0110'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0111'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0112'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0113'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`

ProductID=`getProductIdBySku '0201'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0202'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0203'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0204'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`

ProductID=`getProductIdBySku '0301'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0302'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0303'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
ProductID=`getProductIdBySku '0304'`; LastID=`insertStock $ProductID 001 1000 0`; LastID=`insertStock $ProductID 002 200 0`
