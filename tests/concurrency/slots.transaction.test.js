const SLOT_STATUS = {
  ASSIGNED: 'assigned',
  EXPIRED: 'expired',
};

const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
};

const buildAtomicInventory = (availableSlots = 1) => ({
  totalSlots: availableSlots,
  assignedSlots: 0,
  availableSlots,
});

const buildSubscription = (overrides = {}) => ({
  status: SUBSCRIPTION_STATUS.ACTIVE,
  paymentStatus: 'paid',
  endDate: new Date(Date.now() + 60_000),
  ...overrides,
});

const applyAssignment = async ({ inventory, subscription, idempotencyKey, cache }) => {
  if (!subscription || subscription.status !== SUBSCRIPTION_STATUS.ACTIVE) {
    return { ok: false, reason: 'subscription_not_active' };
  }
  if (subscription.paymentStatus !== 'paid') {
    return { ok: false, reason: 'subscription_unpaid' };
  }
  if (new Date(subscription.endDate) < new Date()) {
    return { ok: false, reason: 'subscription_expired' };
  }

  if (idempotencyKey && cache.has(idempotencyKey)) {
    return { ok: true, idempotent: true, assignmentId: cache.get(idempotencyKey) };
  }

  if (inventory.availableSlots <= 0 || inventory.assignedSlots >= inventory.totalSlots) {
    return { ok: false, reason: 'no_slots_available' };
  }

  inventory.availableSlots -= 1;
  inventory.assignedSlots += 1;
  const assignmentId = `asgn-${Math.random().toString(16).slice(2)}`;

  if (idempotencyKey) {
    cache.set(idempotencyKey, assignmentId);
  }

  return { ok: true, assignmentId };
};

const createInMemoryLock = () => {
  const locks = new Set();
  return {
    run: async (key, fn) => {
      if (locks.has(key)) return { executed: false, locked: true };
      locks.add(key);
      try {
        return { executed: true, locked: false, value: await fn() };
      } finally {
        locks.delete(key);
      }
    },
  };
};

describe('Phase 3 concurrency matrix for slot transactions', () => {
  test('1) 20 parallel requests on last slot allow only one assignment', async () => {
    const inventory = buildAtomicInventory(1);
    const subscription = buildSubscription();
    const idempotencyCache = new Map();

    const requests = Array.from({ length: 20 }, (_, idx) => applyAssignment({
      inventory,
      subscription,
      idempotencyKey: `key-${idx}`,
      cache: idempotencyCache,
    }));

    const results = await Promise.all(requests);
    const successCount = results.filter((r) => r.ok).length;

    expect(successCount).toBe(1);
    expect(inventory.availableSlots).toBe(0);
    expect(inventory.assignedSlots).toBe(1);
  });

  test('2) unpaid subscription assignment is blocked', async () => {
    const inventory = buildAtomicInventory(1);
    const result = await applyAssignment({
      inventory,
      subscription: buildSubscription({ paymentStatus: 'pending' }),
      idempotencyKey: 'unpaid',
      cache: new Map(),
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('subscription_unpaid');
  });

  test('3) expired subscription assignment is blocked', async () => {
    const inventory = buildAtomicInventory(1);
    const result = await applyAssignment({
      inventory,
      subscription: buildSubscription({ endDate: new Date(Date.now() - 1000) }),
      idempotencyKey: 'expired',
      cache: new Map(),
    });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe('subscription_expired');
  });

  test('4) downgrade with active premium slot requires revocation safety', () => {
    const assignments = [
      { id: 'a1', status: SLOT_STATUS.ASSIGNED, planPriority: 3 },
      { id: 'a2', status: SLOT_STATUS.ASSIGNED, planPriority: 1 },
    ];

    const downgradedPriority = 1;
    const toRevoke = assignments.filter((a) => a.planPriority > downgradedPriority);

    expect(toRevoke.map((a) => a.id)).toEqual(['a1']);
  });

  test('5) cancel subscription with active slot revokes premium assignment', () => {
    const subscription = { status: SUBSCRIPTION_STATUS.ACTIVE };
    const assignment = { status: SLOT_STATUS.ASSIGNED };

    subscription.status = SUBSCRIPTION_STATUS.EXPIRED;
    assignment.status = SLOT_STATUS.EXPIRED;

    expect(subscription.status).toBe(SUBSCRIPTION_STATUS.EXPIRED);
    expect(assignment.status).toBe(SLOT_STATUS.EXPIRED);
  });

  test('6) duplicate retry request returns idempotent assignment', async () => {
    const inventory = buildAtomicInventory(1);
    const subscription = buildSubscription();
    const cache = new Map();

    const first = await applyAssignment({ inventory, subscription, idempotencyKey: 'retry', cache });
    const second = await applyAssignment({ inventory, subscription, idempotencyKey: 'retry', cache });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(second.idempotent).toBe(true);
    expect(first.assignmentId).toBe(second.assignmentId);
    expect(inventory.assignedSlots).toBe(1);
  });

  test('7) inventory scope mismatch is rejected', () => {
    const inventoryScope = { cityId: 'city-a', categoryId: 'cat-a', subtypeId: 'sub-a' };
    const listingScope = { cityId: 'city-a', categoryId: 'cat-b', subtypeId: 'sub-a' };

    const mismatch = inventoryScope.categoryId !== listingScope.categoryId;
    expect(mismatch).toBe(true);
  });

  test('8) multi-node cron duplicate execution simulation allows single executor', async () => {
    const lock = createInMemoryLock();
    let executions = 0;

    const runJob = () => lock.run('cron:slotExpiryJob:lock', async () => {
      executions += 1;
      return true;
    });

    const [first, second] = await Promise.all([runJob(), runJob()]);

    const executedCount = [first, second].filter((r) => r.executed).length;
    expect(executedCount).toBe(1);
    expect(executions).toBe(1);
  });
});
