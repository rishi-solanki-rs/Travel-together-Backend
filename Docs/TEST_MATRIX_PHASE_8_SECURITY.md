# TEST MATRIX PHASE 8 SECURITY

## Added Suites
- tests/security/token-replay.test.js
- tests/security/webhook-signature.test.js
- tests/security/vendor-isolation.test.js
- tests/security/gdpr-workflow.test.js
- tests/security/rate-limit-abuse.test.js

## Mandatory Matrix Coverage
1. token replay attack:
- tests/security/token-replay.test.js

2. revoked session replay:
- tests/security/token-replay.test.js

3. webhook spoof:
- tests/security/webhook-signature.test.js

4. duplicate callback:
- tests/security/webhook-signature.test.js

5. vendor cross-access:
- tests/security/vendor-isolation.test.js

6. finance ledger unauthorized write:
- tests/security/vendor-isolation.test.js

7. malware upload rejection:
- tests/security/rate-limit-abuse.test.js

8. PII masking validation:
- tests/security/gdpr-workflow.test.js

9. GDPR delete verification:
- tests/security/gdpr-workflow.test.js

10. admin break-glass audit:
- tests/security/vendor-isolation.test.js

## Execution Notes
- Security suites are additive and isolated from existing route contracts.
- Existing payload compatibility remains preserved.
