# Security

## Reporting a vulnerability

Email or open a private GitHub security advisory. Do not file a public issue for a vulnerability that could expose uploaded files.

## Product constraints

- Uploads are identified with random ids. Original filenames are not exposed in public URLs.
- Temporary server copies, if used, expire and are deleted. They are not used for training.
- Prefer browser-side processing so files never leave the device.
- Validate MIME type from file signatures, not extensions.
- Enforce size limits and basic rate limiting on API routes.

## What this tool is not

It is not a bypass for DRM, paywalls, forensic watermarks, cryptographic signatures, or access controls.
