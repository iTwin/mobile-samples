#if DEBUG
import WebKit
import ITwinMobile

@MainActor
private final class TestConsoleLogger: ITMWebViewLogger {
    var receive: ((String?, String) -> Void)?

    override func log(_ severity: String?, _ logMessage: String) {
        receive?(severity, logMessage)
    }
}

@MainActor
final class ConsoleBridgeTests: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
    let webView: WKWebView
    var report: (String) -> Void = { _ in }
    private let logger = TestConsoleLogger(name: "SDK Tests")
    private var received: [(severity: String?, message: String)] = []
    private var pending: [UUID: (Error) -> Void] = [:]
    private var navigationCompletion: ((Result<Void, Error>) -> Void)?
    private var scripts: [String: (Result<Any, Error>) -> Void] = [:]
    private var nativeOrigin = ""
    private var trustedOrigin = "imodeljs://app"
    private var foreignOrigin = "imodeljs://foreign"

    override init() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .nonPersistent()
        configuration.setURLSchemeHandler(TestFixtureHandler(), forURLScheme: "imodeljs")
        webView = WKWebView(frame: .zero, configuration: configuration)
        super.init()
        webView.navigationDelegate = self
        webView.configuration.userContentController.add(ITMWeakScriptMessageHandler(self), name: "sdkTestResults")
        logger.receive = { [weak self] severity, message in
            self?.received.append((severity, String(message.dropFirst("JS - SDK Tests: ".count))))
        }
    }

    private func failure(_ message: String) -> Error {
        NSError(domain: "SDKTests", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
    }

    private func require(_ condition: Bool, _ message: String) throws {
        if !condition { throw failure(message) }
    }

    private func wait<Value>(_ start: (@escaping (Result<Value, Error>) -> Void) -> Void) async throws -> Value {
        try Task.checkCancellation()
        let id = UUID()
        let value: Value = try await withCheckedThrowingContinuation { continuation in
            let timeout = DispatchWorkItem { [weak self] in
                guard let self else { return }
                self.pending[id]?(self.failure("WebView operation timed out"))
            }
            let finish: (Result<Value, Error>) -> Void = { [weak self] result in
                guard self?.pending.removeValue(forKey: id) != nil else { return }
                timeout.cancel()
                continuation.resume(with: result)
            }
            pending[id] = { finish(.failure($0)) }
            DispatchQueue.main.asyncAfter(deadline: .now() + 5, execute: timeout)
            start(finish)
        }
        try Task.checkCancellation()
        return value
    }

    private func evaluate(_ source: String) async throws -> Any {
        try await wait { finish in
            webView.evaluateJavaScript(source) { value, error in
                if let error { finish(.failure(error)) }
                else { finish(.success(value ?? NSNull())) }
            }
        }
    }

    private func script(_ source: String) async throws -> Any {
        let id = UUID().uuidString
        defer { scripts.removeValue(forKey: id) }
        return try await wait { finish in
            scripts[id] = finish
            webView.evaluateJavaScript("""
                (async function() {
                    var result = { id: '\(id)' };
                    try { result.value = await (async function() { \(source) })(); }
                    catch (error) { result.error = String(error); }
                    window.webkit.messageHandlers.sdkTestResults.postMessage(result);
                })(); true;
                """) { [weak self] _, error in
                if let error { self?.scripts.removeValue(forKey: id)?(.failure(error)) }
            }
        }
    }

    private func loadPage(origin: String? = nil) async throws {
        defer { navigationCompletion = nil }
        try await wait { finish in
            navigationCompletion = finish
            webView.load(URLRequest(url: URL(string: "\(origin ?? trustedOrigin)/sdk-tests/main.html?run=\(UUID().uuidString)")!))
        }
    }

    private func expect(_ marker: String, count: Int) async throws {
        try await Task.sleep(nanoseconds: 300_000_000)
        let actual = received.filter { $0.message == marker }.count
        try require(actual == count, "Expected \(count) callbacks for \(marker), received \(actual)")
    }

    func run(debugServer: Bool = false) async throws {
        defer { logger.detach() }
        trustedOrigin = "imodeljs://app"
        foreignOrigin = "imodeljs://foreign"
        if debugServer {
            guard let configURL = Bundle.main.url(forResource: "ITMAppConfig", withExtension: "json", subdirectory: "ITMApplication"),
                  let config = try JSONSerialization.jsonObject(with: Data(contentsOf: configURL)) as? [String: Any],
                  let baseURL = config["ITMAPPLICATION_BASE_URL"] as? String,
                  let url = URL(string: baseURL), let scheme = url.scheme,
                  scheme == "http" || scheme == "https",
                  let origin = ITMWebViewLogger.origin(for: url),
                  var foreign = URLComponents(string: origin) else {
                throw failure("Enable debug server mode in ITMApplication.xcconfig and rebuild; a valid ITMAPPLICATION_BASE_URL is required")
            }
            trustedOrigin = origin
            foreign.host = foreign.host == "127.0.0.1" ? "localhost" : "127.0.0.1"
            guard let origin = foreign.string else { throw failure("Invalid foreign test origin") }
            foreignOrigin = origin
        }
        report("Frontend origin: \(trustedOrigin) (\(debugServer ? "debug server, real HTTP" : "packaged fixtures"))")
        received.removeAll()
        logger.attach(webView, allowedOrigins: [trustedOrigin])
        try await loadPage()
        var passed = 0
        var total = 0
        func test(_ name: String, _ body: () async throws -> Void) async throws {
            total += 1
            do {
                try Task.checkCancellation()
                try await body()
                passed += 1
                report("PASS: \(name)")
            } catch is CancellationError {
                throw CancellationError()
            } catch {
                report("FAIL: \(name): \(error.localizedDescription)")
            }
        }
        try await test("Frontend reports the expected native origin") {
            _ = try await script("return true;")
            report("Native origin: \(nativeOrigin)")
            let url = URL(string: trustedOrigin)!
            let defaultPort = url.scheme == "https" ? 443 : (url.scheme == "http" ? 80 : 0)
            let expected = "\(url.scheme!)://\(url.host!):\(url.port ?? defaultPort)"
            try require(nativeOrigin == expected, "Unexpected WebKit security origin: \(nativeOrigin)")
        }
        try await test("Trusted main-frame console forwarding") {
            _ = try await script("console.log('trusted-main'); return true;")
            try await expect("trusted-main", count: 1)
        }
        try await test("All log levels, assertions, and window errors") {
            _ = try await script("""
                ['error', 'warn', 'info', 'log', 'trace'].forEach(function(type) { console[type]('level-' + type); });
                console.assert(true, 'assert-true');
                console.assert(false, 'assert-false');
                window.dispatchEvent(new ErrorEvent('error', { message: 'window-error' })); return true;
                """)
            try await expect("window-error", count: 1)
            for severity in ["error", "warn", "info", "log", "trace"] {
                try require(received.filter { $0.severity == severity && $0.message == "level-\(severity)" }.count == 1,
                            "Missing or duplicate \(severity) output")
            }
            try await expect("Assertion Failed: assert-false", count: 1)
            try await expect("Assertion Failed: assert-true", count: 0)
        }
        for (name, origin, sandboxed) in [("Foreign-origin iframe", foreignOrigin, false),
                        ("Same-origin iframe", trustedOrigin, false),
                        ("Opaque sandboxed iframe", trustedOrigin, true)] {
            try await test("\(name) bridge calls are rejected") {
            let marker = "frame-\(name)-\(sandboxed)"
            let quotedOrigin = String(data: try JSONEncoder().encode(origin), encoding: .utf8)!
            let result = try await script("return await runFrameTest(\(quotedOrigin), '\(marker)', \(sandboxed));")
                try require((result as? [String: Any])?["status"] as? String == "sent", "Frame did not exercise the native bridge: \(result)")
                try await expect(marker, count: 0)
            }
        }
        try await test("Wrong session is rejected") {
            _ = try await script("webkit.messageHandlers.itmLogger.postMessage({ sessionId: 'wrong', type: 'log', msg: 'wrong-session' }); return true;")
            try await expect("wrong-session", count: 0)
        }
        try await test("Malformed payload and invalid severity are rejected") {
            _ = try await script("""
                webkit.messageHandlers.itmLogger.postMessage('{');
                webkit.messageHandlers.itmLogger.postMessage({ sessionId: Bentley_ITMConsoleLoggerState.sessionId, type: 'invalid', msg: 'invalid-type' });
                webkit.messageHandlers.itmLogger.postMessage({ sessionId: Bentley_ITMConsoleLoggerState.sessionId, type: 'log', msg: 42 });
                console.log('after-invalid'); return true;
                """)
            try await expect("invalid-type", count: 0)
            try await expect("after-invalid", count: 1)
        }
        try await test("Oversized output is dropped without breaking console") {
            let before = received.count
            _ = try await script("""
                console.log('x'.repeat(16385));
                webkit.messageHandlers.itmLogger.postMessage({ sessionId: Bentley_ITMConsoleLoggerState.sessionId, type: 'log', msg: 'x'.repeat(16385) });
                return true;
                """)
            try await Task.sleep(nanoseconds: 300_000_000)
            try require(received.count == before, "Oversized output was forwarded")
            _ = try await script("console.log('after-oversized'); return true;")
            try await expect("after-oversized", count: 1)
        }
        try await test("Rate limit bounds a burst and recovers") {
            try await loadPage()
            _ = try await script("for (var index = 0; index < 110; index++) console.log('rate-' + index); return true;")
            try await Task.sleep(nanoseconds: 300_000_000)
            try require(received.filter { $0.message.hasPrefix("rate-") }.count == 100, "Burst did not produce exactly 100 callbacks")
            try await Task.sleep(nanoseconds: 1_100_000_000)
            _ = try await script("console.log('after-rate-limit'); return true;")
            try await expect("after-rate-limit", count: 1)
        }
        try await test("Repeated injection does not duplicate forwarding") {
            logger.reattach(webView)
            logger.reattach(webView)
            _ = try await script("console.log('inject-once'); return true;")
            try await expect("inject-once", count: 1)
        }
        try await test("Reload rejects previous-document session") {
            guard let oldSession = try await script("return Bentley_ITMConsoleLoggerState.sessionId;") as? String else {
                throw failure("Missing document session")
            }
            try await loadPage()
            _ = try await script("""
                webkit.messageHandlers.itmLogger.postMessage({ sessionId: '\(oldSession)', type: 'log', msg: 'stale-session' });
                console.log('new-session'); return true;
                """)
            try await expect("stale-session", count: 0)
            try await expect("new-session", count: 1)
        }
        try await test("Foreign main-frame navigation cannot forward output") {
            try await loadPage(origin: foreignOrigin)
            let wrapped = try await evaluate("!!window.Bentley_ITMConsoleLoggerState")
            try require(wrapped as? Bool == false, "Foreign document has console wrappers")
            _ = try await evaluate("webkit.messageHandlers.itmLogger.postMessage({ sessionId: 'foreign', type: 'log', msg: 'foreign-main' }); true;")
            try await expect("foreign-main", count: 0)
        }
        try await loadPage()
        try await test("Failed provisional navigation restores the surviving document session") {
            guard let oldSession = try await script("return Bentley_ITMConsoleLoggerState.sessionId;") as? String else {
                throw failure("Missing document session")
            }
            do {
                defer { navigationCompletion = nil }
                let _: Void = try await wait { finish in
                    navigationCompletion = finish
                    webView.load(URLRequest(url: URL(string: "imodeljs://app/sdk-tests/fail")!))
                }
                throw failure("Expected provisional navigation to fail")
            } catch {
                let navigationError = error as NSError
                try require(navigationError.domain == NSURLErrorDomain && navigationError.code == NSURLErrorCannotConnectToHost,
                            "Unexpected navigation result: \(error.localizedDescription)")
            }
            try await Task.sleep(nanoseconds: 300_000_000)
            let newSession = try await script("return Bentley_ITMConsoleLoggerState.sessionId;") as? String
            try require(newSession != nil && newSession != oldSession, "Surviving document did not receive a fresh session")
            _ = try await script("""
                webkit.messageHandlers.itmLogger.postMessage({ sessionId: '\(oldSession)', type: 'log', msg: 'failed-navigation-stale' });
                console.log('after-failed-navigation'); return true;
                """)
            try await expect("failed-navigation-stale", count: 0)
            try await expect("after-failed-navigation", count: 1)
        }
        try await test("Detach restores console without native forwarding") {
            logger.detach()
            let restored = try await evaluate("console.log('after-detach'); console.log === originalConsoleLog && !window.Bentley_ITMConsoleLoggerState;")
            try require(restored as? Bool == true, "Console wrapper was not restored")
            try await expect("after-detach", count: 0)
        }
        report("Result: \(passed)/\(total) passed")
    }

    func cancel() {
        Array(pending.values).forEach { $0(CancellationError()) }
        scripts.removeAll()
        navigationCompletion = nil
        logger.detach()
        webView.stopLoading()
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        logger.onPageStarted()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        logger.reattach(webView)
        navigationCompletion?(.success(()))
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        navigationCompletion?(.failure(error))
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        navigationCompletion?(.failure(error))
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.webView === webView, message.frameInfo.isMainFrame,
              message.name == "sdkTestResults", let url = webView.url,
              ITMWebViewLogger.origin(for: url) == trustedOrigin,
              let result = message.body as? [String: Any], let id = result["id"] as? String,
              let finish = scripts.removeValue(forKey: id) else { return }
        let origin = message.frameInfo.securityOrigin
        nativeOrigin = "\(origin.protocol)://\(origin.host):\(origin.port)"
        if let error = result["error"] as? String { finish(.failure(failure(error))) }
        else { finish(.success(result["value"] ?? NSNull())) }
    }
}

private final class TestFixtureHandler: NSObject, WKURLSchemeHandler {
    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else { return }
        let html: String
        switch url.path {
        case "/sdk-tests/fail":
            urlSchemeTask.didFailWithError(NSError(domain: NSURLErrorDomain, code: NSURLErrorCannotConnectToHost))
            return
        case "/sdk-tests/main.html": html = Self.mainHTML
        case "/sdk-tests/frame.html": html = Self.frameHTML
        default:
            urlSchemeTask.didFailWithError(NSError(domain: "SDKTests", code: 404))
            return
        }
        let data = Data(html.utf8)
        urlSchemeTask.didReceive(URLResponse(url: url, mimeType: "text/html", expectedContentLength: data.count, textEncodingName: "UTF-8"))
        urlSchemeTask.didReceive(data)
        urlSchemeTask.didFinish()
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {}

    private static let mainHTML = """
        <!doctype html><html lang="en"><meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Console bridge fixture</title><body><p>Console bridge test document</p><script>
        window.originalConsoleLog = console.log;
        window.runFrameTest = function(origin, marker, sandboxed) {
            return new Promise(function(resolve, reject) {
                var frame = document.createElement('iframe');
                var id = marker + '-' + Math.random();
                var timeout;
                var cleanup = function() {
                    clearTimeout(timeout);
                    window.removeEventListener('message', onMessage);
                    frame.remove();
                };
                var onMessage = function(event) {
                    if (event.source !== frame.contentWindow || !event.data || event.data.id !== id) return;
                    var result = event.data;
                    cleanup(); resolve(result);
                };
                window.addEventListener('message', onMessage);
                if (sandboxed) frame.setAttribute('sandbox', 'allow-scripts');
                var payload = JSON.stringify({ sessionId: Bentley_ITMConsoleLoggerState.sessionId, type: 'log', msg: marker });
                frame.src = origin + '/sdk-tests/frame.html?id=' + encodeURIComponent(id) + '&payload=' + encodeURIComponent(payload);
                timeout = setTimeout(function() { cleanup(); reject(new Error('Frame did not report an attempted bridge access')); }, 3000);
                document.body.appendChild(frame);
            });
        };
        </script></body></html>
        """

    private static let frameHTML = """
        <!doctype html><html lang="en"><meta charset="utf-8"><title>Console bridge frame probe</title><body><script>
        var params = new URLSearchParams(location.search);
        var result = { id: params.get('id'), status: 'absent' };
        try {
            var bridge = window.webkit && window.webkit.messageHandlers.itmLogger;
            if (bridge) { bridge.postMessage(JSON.parse(params.get('payload'))); result.status = 'sent'; }
        } catch (error) { result.status = 'error'; result.error = String(error); }
        window.parent.postMessage(result, '*');
        </script></body></html>
        """
}
#endif