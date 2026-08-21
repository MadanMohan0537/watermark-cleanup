# Optional server API

The web UI processes files locally in the browser. These routes exist for automation and for environments that cannot run the client pipeline. They are not required to use the product.

All mutating routes require an ownership confirmation. Temporary jobs are stored in memory under random ids and expire after 30 minutes.

## Authorization

Send one of:

- `authorized=true` as a form field
- `{ "authorized": true }` in JSON bodies

Requests without that confirmation return `403`.

## Rate limits

Limits are per client key derived from request headers. If you are rate-limited, wait and retry.

## `POST /api/analyze`

Classify an upload, run detection, and create a temporary job.

**Request:** `multipart/form-data`

| Field | Required | Description |
| --- | --- | --- |
| `file` | yes | The file to inspect |
| `authorized` | yes | `"true"` or `"on"` |

**Response:** JSON with `id`, `mediaKind`, `mimeType`, `size`, and `analysis`.

`analysis.regions` includes bounding boxes, labels, confidence, and the default keep/remove action. Review those ids before calling process.

## `POST /api/process`

Apply a cleanup plan to a previously analyzed job.

**Request:** JSON

```json
{
  "authorized": true,
  "id": "job-id-from-analyze",
  "regionIds": ["region-1"],
  "textRemovals": ["optional overlay string"]
}
```

**Response:** JSON with `id`, `filename`, `mimeType`, `residualDetected`, `warnings`, and `size`. The cleaned bytes are not inlined here; fetch them from the result route.

## `GET /api/result/[id]`

Download the cleaned file for a processed job.

- `Content-Type` matches the cleaned media type
- `Content-Disposition` is an attachment
- `Cache-Control: no-store`

## `DELETE /api/file/[id]`

Delete a temporary job immediately instead of waiting for TTL expiry.

## Notes

- File type is taken from magic bytes, not the filename extension.
- Encrypted PDFs are rejected.
- Server-side WEBP decode is not supported.
- Workers memory is a poor long-term store. If you persist jobs later, bind R2 and keep automatic deletion. See [deployment.md](deployment.md).
