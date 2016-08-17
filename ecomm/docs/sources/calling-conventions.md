# Basics

The API consists of HTTP RPC-style methods, all of the form <a href="https://server/services/v1/METHOD">https://server/services/v1/METHOD</a>.

All methods must be called using HTTPS. Arguments can be passed as GET or POST params, or a mix. The response contains a JSON object, which will always contain a top-level boolean property ok, indicating success or failure. For failure results, the error property will contain a short machine-readable error code along optional error data.

```javascript
{
    "ok": true,
    "data": "Service returned data"
}
```

```javascript
{
    "ok": false,
    "error": "error_code",
    "data": "Optional data about the error"
}
```

# Headers

All operations must contain the appropriate `authorization` token:
  
```bash
--header 'authorization: Bearer xxxxx...'
```

And the `accept` and `content-type` headers:
 
```bash
  --header 'accept: application/json' \
  --header 'content-type: application/json'
```
