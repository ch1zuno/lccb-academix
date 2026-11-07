import assert from 'node:assert/strict';
import {
  ChatEnvelopeSchema,
  IdeEnvelopeSchema,
  CentrifugoService,
} from '../../src/services/realtime/CentrifugoService.js';
import { UnauthorizedError } from 'centrifuge';

async function runTests() {
  console.log('🧪 Starting Centrifuge Client Realtime Test Suite...\n');
  let passed = 0;

  // 1. Chat Envelope Schema Validation
  console.log('Test 1: Chat Envelope Validation');
  {
    const valid = {
      v: 1,
      type: 'chat',
      id: 'msg_123',
      text: 'Hello classroom',
      ts: new Date().toISOString(),
    };
    const res = ChatEnvelopeSchema.safeParse(valid);
    assert.equal(res.success, true, 'Valid chat envelope must pass');

    const invalid = {
      v: 2, // invalid version
      type: 'chat',
      id: 'msg_123',
      text: 'Hello',
      ts: 'now',
    };
    const badRes = ChatEnvelopeSchema.safeParse(invalid);
    assert.equal(badRes.success, false, 'Invalid chat envelope version must fail');
    passed++;
    console.log('  ✓ ChatEnvelopeSchema validates correctly');
  }

  // 2. IDE Envelope Schema Validation
  console.log('Test 2: IDE Envelope Validation');
  {
    const validIde = {
      v: 1,
      type: 'ide',
      seq: 42,
      code: 'console.log("peer code");',
      language: 'javascript',
      cursor: { line: 10, column: 5 },
      ts: new Date().toISOString(),
    };
    const res = IdeEnvelopeSchema.safeParse(validIde);
    assert.equal(res.success, true, 'Valid IDE envelope must pass');

    const invalidIde = {
      v: 1,
      type: 'ide',
      seq: 'not-a-number',
      code: 'foo',
      ts: new Date().toISOString(),
    };
    const badRes = IdeEnvelopeSchema.safeParse(invalidIde);
    assert.equal(badRes.success, false, 'Non-integer seq must fail');
    passed++;
    console.log('  ✓ IdeEnvelopeSchema validates correctly');
  }

  // 3. UnauthorizedError on 401 in getToken
  console.log('Test 3: Token 401 handling throws UnauthorizedError');
  {
    const service = new CentrifugoService({
      wsUrl: 'ws://localhost:8000/connection/websocket',
      tokenEndpoint: 'http://localhost:4000/api/mock/token',
    });

    // Mock fetch returning 401
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      status: 401,
      ok: false,
    });

    try {
      const client = service.getClient();
      let caught = null;
      try {
        await client._getToken();
      } catch (err) {
        caught = err;
      }
      assert.ok(caught instanceof UnauthorizedError, 'Must throw UnauthorizedError on 401');
      service.disconnect();
      passed++;
      console.log('  ✓ 401 response throws UnauthorizedError to halt retry loop');
    } finally {
      globalThis.fetch = originalFetch;
    }
  }

  // 4. Reference-Counted Subscriptions (React 19 StrictMode safety)
  console.log('Test 4: Ref-counted subscriptions prevent duplicate channel registrations');
  {
    const service = new CentrifugoService({
      wsUrl: 'ws://localhost:8000/connection/websocket',
      getToken: async () => 'test-token',
    });

    // Initial subscribe
    const entry1 = service.subscribeToRoom('SES-STRICT-TEST');
    assert.equal(entry1.refCount, 1, 'Initial refCount must be 1');

    // Second subscribe (as occurs in StrictMode remount or multiple consumers)
    const entry2 = service.subscribeToRoom('SES-STRICT-TEST');
    assert.equal(entry2.refCount, 2, 'Second subscribe must increment refCount');
    assert.equal(entry1, entry2, 'Must reuse identical subscription entry');

    // First unsubscribe
    service.unsubscribeFromRoom('SES-STRICT-TEST');
    assert.equal(entry1.refCount, 1, 'First unsubscribe decrements refCount without tearing down');
    assert.ok(service.roomSubscriptions.has('SES-STRICT-TEST'), 'Room must still exist');

    // Final unsubscribe
    service.unsubscribeFromRoom('SES-STRICT-TEST');
    assert.equal(service.roomSubscriptions.has('SES-STRICT-TEST'), false, 'Room torn down when refCount reaches 0');
    service.disconnect();
    passed++;
    console.log('  ✓ Subscription reference-counting protects StrictMode lifecycle');
  }

  // 5. Presence Aggregation by User ID
  console.log('Test 5: Multi-connection presence aggregation by User ID');
  {
    const service = new CentrifugoService({
      getToken: async () => 'test-token',
    });
    const entry = service.subscribeToRoom('SES-PRESENCE-TEST');

    // Client connection 1 and 2 for same user TE-128 (e.g. two tabs or rapid reconnect)
    service._aggregatePresence(entry, {
      conn_1: {
        user: 'TE-128',
        connInfo: { name: 'Student 128', role: 'student' },
      },
      conn_2: {
        user: 'TE-128',
        connInfo: { name: 'Student 128', role: 'student' },
      },
      conn_3: {
        user: 'TU-042',
        connInfo: { name: 'Tutor 042', role: 'tutor' },
      },
    });

    const presList = service.getPresence('SES-PRESENCE-TEST');
    assert.equal(presList.length, 2, '3 connections from 2 users must aggregate to 2 unique presence entries');

    assert.equal(service.isUserOnline('SES-PRESENCE-TEST', 'TE-128'), true);
    assert.equal(service.isUserOnline('SES-PRESENCE-TEST', 'TU-042'), true);
    assert.equal(service.isUserOnline('SES-PRESENCE-TEST', 'UNKNOWN-USER'), false);

    assert.equal(service.isRoleOnline('SES-PRESENCE-TEST', 'student'), true);
    assert.equal(service.isRoleOnline('SES-PRESENCE-TEST', 'tutor'), true);
    assert.equal(service.isRoleOnline('SES-PRESENCE-TEST', 'faculty'), false);

    // Simulate conn_1 leaving (user still has conn_2 active)
    service._handleLeave(entry, {
      info: { user: 'TE-128' },
    });
    assert.equal(service.isUserOnline('SES-PRESENCE-TEST', 'TE-128'), true, 'User remains online with 1 connection left');

    // Simulate conn_2 leaving (user now completely disconnected)
    service._handleLeave(entry, {
      info: { user: 'TE-128' },
    });
    assert.equal(service.isUserOnline('SES-PRESENCE-TEST', 'TE-128'), false, 'User goes offline when last connection leaves');

    service.unsubscribeFromRoom('SES-PRESENCE-TEST');
    service.disconnect();
    passed++;
    console.log('  ✓ Presence aggregation correctly collapses multiple client connections');
  }

  // 6. Message Deduplication by ID
  console.log('Test 6: Chat message deduplication');
  {
    const service = new CentrifugoService({
      getToken: async () => 'test-token',
    });
    const entry = service.subscribeToRoom('SES-DEDUP-TEST');

    let dispatchCount = 0;
    service.onMessage('SES-DEDUP-TEST', () => {
      dispatchCount++;
    });

    const publication = {
      data: {
        v: 1,
        type: 'chat',
        id: 'msg_fixed_123',
        text: 'Duplicate test',
        ts: new Date().toISOString(),
      },
      info: {
        user: 'TE-128',
        connInfo: { name: 'Student 128', role: 'student' },
      },
    };

    // First arrival
    service._handlePublication(entry, publication);
    assert.equal(dispatchCount, 1, 'First publication must dispatch');

    // Duplicate arrival
    service._handlePublication(entry, publication);
    assert.equal(dispatchCount, 1, 'Duplicate publication with same id must be suppressed');

    service.unsubscribeFromRoom('SES-DEDUP-TEST');
    service.disconnect();
    passed++;
    console.log('  ✓ Chat deduplication prevents duplicate renders');
  }

  // 7. IDE Sequence and Local Echo Suppression
  console.log('Test 7: IDE Sequence Ordering & Echo Suppression');
  {
    const service = new CentrifugoService({
      currentUserId: 'MY-LOCAL-USER',
      getToken: async () => 'test-token',
    });
    const entry = service.subscribeToRoom('SES-IDE-TEST');

    let remoteUpdates = 0;
    let lastCode = '';
    service.onIdeState('SES-IDE-TEST', (state, meta) => {
      if (meta?.isRemote) {
        remoteUpdates++;
        lastCode = state.code;
      }
    });

    // 1. Local publication (from self) -> should not trigger remoteUpdate
    service._handlePublication(entry, {
      data: {
        v: 1,
        type: 'ide',
        seq: 1,
        code: 'const x = 1;',
        language: 'javascript',
        ts: new Date().toISOString(),
      },
      info: {
        user: 'MY-LOCAL-USER',
      },
    });
    assert.equal(remoteUpdates, 0, 'Local user broadcast must not trigger remote listener');

    // 2. Remote publication seq: 2 -> should trigger remote listener
    service._handlePublication(entry, {
      data: {
        v: 1,
        type: 'ide',
        seq: 2,
        code: 'const x = 2;',
        language: 'javascript',
        ts: new Date().toISOString(),
      },
      info: {
        user: 'PEER-USER',
      },
    });
    assert.equal(remoteUpdates, 1, 'Remote peer broadcast must trigger remote listener');
    assert.equal(lastCode, 'const x = 2;');

    // 3. Out-of-order / Stale remote publication seq: 1 -> discarded
    service._handlePublication(entry, {
      data: {
        v: 1,
        type: 'ide',
        seq: 1,
        code: 'const x = 0;',
        language: 'javascript',
        ts: new Date().toISOString(),
      },
      info: {
        user: 'PEER-USER',
      },
    });
    assert.equal(remoteUpdates, 1, 'Stale seq <= lastReceivedSeq must be dropped');
    assert.equal(lastCode, 'const x = 2;', 'Code state remains at seq 2');

    service.unsubscribeFromRoom('SES-IDE-TEST');
    service.disconnect();
    passed++;
    console.log('  ✓ IDE echo suppression and sequence ordering verified');
  }

  console.log(`\n🎉 All ${passed}/7 Centrifuge client tests passed successfully!`);
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
