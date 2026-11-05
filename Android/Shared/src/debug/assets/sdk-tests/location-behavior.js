window.runLocationBehaviorTests = async function(options, report) {
    var geolocation = navigator.geolocation;
    var passed = 0;
    var total = 0;
    var watches = [];
    var timeoutMillis = 30000;

    function require(condition, message) {
        if (!condition) throw new Error(message);
    }

    function delay(milliseconds) {
        return new Promise(function(resolve) { setTimeout(resolve, milliseconds); });
    }

    async function until(condition, message) {
        var deadline = Date.now() + timeoutMillis;
        while (!condition()) {
            if (Date.now() >= deadline) throw new Error(message);
            await delay(100);
        }
    }

    function near(position, latitude, longitude) {
        return Math.abs(position.coords.latitude - latitude) < 0.0005 &&
            Math.abs(position.coords.longitude - longitude) < 0.0005;
    }

    function position() {
        return new Promise(function(resolve, reject) {
            var timeout = setTimeout(function() { reject(new Error('Position lookup timed out')); }, timeoutMillis);
            var result = geolocation.getCurrentPosition(function(value) {
                clearTimeout(timeout);
                resolve(value);
            }, function(error) {
                clearTimeout(timeout);
                reject(new Error('Position error ' + error.code + ': ' + error.message));
            }, { enableHighAccuracy: true, timeout: timeoutMillis, maximumAge: 0 });
            require(result === undefined, 'getCurrentPosition must return undefined');
        });
    }

    function watch() {
        var state = { positions: [], errors: [] };
        state.id = geolocation.watchPosition(function(value) { state.positions.push(value); }, function(error) { state.errors.push(error); });
        require(Number.isInteger(state.id) && state.id > 0, 'watchPosition must return an ID synchronously');
        watches.push(state);
        return state;
    }

    async function test(name, body) {
        total++;
        try {
            await body();
            passed++;
            report('PASS: ' + name);
        } catch (error) {
            report('FAIL: ' + name + ': ' + error.message);
            throw error;
        }
    }

    try {
        require(window.sdkGeolocationSource === 'mobile-sdk-core/src/mobile-sdk-core/Geolocation.ts', 'Current core polyfill fixture was not loaded');
        require(typeof window.Bentley_ITMGeolocationInitialize === 'function', 'Session-aware polyfill was not installed');
        await test('One-shot coordinates, timestamp, and return value', async function() {
            var value = await position();
            require(near(value, options.latitude, options.longitude), 'Unexpected simulated coordinates: ' + JSON.stringify(value.coords));
            require(Number.isFinite(value.timestamp) && value.timestamp > 0, 'Invalid position timestamp');
            require(Number.isFinite(value.coords.accuracy) && value.coords.accuracy >= 0, 'Invalid position accuracy');
        });
        await test('Concurrent one-shot requests', async function() {
            var values = await Promise.all([position(), position(), position()]);
            require(values.every(function(value) { return near(value, options.latitude, options.longitude); }), 'Concurrent lookups returned unexpected coordinates');
        });
        var first;
        var second;
        await test('Independent synchronous watch IDs and initial updates', async function() {
            first = watch();
            second = watch();
            require(first.id !== second.id, 'Watch IDs were reused');
            await until(function() { return first.positions.length > 0 && second.positions.length > 0; }, 'Both watches did not receive an initial update');
            require(first.errors.length === 0 && second.errors.length === 0, 'Watch reported an error');
            require(near(first.positions[0], options.latitude, options.longitude) && near(second.positions[0], options.latitude, options.longitude), 'Initial watch coordinates were incorrect');
        });
        await test('Simulated movement reaches both watches', async function() {
            report('READY: location change');
            await until(function() {
                return first.positions.some(function(value) { return near(value, options.nextLatitude, options.nextLongitude); }) &&
                    second.positions.some(function(value) { return near(value, options.nextLatitude, options.nextLongitude); });
            }, 'Both watches did not receive the changed coordinates');
        });
        await test('Clearing one watch preserves the other', async function() {
            require(geolocation.clearWatch(first.id) === undefined, 'clearWatch must return undefined');
            var firstCount = first.positions.length;
            var secondCount = second.positions.length;
            await until(function() { return second.positions.length > secondCount; }, 'Remaining watch stopped receiving updates');
            await delay(1500);
            require(first.positions.length === firstCount && first.errors.length === 0, 'Cleared watch received a callback');
        });
        await test('Clearing the final watch suppresses callbacks', async function() {
            geolocation.clearWatch(second.id);
            var count = second.positions.length;
            await delay(1600);
            require(second.positions.length === count && second.errors.length === 0, 'Final cleared watch received a callback');
            require(geolocation.clearWatch(second.id) === undefined, 'Repeated cancellation must be a no-op');
            require(geolocation.clearWatch(2147483647) === undefined, 'Unknown watch cancellation must be a no-op');
        });
        await test('Immediate watch cancellation suppresses callbacks', async function() {
            var immediate = watch();
            geolocation.clearWatch(immediate.id);
            await delay(1600);
            require(immediate.positions.length === 0 && immediate.errors.length === 0, 'Immediately cleared watch received a callback');
        });
        await test('One-shot lookup still works after all watches are cleared', async function() {
            require(near(await position(), options.nextLatitude, options.nextLongitude), 'Lookup after cancellation returned incorrect coordinates');
        });
    } finally {
        watches.forEach(function(state) { geolocation.clearWatch(state.id); });
        report('Result: ' + passed + '/' + total + ' passed');
    }
};
