#!/usr/bin/env bash

if [ -z "$1" ]
then
  echo Usage: ./createSampleData.sh http://localhost:80
  exit 1
fi

url=$1

AuthHeader='authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL21pY3JvYmFzZS5pbyIsInN1YiI6InVzZXIiLCJzY29wZSI6ImFwaSIsImp0aSI6ImZmYjVhOTQxLTQwYWMtNDBjNy1iMDNiLWIzZjdiMTdlOGRlMCIsImlhdCI6MTQ2NDYwNzU1MCwiZXhwIjoxNDk2MTQzNTUwfQ.kgFdYAGjwLC7wrY2gcm-8swDzwSCuEwLhgSx10rKZew'
AcceptHeader='accept: application/json'
ContentTypeHeader='content-type: application/json'

function jsonValue() {
  key=$1
  num=$2
  awk -F"[,:}]" '{for(i=1;i<=NF;i++){if($i~/'${key}'\042/){print $(i+1)}}}' | tr -d '"' | sed -n ${num}p
}

function insertCategory() {
  data=$1
  parent=$2
  curl -s -X POST --url ${url}/services/catalog/v1/category -H "$AuthHeader" -H "$ContentTypeHeader" -H "$AcceptHeader" -d '{"parent": "'"${parent}"'", '"${data}"'}' | jsonValue id 1
}

function getCategoryIdBySlug() {
  slug=$1
  curl -s -X GET --url ${url}/services/catalog/v1/category?slug=${slug}\&fields=id -H "$AuthHeader" -H "$ContentTypeHeader" -H "$AcceptHeader" | jsonValue id 1
}

function insertProduct() {
  data=$1
  category=$2
  curl -s -X POST --url ${url}/services/catalog/v1/product -H "$AuthHeader" -H "$ContentTypeHeader" -H "$AcceptHeader" -d '{"categories": ["'"${category}"'"], '"${data}"'}' | jsonValue id 1
}

# Categories

LastID=`insertCategory '"title": "Sound Devices", "slug": "sound"' 'ROOT'`
LastID=`insertCategory '"title": "Headphones", "slug": "headphones"' $LastID`
LastID=`insertCategory '"title": "MP3 Players", "slug": "mp3"' $LastID`
LastID=`insertCategory '"title": "Musical Instruments", "slug": "instruments"' $LastID`

LastID=`insertCategory '"title": "Cameras", "slug": "cameras"' 'ROOT'`
LastID=`insertCategory '"title": "Digital SLRs", "slug": "slr"' $LastID`
LastID=`insertCategory '"title": "Point and Shoot", "slug": "pointandshoot"' $LastID`
LastID=`insertCategory '"title": "Compact System Cameras", "slug": "compact"' $LastID`
LastID=`insertCategory '"title": "Accessories", "slug": "accessories"' $LastID`

LastID=`insertCategory '"title": "Computers", "slug": "computers"' 'ROOT'`
LastID=`insertCategory '"title": "Desktops", "slug": "desktops"' $LastID`
LastID=`insertCategory '"title": "Laptops", "slug": "laptops"' $LastID`
LastID=`insertCategory '"title": "Accessories", "slug": "accessories"' $LastID`
LastID=`insertCategory '"title": "Monitors", "slug": "monitors"' $LastID`

# Products

CatID=`getCategoryIdBySlug 'headphones'`
LastID=`insertProduct '"sku": "0101", "status": "ONLINE", "brand": "Sennheiser", "title": "Sennheiser HD 202 II",          "description": "Sennheiser HD 202 II Professional Headphones", "price": 39.95, "salePrice": 24.95, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0102", "status": "ONLINE", "brand": "Apple",      "title": "Apple MD827LL/A",               "description": "Apple MD827LL/A EarPods with Remote and Mic", "price": 10.92, "salePrice": 10.92, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0103", "status": "ONLINE", "brand": "Panasonic",  "title": "Panasonic RP-HT21",             "description": "Panasonic On-Ear Stereo Headphones RP-HT21", "price": 6.99, "salePrice": 6.99, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0104", "status": "ONLINE", "brand": "Bose",       "title": "Bose QuietComfort 25",          "description": "Bose QuietComfort 25 Acoustic Noise Cancelling Headphones", "price": 299.00, "salePrice": 299.00, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0105", "status": "ONLINE", "brand": "Beats",      "title": "Powerbeats 2",                  "description": "Powerbeats 2 Wireless In-Ear Headphone", "price": 199.95, "salePrice": 129.99, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0106", "status": "ONLINE", "brand": "Panasonic",  "title": "Panasonic ErgoFit RP-TCM125-K", "description": "Panasonic ErgoFit Best in Class In-Ear Earbuds Headphones with Mic/Controller RP-TCM125-K", "price": 19.99, "salePrice": 11.70, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0107", "status": "ONLINE", "brand": "Sony",       "title": "Sony MDR7506",                  "description": "Sony MDR7506 Professional Large Diaphragm", "price": 129.00, "salePrice": 129.00, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0108", "status": "ONLINE", "brand": "HyperX",     "title": "HyperX Cloud II",               "description": "HyperX Cloud II Gaming Headset for PC & PS4", "price": 87.99, "salePrice": 87.97, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0109", "status": "ONLINE", "brand": "Beats",      "title": "Beats Solo2 Wireless",          "description": "Beats Solo2 Wireless On-Ear Headphones", "price": 199.99, "salePrice": 179.99, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0110", "status": "ONLINE", "brand": "LG",         "title": "LG Tone HBS-730",               "description": "LG Tone HBS-730 Wireless Stereo Headset", "price": 49.23, "salePrice": 49.23, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0111", "status": "ONLINE", "brand": "Bose",       "title": "Bose QuietComfort 20",          "description": "Bose QuietComfort 20 Acoustic Noise Cancelling Headphones", "price": 299.00, "salePrice": 299.00, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0112", "status": "ONLINE", "brand": "HIFIMAN",    "title": "HIFIMAN HE1000",                "description": "HIFIMAN HE1000 Over Ear Planar Magnetic Headphone", "price": 2999.00, "salePrice": 2861.27, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0113", "status": "ONLINE", "brand": "PIONEER",    "title": "PIONEER SE-MASTER1",            "description": "PIONEER headband headphones SE-MASTER1", "price": 2500, "salePrice": 2500, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`

CatID=`getCategoryIdBySlug 'mp3'`
LastID=`insertProduct '"sku": "0201", "status": "ONLINE", "brand": "Diver",    "title": "Diver DB-10 4GB",         "description": "Diver DB-10 4GB Waterproof MP3 Player with Waterproof Earphones", "price": 89.95, "salePrice": 49.95, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0202", "status": "ONLINE", "brand": "Polaroid", "title": "Polaroid PMP120-4PK",     "description": "Polaroid PMP120-4PK Built-In Sports Clip Touch Screen Mp3 Player with Noise Isolating Earbuds for Sport Activities", "price": 19.99, "salePrice": 15.99, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0203", "status": "ONLINE", "brand": "Haoponer", "title": "Haoponer Portable Sport", "description": "Haoponer Portable Sport Mini Multimedia Digital Speaker USB Falsh Drive Micro SD Card Music MP3 Player FM Radio for Outdoor Computer Mobile Phone Travel Bicycle", "price": 21.99, "salePrice": 21.99, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0204", "status": "ONLINE", "brand": "Sony",     "title": "Sony NWZE384",            "description": "Sony NWZE384 8 GB Walkman MP3 Video Player", "price": 65.99, "salePrice": 35.99, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`

CatID=`getCategoryIdBySlug 'slr'`
LastID=`insertProduct '"sku": "0301", "status": "ONLINE", "brand": "Canon",  "title": "Canon EOS 80D",      "description": "Canon EOS 80D Digital SLR Kit with EF-S 18-55mm f/3.5-5.6 Image Stabilization STM Lens", "price": 1349.00, "salePrice": 1349.00, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0302", "status": "ONLINE", "brand": "Nikon",  "title": "Nikon D3300",        "description": "Nikon D3300 24.2 MP CMOS Digital SLR with Auto Focus-S DX NIKKOR 18-55mm f/3.5-5.6G VR II Zoom Lens", "price": 546.95, "salePrice": 546.95, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0303", "status": "ONLINE", "brand": "Canon",  "title": "Canon EOS Rebel T6", "description": "Canon EOS Rebel T6 Digital SLR Camera Kit with EF-S 18-55mm f/3.5-5.6 IS II Lens", "price": 549.00, "salePrice": 499.00 , "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`
LastID=`insertProduct '"sku": "0304", "status": "ONLINE", "brand": "Pentax", "title": "Pentax K-50",        "description": "Pentax K-50 16MP Digital SLR Camera with 3-Inch LCD - Body Only", "price": 349.95, "salePrice": 349.95, "medias": [{"id": "100x100", "url": "http://placehold.it/100x100"},{"id": "350x150", "url": "http://placehold.it/350x150"}]' $CatID`


