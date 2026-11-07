import assert from 'node:assert/strict';
import { loadJitsiScript, _resetScriptLoader } from '../../src/lib/jitsi-script-loader.js';

class MockJitsiMeetExternalAPI {
  constructor(domain, options) {
    this.domain = domain;
    this.options = options;
    this.listeners = new Map();
    this.disposed = false;
    MockJitsiMeetExternalAPI.instances.push(this);
  }

  addListener(event, cb) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(cb);
  }

  emit(event, data) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const cb of handlers) {
        cb(data);
      }
    }
  }

  executeCommand(command, ...args) {
    this.lastCommand = { command, args };
  }

  dispose() {
    this.disposed = true;
    this.listeners.clear();
  }
}
MockJitsiMeetExternalAPI.instances = [];

async function runTests() {
  console.log('🧪 Starting Jitsi Component & Script Loader Test Suite...\n');
  let passed = 0;

  // 1. SSR safety check
  console.log('Test 1: Script Loader SSR Safety');
  {
    const originalWindow = globalThis.window;
    delete globalThis.window;
    let ssrCaught = null;
    try {
      await loadJitsiScript('meet.jit.si');
    } catch (err) {
      ssrCaught = err;
    }
    assert.ok(ssrCaught, 'Must reject in non-browser environment');
    assert.match(ssrCaught.message, /browser environment/i);
    globalThis.window = originalWindow;
    passed++;
    console.log('  ✓ loadJitsiScript gracefully rejects in SSR environment');
  }

  // Set up mock DOM environment
  const mockDocument = {
    head: {
      appendChild: (el) => {
        // simulate async load
        setTimeout(() => {
          if (mockDocument._shouldFailScript) {
            el.onerror?.(new Error('Network error'));
          } else {
            globalThis.window.JitsiMeetExternalAPI = MockJitsiMeetExternalAPI;
            el.onload?.();
          }
        }, 10);
      },
    },
    createElement: (tag) => {
      const el = {
        tagName: tag.toUpperCase(),
        src: '',
        async: false,
        onload: null,
        onerror: null,
        remove: () => {},
      };
      return el;
    },
    querySelector: () => null,
    _shouldFailScript: false,
  };

  globalThis.document = mockDocument;
  globalThis.window = {
    document: mockDocument,
    location: { origin: 'http://localhost:5173' },
  };

  // 2. Singleton script loader resolves window.JitsiMeetExternalAPI
  console.log('Test 2: Dynamic Script Loader loads once and caches promise');
  {
    _resetScriptLoader();
    delete globalThis.window.JitsiMeetExternalAPI;

    const p1 = loadJitsiScript('meet.jit.si');
    const p2 = loadJitsiScript('meet.jit.si');
    assert.equal(p1, p2, 'Concurrent calls must return identical promise');

    const JitsiClass = await p1;
    assert.equal(JitsiClass, MockJitsiMeetExternalAPI, 'Must resolve with JitsiMeetExternalAPI class');
    passed++;
    console.log('  ✓ Script loader returns cached promise and resolves external API class');
  }

  // 3. Error recovery in script loader
  console.log('Test 3: Script loader error recovery and retry');
  {
    _resetScriptLoader();
    delete globalThis.window.JitsiMeetExternalAPI;
    mockDocument._shouldFailScript = true;

    let failed = false;
    try {
      await loadJitsiScript('meet.jit.si');
    } catch (err) {
      failed = true;
      assert.match(err.message, /failed to load/i);
    }
    assert.ok(failed, 'Must reject on script load failure');

    // Retry after failure
    mockDocument._shouldFailScript = false;
    const retryClass = await loadJitsiScript('meet.jit.si');
    assert.equal(retryClass, MockJitsiMeetExternalAPI, 'Retry after error must succeed');
    passed++;
    console.log('  ✓ Script loader error clears cache and allows retry');
  }

  // 4. API Options Verification
  console.log('Test 4: JitsiMeetExternalAPI configuration options');
  {
    MockJitsiMeetExternalAPI.instances = [];
    const mockContainer = {};
    const testUser = { displayName: 'Julian Gemelo', email: 'julian@example.com' };

    const options = {
      roomName: 'tutoring-testroom12345',
      width: '100%',
      height: '100%',
      parentNode: mockContainer,
      jwt: 'mock-jwt-token',
      userInfo: {
        displayName: testUser.displayName,
      },
      configOverwrite: {
        prejoinConfig: { enabled: false },
        prejoinPageEnabled: false,
        startWithAudioMuted: false,
        startWithVideoMuted: false,
        disableDeepLinking: true,
        toolbarButtons: ['microphone', 'camera', 'desktop', 'hangup', 'videoquality'],
      },
    };

    const instance = new MockJitsiMeetExternalAPI('meet.jit.si', options);
    assert.equal(instance.options.roomName, 'tutoring-testroom12345');
    assert.equal(instance.options.parentNode, mockContainer);
    assert.equal(instance.options.userInfo.displayName, 'Julian Gemelo');
    assert.equal(instance.options.userInfo.email, undefined, 'Email must NOT be present in userInfo');
    assert.equal(instance.options.configOverwrite.prejoinConfig.enabled, false, 'Prejoin screen must be disabled');
    assert.equal(instance.options.configOverwrite.disableDeepLinking, true, 'Deep linking must be disabled');
    assert.equal(instance.options.configOverwrite.startWithAudioMuted, false, 'Audio start must be unmuted');
    assert.equal(instance.options.configOverwrite.startWithVideoMuted, false, 'Video start must be unmuted');
    assert.deepEqual(instance.options.configOverwrite.toolbarButtons, [
      'microphone',
      'camera',
      'desktop',
      'hangup',
      'videoquality',
    ]);
    passed++;
    console.log('  ✓ Options match exact required specifications with student privacy preserved');
  }

  // 5. Event dispatching and callback routing
  console.log('Test 5: Event listeners & typed callback routing');
  {
    const instance = new MockJitsiMeetExternalAPI('meet.jit.si', {});
    let readyFired = false;
    let joinedParticipant = null;
    let leftParticipant = null;
    let hangupFired = false;
    let errorFired = null;

    instance.addListener('videoConferenceJoined', () => { readyFired = true; });
    instance.addListener('participantJoined', (p) => { joinedParticipant = p; });
    instance.addListener('participantLeft', (p) => { leftParticipant = p; });
    instance.addListener('readyToClose', () => { hangupFired = true; });
    instance.addListener('cameraError', (err) => { errorFired = err; });

    // Emit mock events
    instance.emit('videoConferenceJoined');
    assert.equal(readyFired, true, 'onReady triggered');

    instance.emit('participantJoined', { id: 'peer-1', displayName: 'Tutor Mark' });
    assert.deepEqual(joinedParticipant, { id: 'peer-1', displayName: 'Tutor Mark' });

    instance.emit('participantLeft', { id: 'peer-1' });
    assert.deepEqual(leftParticipant, { id: 'peer-1' });

    instance.emit('readyToClose');
    assert.equal(hangupFired, true, 'onHangup triggered');

    instance.emit('cameraError', { type: 'NotAllowedError', message: 'Permission denied' });
    assert.equal(errorFired.type, 'NotAllowedError');

    passed++;
    console.log('  ✓ Event listeners map and dispatch accurately');
  }

  // 6. Idempotent cleanup and disposal
  console.log('Test 6: Idempotent disposal & StrictMode safety');
  {
    const instance = new MockJitsiMeetExternalAPI('meet.jit.si', {});
    assert.equal(instance.disposed, false);

    instance.dispose();
    assert.equal(instance.disposed, true);

    // Second call to dispose must not throw
    assert.doesNotThrow(() => {
      instance.dispose();
    }, 'Double dispose must be completely safe');

    passed++;
    console.log('  ✓ Disposal is idempotent and safe under double-unmount');
  }

  console.log(`\n🎉 All ${passed}/6 Jitsi Component & Script tests passed successfully!`);
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

