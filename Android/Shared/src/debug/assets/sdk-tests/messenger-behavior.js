/* global SDKMessenger */
window.sdkTestFixture = "messenger";
const messenger = SDKMessenger.Messenger;
window.nativeQueryStarted = false;
messenger.onQuery("frontend-echo").setHandler(async (message) => message);
messenger.onQuery("frontend-failure").setHandler(async () => { throw new Error("frontend failure"); });
messenger.onQuery("frontend-hold").setHandler(() => {
  window.nativeQueryStarted = true;
  return new Promise(() => {});
});

window.messengerFixtureReady = (async () => {
  await messenger.initialize();
  if (await messenger.query("echo", "ready") !== "ready") throw new Error("Native messenger did not respond");
})();
window.messengerFixtureReady.catch((error) => console.error("Messenger fixture initialization failed", error));

window.waitForNativeQuery = async function() {
  const deadline = Date.now() + 5000;
  while (!window.nativeQueryStarted) {
    if (Date.now() > deadline) throw new Error("Native query did not reach the TypeScript handler");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

window.startPendingFrontendQuery = function() {
  window.frontendPendingResult = "pending";
  window.frontendPending = messenger.query("native-hold").then(
    () => { window.frontendPendingResult = "resolved"; },
    () => { window.frontendPendingResult = "rejected"; },
  );
};

window.runMessengerBehaviorTests = async function(report) {
  let passed = 0;
  let total = 0;
  function require(condition, message) {
    if (!condition) throw new Error(message);
  }
  async function test(name, body) {
    total++;
    try {
      await body();
      passed++;
      report("PASS: " + name);
    } catch (error) {
      report("FAIL: " + name + ": " + error);
    }
  }
  async function rejects(query, expected) {
    try {
      await query;
    } catch (error) {
      const description = String(error.message ?? "") + " " + JSON.stringify(error);
      require(description.includes(expected), "Unexpected error: " + description);
      return;
    }
    throw new Error("Expected query rejection");
  }
  const text = "h\u00e9llo \ud83c\udf0d 'quoted' \"double\"\n\u2028\u2029";
  await test("Real TypeScript/native bidirectional Unicode round trip", async () => {
    require(await messenger.query("round-trip", text) === text, "Unicode round trip changed the value");
  });
  await test("Nested JSON and explicit nulls reach native handlers", async () => {
    const data = { nullable: null, nested: { nullable: null }, array: [null, { nullable: null }] };
    require(await messenger.query("inspect-json", data) === true, "Native handler received different JSON");
    require(await messenger.query("inspect-null", null) === true, "Explicit null was not preserved");
  });
  await test("Native handler errors reject TypeScript queries", () =>
    rejects(messenger.query("native-failure"), "native failure"));
  await test("TypeScript handler errors cross native and frontend boundaries", () =>
    rejects(messenger.query("round-trip-failure", ""), "frontend failure"));
  await test("Concurrent bidirectional queries retain their responses", async () => {
    const values = Array.from({ length: 8 }, (_, index) => "query-" + index);
    const results = await Promise.all(values.map((value) => messenger.query("round-trip", value)));
    require(JSON.stringify(results) === JSON.stringify(values), "Responses were mixed up");
  });
  await test("Long names and payloads over 1 MiB round trip in both directions", async () => {
    const data = "x".repeat(1048577);
    require(await messenger.query("e".repeat(1025), data) === data, "Large frontend query changed the value");
    require(await messenger.query("round-trip", data) === data, "Large native query changed the value");
  });
  await test("Invalid query names reject without breaking later queries", async () => {
    await rejects(messenger.query("", "invalid"), "non-empty string");
    require(await messenger.query("echo", "after-error") === "after-error", "Messenger did not recover");
  });
  return { passed, total };
};
