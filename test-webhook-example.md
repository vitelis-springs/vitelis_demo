# YAML Webhook Test Example

## Webhook URL
```
POST /api/webhook/salesminer/result/{{ $execution.id }}
```

## How it works:
1. **URL Parameter**: `executionId` comes from the URL path (`{{ $execution.id }}`)
2. **File Upload**: Only YAML file is sent in the request body
3. **S3 Upload**: YAML file is uploaded to S3 in `salesminer-yaml-files/` folder
4. **Database Update**: S3 URL is saved to `yamlFile` field in the SalesMiner analyze record

## Test with curl:

```bash
# Create a test YAML file
cat > test-config.yaml << EOF
name: "Test Company Config"
version: "1.0.0"
settings:
  debug: false
  timeout: 30
  features:
    - analytics
    - reporting
EOF

# Test the webhook (replace EXECUTION_ID with actual execution ID)
curl -X POST http://localhost:3000/api/webhook/salesminer/result/EXECUTION_ID \
  -F "file=@test-config.yaml"

# Expected response:
{
  "success": true,
  "message": "YAML file uploaded and saved successfully",
  "data": {
    "executionId": "EXECUTION_ID",
    "yamlFile": "https://bucket.s3.region.amazonaws.com/salesminer-yaml-files/123-test-config.yaml",
    "s3Url": "https://bucket.s3.region.amazonaws.com/salesminer-yaml-files/123-test-config.yaml"
  }
}
```

## Error Cases:

### Missing executionId:
```bash
curl -X POST http://localhost:3000/api/webhook/salesminer/result/ \
  -F "file=@test-config.yaml"
# Returns: 404 Not Found
```

### No file provided:
```bash
curl -X POST http://localhost:3000/api/webhook/salesminer/result/EXECUTION_ID
# Returns: 400 Bad Request - "No YAML file provided"
```

### Invalid file type:
```bash
curl -X POST http://localhost:3000/api/webhook/salesminer/result/EXECUTION_ID \
  -F "file=@test.txt"
# Returns: 400 Bad Request - "Invalid YAML file type"
```

### Record not found:
```bash
curl -X POST http://localhost:3000/api/webhook/salesminer/result/NONEXISTENT_ID \
  -F "file=@test-config.yaml"
# Returns: 404 Not Found - "SalesMiner analyze record not found"
```

## Database Update:
The webhook will find the SalesMiner analyze record by `executionId` and update only the `yamlFile` field with the S3 URL.

```javascript
// Before
{
  executionId: "123",
  yamlFile: null,
  // ... other fields
}

// After
{
  executionId: "123", 
  yamlFile: "https://bucket.s3.region.amazonaws.com/salesminer-yaml-files/123-test-config.yaml",
  // ... other fields unchanged
}
```
