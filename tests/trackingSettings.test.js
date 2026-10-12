const assert = require("node:assert/strict");
const { after, test } = require("node:test");
const {
  toPublicSettings,
  validateSettings,
} = require("../src/controllers/trackingSettingsController.ts");
const { authorize } = require("../src/middleware/roleAuth.ts");
const tracking = require("../../chalak-champs-client/src/lib/trackingSettings.ts");

const validSettings = {
  gtm: { enabled: true, containerId: "GTM-AB123" },
  ga4: { enabled: true, measurementId: "G-AB12345678" },
  metaPixel: { enabled: true, pixelId: "123456789012345" },
  googleAds: {
    enabled: true,
    conversionId: "AW-123456789",
    purchaseLabel: "Conversion_Label-123",
  },
  serverSide: {
    enabled: true,
    stapeContainerUrl: "https://track.example.com",
  },
};

test("accepts valid browser-safe tracking settings", () => {
  const result = validateSettings(validSettings);
  assert.ok("settings" in result);
  assert.deepEqual(result.settings, validSettings);
});

test("rejects malformed identifiers, unapproved URLs, and secret fields", () => {
  const result = validateSettings({
    ...validSettings,
    gtm: { enabled: true, containerId: "javascript:alert(1)" },
    serverSide: {
      enabled: true,
      stapeContainerUrl: "http://localhost:3000",
      accessToken: "must-not-be-accepted",
    },
  });

  assert.ok("errors" in result);
  assert.ok(result.errors["gtm.containerId"]);
  assert.ok(result.errors["serverSide.stapeContainerUrl"]);
  assert.ok(result.errors["serverSide.accessToken"]);
});

test("public settings projection never returns unknown private fields", () => {
  const settingsWithSecret = {
    ...validSettings,
    serverSide: {
      ...validSettings.serverSide,
      accessToken: "private-token",
    },
  };
  const exposed = toPublicSettings(settingsWithSecret);

  assert.deepEqual(Object.keys(exposed.serverSide).sort(), [
    "enabled",
    "stapeContainerUrl",
  ]);
});

test("admin authorization rejects anonymous and non-admin users", () => {
  const middleware = authorize("admin");
  const response = {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
  let nextCalls = 0;

  middleware({}, response, () => {
    nextCalls += 1;
  });
  assert.equal(response.statusCode, 401);

  middleware({ user: { role: "student" } }, response, () => {
    nextCalls += 1;
  });
  assert.equal(response.statusCode, 403);

  response.statusCode = 200;
  middleware({ user: { role: "admin" } }, response, () => {
    nextCalls += 1;
  });
  assert.equal(response.statusCode, 200);
  assert.equal(nextCalls, 1);
});

test("tracking events require consent and enqueue one event command", () => {
  const storage = new Map();
  const fakeWindow = {
    localStorage: {
      getItem: (key) => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
    },
    dataLayer: [],
    fbqEvents: [],
    fbq(...args) {
      this.fbqEvents.push(args);
    },
  };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: fakeWindow,
  });

  assert.equal(tracking.pushTrackingEvent("page_view"), false);
  assert.equal(fakeWindow.dataLayer.length, 0);

  fakeWindow.localStorage.setItem(
    tracking.TRACKING_CONSENT_KEY,
    JSON.stringify({ analytics: true, marketing: false }),
  );
  assert.equal(
    tracking.pushTrackingEvent("page_view", { page_path: "/en" }),
    true,
  );
  assert.equal(fakeWindow.dataLayer.length, 1);
  assert.deepEqual(Array.from(fakeWindow.dataLayer[0]), [
    "event",
    "page_view",
    { page_path: "/en" },
  ]);

  fakeWindow.localStorage.setItem(
    tracking.TRACKING_CONSENT_KEY,
    JSON.stringify({ analytics: false, marketing: true }),
  );
  assert.equal(
    tracking.pushTrackingEvent("begin_checkout", { course_id: "course-1" }),
    true,
  );
  assert.deepEqual(fakeWindow.fbqEvents, [["track", "InitiateCheckout"]]);
});

after(() => {
  delete globalThis.window;
});
