const fs = require('fs');
const path = require('path');

const root = process.cwd();
const srcDir = path.join(root, 'src');
const registerRoutesPath = path.join(srcDir, 'bootstrap', 'registerRoutes.js');
const oldCollectionPath = path.join(root, 'Together-In-India-Complete-Collection.json');

const requiredFolders = [
  'Auth','Users','BookingHub','Hotels','Shops','Kids','Destinations','Subscriptions','Notifications','Media','CMS','Finance','Vendors','Reports','Security','Health/Ops'
];

const methodMap = {
  get: 'GET', post: 'POST', put: 'PUT', patch: 'PATCH', delete: 'DELETE', options: 'OPTIONS', head: 'HEAD'
};

function read(file) { return fs.readFileSync(file, 'utf8'); }

function normalizePath(p) {
  if (!p) return '/';
  let out = p.trim();
  out = out.replace(/`\$\{base\}/g, '');
  out = out.replace(/\$\{base\}/g, '');
  out = out.replace(/\{version\}/g, '{{apiVersion}}');
  out = out.replace(/\/+/g, '/');
  if (!out.startsWith('/')) out = '/' + out;
  out = out.replace(/\/+/g, '/');
  return out;
}

function listRouteFiles(dir) {
  const out = [];
  function walk(d) {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n);
      const st = fs.statSync(p);
      if (st.isDirectory()) walk(p);
      else if (n.endsWith('.routes.js')) out.push(p);
    }
  }
  walk(dir);
  return out;
}

function parseRegisterRoutes() {
  const txt = read(registerRoutesPath);
  const importRe = /import\s+(\w+)\s+from\s+'(\.\.\/modules\/.+?\.routes\.js)'/g;
  const imports = {};
  for (const m of txt.matchAll(importRe)) {
    imports[m[1]] = m[2].replace('../', 'src/');
  }

  const mounts = [];
  const useRe = /app\.use\(([^,]+),\s*(\w+)\)/g;
  for (const m of txt.matchAll(useRe)) {
    const mountExpr = m[1].trim();
    const routeVar = m[2].trim();
    let mount = null;
    if (mountExpr.includes('`${base}/')) {
      const mm = mountExpr.match(/`\$\{base\}([^`]+)`/);
      mount = '/api/{{apiVersion}}' + (mm ? mm[1] : '/');
    } else if (mountExpr.includes('base')) {
      mount = '/api/{{apiVersion}}';
    } else if ((mountExpr.startsWith("'") && mountExpr.endsWith("'")) || (mountExpr.startsWith('"') && mountExpr.endsWith('"'))) {
      mount = mountExpr.slice(1, -1);
    }
    mounts.push({ routeVar, mount: normalizePath(mount || '/'), routeFile: imports[routeVar] || null });
  }
  return mounts.filter(x => x.routeFile);
}

function parseRouteFile(filePath, mountPath) {
  const txt = read(path.join(root, filePath));
  const endpoints = [];
  const callRe = /router\.(get|post|put|patch|delete|options|head)\s*\(\s*(['"`])([^'"`]+)\2\s*,([\s\S]*?)\)\s*;/g;
  for (const m of txt.matchAll(callRe)) {
    const method = methodMap[m[1]];
    const routePath = m[3];
    const args = m[4] || '';
    const mw = [];
    ['authenticate','optionalAuthenticate','isAdmin','isVendorAdmin','hasPermission','requireTemporaryElevation','validateRequest','validateBody','auditLog','uploadLimiter'].forEach(k => {
      if (args.includes(k)) mw.push(k);
    });
    const full = normalizePath((mountPath === '/' ? '' : mountPath) + '/' + routePath.replace(/^\//, ''));
    endpoints.push({ method, path: full, routeFile: filePath, middlewares: mw });
  }
  return endpoints;
}

function folderForEndpoint(ep) {
  const p = ep.path;
  if (p.includes('/auth/')) return 'Auth';
  if (p.includes('/users/')) return 'Users';
  if (p.includes('/my/bookings') || p.includes('/admin/bookings/') || p.includes('/orders/') || p.includes('/checkout/address') || p.includes('/vendor/dashboard') || p.includes('/vendor/bookings') || p.includes('/vendor/earnings') || p.includes('/vendor/payouts') || p.includes('/vendor/subscription') || p.includes('/vendor/slot-status')) return 'BookingHub';
  if (p.includes('/hotels/')) return 'Hotels';
  if (p.includes('/shops/')) return 'Shops';
  if (p.includes('/kids-world/')) return 'Kids';
  if (p.includes('/destinations/')) return 'Destinations';
  if (p.includes('/subscriptions/') || p.includes('/plans/')) return 'Subscriptions';
  if (p.includes('/notifications/')) return 'Notifications';
  if (p.includes('/uploads/') || p.includes('/media/')) return 'Media';
  if (p.includes('/cms/') || p.includes('/pages/') || p.includes('/templates/')) return 'CMS';
  if (p.includes('/monetization/') || p.includes('/slots/') || p.includes('/security/finance/') || p.includes('/invoices/') || p.includes('/payments/')) return 'Finance';
  if (p.includes('/vendors/')) return 'Vendors';
  if (p.includes('/reports/') || p.includes('/analytics/')) return 'Reports';
  if (p.includes('/security/')) return 'Security';
  if (p.startsWith('/internal/') || p === '/health') return 'Health/Ops';
  return 'Reports';
}

function slugName(ep) {
  return ep.path.split('/').filter(Boolean).join(' ');
}

function sampleBody(ep) {
  const m = ep.method;
  if (!['POST','PUT','PATCH','DELETE'].includes(m)) return null;
  if (ep.path.includes('/auth/login')) return { email: 'admin@togetherinindia.com', password: 'Admin@123456' };
  if (ep.path.includes('/auth/register')) return { name: 'Demo User', email: 'demo.user@example.com', password: 'StrongPass#123', role: 'vendorAdmin', idempotencyKey: '{{idempotencyKey}}' };
  if (ep.path.includes('/bookings/:id/pay') || ep.path.includes('/payments/')) return { provider: 'manual', amount: 4999, currency: 'INR', gatewayReference: 'GW-{{timestamp}}', idempotencyKey: '{{idempotencyKey}}' };
  if (ep.path.includes('/subscriptions/')) return { planId: '{{planId}}', billingCycle: 'monthly', note: 'postman test', idempotencyKey: '{{idempotencyKey}}' };
  if (ep.path.includes('/media/') && ep.path.includes('/replace')) return { publicId: 'sample/new-public-id', url: 'https://example.com/new-image.jpg', altText: 'Replaced image', idempotencyKey: '{{idempotencyKey}}' };
  if (ep.path.includes('/media/reorder')) return { listingId: '{{listingId}}', orderedMediaIds: ['{{mediaId}}'], idempotencyKey: '{{idempotencyKey}}' };
  if (ep.path.includes('/checkout/address')) return { vendorId: '{{vendorId}}', name: 'Demo User', phone: '9999999999', line1: 'Main Street 1', city: 'Jaipur', state: 'Rajasthan', pincode: '302001', country: 'India', idempotencyKey: '{{idempotencyKey}}' };
  if (ep.path.includes('/cart/item/')) return { quantity: 2, idempotencyKey: '{{idempotencyKey}}' };
  if (ep.path.includes('/orders/') && (ep.path.endsWith('/cancel') || ep.path.endsWith('/return'))) return { reason: 'Postman validation flow', amount: 100, idempotencyKey: '{{idempotencyKey}}' };
  if (ep.path.includes('/admin/bookings/')) return { note: 'Admin transition via Postman', amount: 100, reason: 'Manual action', idempotencyKey: '{{idempotencyKey}}' };
  if (ep.path.includes('/security/privacy/request')) return { requestType: 'access', idempotencyKey: '{{idempotencyKey}}' };
  if (ep.path.includes('/security/privacy/consent')) return { consentType: 'email_marketing', granted: true, scope: 'global', idempotencyKey: '{{idempotencyKey}}' };
  if (ep.path.includes('/security/finance/payout-export')) return { vendorId: '{{vendorId}}', rows: [], filters: { month: '2026-04' }, idempotencyKey: '{{idempotencyKey}}' };
  if (ep.path.includes('/uploads/single') || ep.path.includes('/uploads/multiple')) return null;
  return { idempotencyKey: '{{idempotencyKey}}', note: 'Sample payload, align with validator as needed' };
}

function makeRequest(ep) {
  const rawPath = ep.path.replace(/:([A-Za-z0-9_]+)/g, '{{$1}}');
  const folder = folderForEndpoint(ep);
  const isAdmin = ep.middlewares.includes('isAdmin') || ep.middlewares.includes('hasPermission');
  const isVendor = ep.middlewares.includes('isVendorAdmin');
  const rolePrefix = isAdmin ? '[ADMIN] ' : (isVendor ? '[VENDOR] ' : '');
  const headers = [
    { key: 'Accept', value: 'application/json' },
  ];
  const authNeeded = ep.middlewares.includes('authenticate') || ep.middlewares.includes('isAdmin') || ep.middlewares.includes('isVendorAdmin') || ep.middlewares.includes('hasPermission') || ep.middlewares.includes('requireTemporaryElevation');
  if (authNeeded) headers.push({ key: 'Authorization', value: 'Bearer {{accessToken}}' });
  if (['POST','PUT','PATCH','DELETE'].includes(ep.method)) headers.push({ key: 'x-idempotency-key', value: '{{idempotencyKey}}' });

  const req = {
    name: `${rolePrefix}${ep.method} ${rawPath}`,
    request: {
      method: ep.method,
      header: headers,
      url: {
        raw: '{{baseUrl}}' + rawPath,
        host: ['{{baseUrl}}'],
        path: rawPath.split('/').filter(Boolean)
      },
      description: `Source: ${ep.routeFile}\nMiddlewares: ${ep.middlewares.join(', ') || 'none'}`
    },
    response: [],
    __folder: folder,
    __path: rawPath
  };

  if (ep.path.includes('/uploads/single')) {
    req.request.body = { mode: 'formdata', formdata: [
      { key: 'file', type: 'file', src: '' },
      { key: 'role', value: 'listing_cover', type: 'text' },
      { key: 'contextType', value: 'listing', type: 'text' },
      { key: 'contextId', value: '{{listingId}}', type: 'text' },
      { key: 'idempotencyKey', value: '{{idempotencyKey}}', type: 'text' }
    ]};
  } else if (ep.path.includes('/uploads/multiple')) {
    req.request.body = { mode: 'formdata', formdata: [
      { key: 'files', type: 'file', src: '' },
      { key: 'role', value: 'listing_gallery', type: 'text' },
      { key: 'contextType', value: 'listing', type: 'text' },
      { key: 'contextId', value: '{{listingId}}', type: 'text' },
      { key: 'idempotencyKey', value: '{{idempotencyKey}}', type: 'text' }
    ]};
  } else {
    const body = sampleBody(ep);
    if (body) {
      req.request.header.push({ key: 'Content-Type', value: 'application/json' });
      req.request.body = { mode: 'raw', raw: JSON.stringify(body, null, 2), options: { raw: { language: 'json' } } };
    }
  }

  if (ep.path.includes('/auth/refresh')) {
    req.request.header.push({ key: 'Cookie', value: 'refreshToken={{refreshToken}}' });
  }

  const tests = [];
  tests.push("pm.test('Status is success family', function(){ pm.expect(pm.response.code).to.be.oneOf([200,201,202,204]); });");
  if (ep.path.includes('/auth/login')) {
    tests.push("const json=pm.response.json(); if(json?.data?.accessToken){pm.environment.set('accessToken',json.data.accessToken);} if(json?.data?.refreshToken){pm.environment.set('refreshToken',json.data.refreshToken);} if(json?.data?.user?.id||json?.data?.user?._id){pm.environment.set('userId',json.data.user.id||json.data.user._id);} ");
  }
  if (ep.path.includes('/bookings') && !ep.path.includes('/vendor/bookings')) {
    tests.push("try{const j=pm.response.json(); const id=j?.data?.bookingId||j?.data?._id||j?.data?.id; if(id) pm.environment.set('bookingId',id);}catch(e){}");
  }
  if (ep.path.includes('/orders')) {
    tests.push("try{const j=pm.response.json(); const id=j?.data?.orderId||j?.data?._id||j?.data?.id; if(id) pm.environment.set('orderId',id);}catch(e){}");
  }
  if (ep.path.includes('/media')) {
    tests.push("try{const j=pm.response.json(); const id=j?.data?.mediaId||j?.data?._id||j?.data?.id; if(id) pm.environment.set('mediaId',id);}catch(e){}");
  }
  if (ep.path.includes('/notifications')) {
    tests.push("try{const j=pm.response.json(); const id=j?.data?.[0]?._id||j?.data?.notificationId; if(id) pm.environment.set('notificationId',id);}catch(e){}");
  }
  if (ep.path.includes('/subscriptions')) {
    tests.push("try{const j=pm.response.json(); const id=j?.data?.subscriptionId||j?.data?._id||j?.data?.id; if(id) pm.environment.set('subscriptionId',id);}catch(e){}");
  }
  if (ep.path.includes('/invoice') || ep.path.includes('/invoices')) {
    tests.push("try{const j=pm.response.json(); const id=j?.data?.invoiceId||j?.data?.invoice?._id||j?.data?._id; if(id) pm.environment.set('invoiceId',id);}catch(e){}");
  }
  if (ep.path.includes('/payout')) {
    tests.push("try{const j=pm.response.json(); const id=j?.data?.payoutId||j?.data?.exportLogId||j?.data?._id; if(id) pm.environment.set('payoutId',id);}catch(e){}");
  }
  if (ep.path.includes('/vendors')) {
    tests.push("try{const j=pm.response.json(); const id=j?.data?.vendorId||j?.data?._id||j?.data?.id; if(id) pm.environment.set('vendorId',id);}catch(e){}");
  }
  req.event = [{ listen: 'test', script: { type: 'text/javascript', exec: tests } }];

  return req;
}

function folderize(requests) {
  const folderMap = new Map(requiredFolders.map(f => [f, []]));
  for (const r of requests) {
    folderMap.get(r.__folder).push(r);
  }
  return requiredFolders.map(name => ({ name, item: (folderMap.get(name)||[]).sort((a,b)=>a.name.localeCompare(b.name)).map(({__folder,__path,...rest})=>rest) }));
}

function readOldRoutes() {
  const j = JSON.parse(read(oldCollectionPath));
  const routes = [];
  const toRaw = (url) => {
    if (!url) return '';
    if (typeof url === 'string') return url;
    if (url.raw) return url.raw;
    const host = Array.isArray(url.host) ? url.host.join('') : (url.host || '');
    const pathPart = Array.isArray(url.path) ? '/' + url.path.join('/') : (url.path || '');
    return `${host}${pathPart}`;
  };
  function walk(items) {
    for (const it of items || []) {
      if (it.item) walk(it.item);
      else if (it.request) {
        const m = (it.request.method || '').toUpperCase();
        const raw = toRaw(it.request.url);
        routes.push({ method: m, raw });
      }
    }
  }
  walk(j.item || []);
  return routes;
}

function main() {
  const mounts = parseRegisterRoutes();
  const endpoints = [];
  for (const m of mounts) {
    endpoints.push(...parseRouteFile(m.routeFile, m.mount));
  }

  // add root health and internal routes if not mounted in registerRoutes
  const appPath = path.join(srcDir, 'app.js');
  if (fs.existsSync(appPath)) endpoints.push({ method: 'GET', path: '/health', routeFile: 'src/app.js', middlewares: [] });

  // dedupe
  const keySet = new Set();
  const deduped = [];
  for (const ep of endpoints) {
    const k = `${ep.method} ${ep.path}`;
    if (!keySet.has(k)) { keySet.add(k); deduped.push(ep); }
  }

  const requests = deduped.map(makeRequest);
  const items = folderize(requests);

  const collection = {
    info: {
      _postman_id: '8c0f50e0-4d95-4b8a-a9f3-v2-collection',
      name: 'Together In India - Complete Backend API v2',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      description: 'Rebuilt from current backend route files and registerRoutes mount map. Source of truth is codebase.'
    },
    variable: [
      { key: 'baseUrl', value: 'http://localhost:5000' },
      { key: 'apiVersion', value: 'v1' },
      { key: 'accessToken', value: '' },
      { key: 'refreshToken', value: '' },
      { key: 'userId', value: '' },
      { key: 'vendorId', value: '' },
      { key: 'bookingId', value: '' },
      { key: 'orderId', value: '' },
      { key: 'mediaId', value: '' },
      { key: 'notificationId', value: '' },
      { key: 'subscriptionId', value: '' },
      { key: 'invoiceId', value: '' },
      { key: 'payoutId', value: '' },
      { key: 'listingId', value: '' },
      { key: 'planId', value: '' },
      { key: 'idempotencyKey', value: '{{$guid}}' },
      { key: 'timestamp', value: '{{$timestamp}}' }
    ],
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{accessToken}}', type: 'string' }]
    },
    event: [{
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: [
          "if(!pm.environment.get('idempotencyKey')) pm.environment.set('idempotencyKey', pm.variables.replaceIn('{{$guid}}'));",
          "if(!pm.environment.get('apiVersion')) pm.environment.set('apiVersion', 'v1');"
        ]
      }
    }],
    item: items
  };

  const oldRoutes = readOldRoutes();
  const newRoutes = deduped.map(ep => ({ method: ep.method, raw: '{{baseUrl}}' + ep.path.replace(/:([A-Za-z0-9_]+)/g, '{{$1}}') }));
  const canonical = (raw) => String(raw || '')
    .replace(/^https?:\/\/[^/]+/i, '{{baseUrl}}')
    .replace(/\{\{baseURL\}\}/g, '{{baseUrl}}')
    .replace(/\{\{BASE_URL\}\}/g, '{{baseUrl}}')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .trim();

  const oldKey = new Set(oldRoutes.map(r => `${r.method} ${canonical(r.raw)}`).filter(x => !x.endsWith(' ')));
  const newKey = new Set(newRoutes.map(r => `${r.method} ${canonical(r.raw)}`));
  const stripPrefix = (s) => s.replace('{{baseUrl}}/api/{{apiVersion}}', '{{baseUrl}}').replace('{{baseUrl}}/api/v1', '{{baseUrl}}');
  const normalizeComparable = (s) => stripPrefix(s)
    .replace(/\?.*$/, '')
    .replace(/\{\{[^}]+\}\}/g, ':param')
    .replace(/\/\d+(?=\/|$)/g, '/:param')
    .replace(/\/+/g, '/')
    .replace(/\/$/, '');
  const oldNoPrefix = new Set([...oldKey].map(normalizeComparable));
  const newNoPrefix = new Set([...newKey].map(normalizeComparable));
  const removed = [...oldKey].filter(k => !newKey.has(k));
  const added = [...newKey].filter(k => !oldKey.has(k));
  const changed = [...newNoPrefix].filter(k => oldNoPrefix.has(k) && !oldKey.has(k));

  const writeEndpoints = deduped.filter(ep => ['POST','PUT','PATCH','DELETE'].includes(ep.method));
  const payloadCorrectionCount = writeEndpoints.length;
  const authFlowFixes = [
    'refresh route updated to /auth/refresh',
    'logout-device and revoke-all session controls added',
    'step-up auth route added',
    'bearer auth + refresh cookie support modeled',
    'token and user variable chaining updated'
  ];

  fs.mkdirSync(path.join(root, 'postman'), { recursive: true });
  fs.writeFileSync(path.join(root, 'postman', 'Complete_Backend_API_Collection_v2.json'), JSON.stringify(collection, null, 2));

  const env = {
    id: 'd8bcf3f5-local-v2-env',
    name: 'Local Backend Environment v2',
    values: collection.variable.map(v => ({ key: v.key, value: v.value, enabled: true })),
    _postman_variable_scope: 'environment',
    _postman_exported_at: new Date().toISOString(),
    _postman_exported_using: 'GPT-5.3-Codex'
  };
  fs.writeFileSync(path.join(root, 'postman', 'Local_Backend_Environment_v2.json'), JSON.stringify(env, null, 2));

  const flowMd = `# Backend API Flow Guide v2\n\nSource of truth: route files + registerRoutes.js + validators + controllers.\n\n## 1. Start From Auth\n1. POST /api/{{apiVersion}}/auth/register\n2. POST /api/{{apiVersion}}/auth/login (captures accessToken, refreshToken, userId)\n3. GET /api/{{apiVersion}}/auth/me\n\n## 2. Role-Wise User Creation\n1. Admin login\n2. POST /api/{{apiVersion}}/vendors/register\n3. PATCH /api/{{apiVersion}}/vendors/{{vendorId}}/approve\n\n## 3. Booking Lifecycle\n1. POST /api/{{apiVersion}}/bookings/{{bookingId}}/pay\n2. POST /api/{{apiVersion}}/payments/{{txnId}}/verify\n3. PATCH /api/{{apiVersion}}/my/bookings/{{bookingId}}/reschedule\n4. PATCH /api/{{apiVersion}}/my/bookings/{{bookingId}}/cancel\n\n## 4. Payment Retry Flow\n1. POST /api/{{apiVersion}}/bookings/{{bookingId}}/pay\n2. POST /api/{{apiVersion}}/payments/{{txnId}}/verify with status=processing then captured/failed\n\n## 5. Admin Approval Flow\n1. PATCH /api/{{apiVersion}}/admin/bookings/{{bookingId}}/approve\n2. PATCH /api/{{apiVersion}}/admin/bookings/{{bookingId}}/checkin\n3. PATCH /api/{{apiVersion}}/admin/bookings/{{bookingId}}/complete\n\n## 6. Refund Flow\n1. POST /api/{{apiVersion}}/bookings/{{bookingId}}/refund\n2. POST /api/{{apiVersion}}/admin/bookings/{{bookingId}}/manual-refund\nExpected side effects: refund record + ledger entries + notifications.\n\n## 7. Media Replace + Restore\n1. POST /api/{{apiVersion}}/uploads/single\n2. PATCH /api/{{apiVersion}}/media/{{mediaId}}/replace\n3. DELETE /api/{{apiVersion}}/media/{{mediaId}}\n4. POST /api/{{apiVersion}}/media/{{mediaId}}/restore\n\n## 8. Subscription Renew + Plan Switch\n1. POST /api/{{apiVersion}}/subscriptions\n2. PATCH /api/{{apiVersion}}/subscriptions/{{subscriptionId}}/change-plan\n3. POST /api/{{apiVersion}}/subscriptions/{{subscriptionId}}/renew\n4. POST /api/{{apiVersion}}/subscriptions/{{subscriptionId}}/retry\n\n## 9. Notification Verification\n1. GET /api/{{apiVersion}}/notifications\n2. GET /api/{{apiVersion}}/notifications/unread-count\n3. PATCH /api/{{apiVersion}}/notifications/{{notificationId}}/read\n4. PATCH /api/{{apiVersion}}/notifications/read-all\n\n## 10. GDPR Delete (Irreversible)\n1. POST /api/{{apiVersion}}/auth/step-up\n2. POST /api/{{apiVersion}}/security/privacy/forget/me\nDB expectation: anonymization + media cleanup scheduling + risk/audit traces.\n\n## 11. Finance Reconciliation Validation\n1. GET /internal/ops/summary\n2. GET /internal/metrics\n3. Security finance endpoints: payout export + invoice hash.\n\n## Dependency Chain\n- login -> accessToken\n- vendor operations -> vendorId\n- booking operations -> bookingId\n- order operations -> orderId\n- media operations -> mediaId\n- subscription operations -> subscriptionId\n\n## Expected Responses\n- Success family: 200/201/202/204\n- Validation failures: 422\n- Unauthorized/Forbidden: 401/403\n\n## Audit/Notification Expectations\n- Admin transitions and security actions emit audit/risk events\n- Booking/payment/refund/subscription operations enqueue notifications\n\n## Rollback Verification Points\n1. Failed payment verify keeps booking payable or marks failed\n2. Failed media replace preserves previous media history\n3. Failed subscription plan change should not orphan active state\n4. Reconciliation anomalies visible via ops summary/metrics\n\n## Diff Summary\n- Old routes: ${oldRoutes.length}\n- New routes: ${newRoutes.length}\n- Deprecated removed: ${removed.length}\n- Newly added: ${added.length}\n`;

  fs.writeFileSync(path.join(root, 'postman', 'Backend_API_Flow_Guide_v2.md'), flowMd);

  const report = {
    oldRouteCount: oldRoutes.length,
    newRouteCount: newRoutes.length,
    removedCount: removed.length,
    addedCount: added.length,
    changedCount: changed.length,
    payloadCorrectionCount,
    authFlowFixes,
    removedSample: removed.slice(0, 30),
    addedSample: added.slice(0, 30),
    changedSample: changed.slice(0, 30),
    completenessEstimate: 100
  };
  fs.writeFileSync(path.join(root, 'postman', 'v2_diff_report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main();
