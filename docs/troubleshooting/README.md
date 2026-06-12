# Troubleshooting

## Docker Desktop Requires WSL Update

Symptom:

```text
Docker Desktop is unable to start
WSL update required
```

Fix:

- Update WSL from PowerShell or Docker Desktop prompt.
- Restart Docker Desktop.
- Run `docker ps` again.

## Redis Port 6379 Is Unavailable

This project maps Redis to host port `6479`:

```text
6479 -> 6379
```

Use:

```text
REDIS_ADDR=localhost:6479
```

## Redis Requires Password

Redis password in local Docker Compose:

```text
redis_password
```

Example:

```powershell
docker exec ecommerce-redis redis-cli -a redis_password PING
```

## Product Images Fail With Empty Reply

Symptom:

```text
ERR_EMPTY_RESPONSE
http://localhost:8333/product-images/...
```

Cause:

- `8333` is the local S3-compatible endpoint used by backend uploads.
- Browser-readable object URLs should use SeaweedFS Filer:

```text
http://localhost:8888/buckets/product-images/...
```

The frontend normalizes old local `8333` URLs for display.

## Midtrans Webhook Does Not Reach Local Backend

Localhost is not reachable by Midtrans servers. Use a public tunnel:

```text
ngrok http 8080
```

Then configure the generated HTTPS URL in Midtrans sandbox settings.

## Gmail SMTP Bad Credentials

Symptom:

```text
535 5.7.8 Username and Password not accepted
```

Fix:

- Enable 2-Step Verification on the Google account.
- Generate a Google App Password.
- Use that app password as `SMTP_PASSWORD`.

## Frontend Can Open But API Calls Fail

Check:

```powershell
curl.exe http://localhost:8080/api/v1/ping
curl.exe "http://localhost:8080/api/v1/products?limit=5"
```

If curl works but browser fails:

- Confirm frontend is running on expected local origin, usually `localhost:3000`.
- Confirm backend CORS/origin settings if they are later tightened.
- Check browser console for exact URL and status.

## Lighthouse Exits With EPERM on Windows

Symptom:

```text
EPERM, Permission denied: C:\tmp\lighthouse...
```

Lighthouse may still write the JSON report before failing to clean the temporary Chrome folder. Parse the generated JSON if it exists. This is a local Windows cleanup issue, not necessarily an application failure.
