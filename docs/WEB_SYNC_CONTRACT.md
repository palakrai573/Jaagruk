# Web sync receipt contract

## Compatibility boundary

The web application currently uploads `jaagruk-sync` JSON records. The Kotlin
backend `/api/v1/sync/batch` accepts a different, authenticated, registered-device
schema and compact signed certificate format. They are NOT interchangeable.
Do not configure that native endpoint directly as the web upload endpoint.
An authenticated adapter and explicit identity/content mappings are still needed.
Do not relabel a web certificate as a native certificate or infer missing signatures.

## Durable acknowledgement

Previously any HTTP 2xx removed every queued record. A login page, empty response
or partially rejected batch could therefore destroy the upload queue. The web
client now requires this JSON response before removing each individual record:

```json
{
  "format": "jaagruk-sync-receipt",
  "version": 1,
  "results": [
    {
      "kind": "attempt",
      "refId": "original-reference-id",
      "hash": "exact-content-hash-from-request",
      "status": "accepted"
    }
  ]
}
```

Only `accepted` or `duplicate` permits removal, and only when kind, reference and
hash match the submitted record. Duplicate receipt entries are treated as
ambiguous and retained. Omitted, rejected and quarantined records remain queued.
The server must commit before acknowledging, validate the payload and hash, and
never acknowledge `duplicate` unless the durable existing record has identical
content. HTTP success alone is not sufficient. Existing custom endpoints must
implement this receipt before queued records can drain.

## Retry behavior

- A single in-flight upload is shared by automatic and manual triggers.
- Network errors and HTTP 401/403/408/425/429/5xx back off exponentially, capped at
  five minutes; they do not become permanently ineligible after six attempts.
- Other HTTP 4xx responses require explicit retry after six failures. Records
  remain in IndexedDB and the supervisor Sync action can retry them after repair.
- Missing acknowledgement is retryable. Pending/backoff queues are not shown as
  successfully empty. Foreground automatic sync schedules the next eligible retry.
- HTTPS is required except HTTP localhost/127.0.0.1 development endpoints.
  URL credentials and redirects are rejected.

This receipt protects queue integrity, not server trust. Authentication, site
authorization, privacy policy and server deployment remain prerequisites for
connecting a real endpoint carrying worker information.
