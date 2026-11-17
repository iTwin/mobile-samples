package com.bentley.sample.shared

import android.annotation.SuppressLint
import android.os.Bundle
import android.util.Log
import android.view.ViewGroup
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebResourceError
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import com.github.itwin.mobilesdk.ITMApplication
import com.github.itwin.mobilesdk.ITMGeolocationManager
import com.github.itwin.mobilesdk.ITMMessenger
import com.github.itwin.mobilesdk.ITMSuccessCallback
import com.github.itwin.mobilesdk.ITMWebViewLogger
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.coroutines.withTimeout
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.net.URI
import java.util.UUID

class SDKTestsActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var output: TextView
    private var logger: ITMWebViewLogger? = null
    private var messenger: ITMMessenger? = null
    private lateinit var geolocationManager: ITMGeolocationManager
    private var pageLoaded: CompletableDeferred<Unit>? = null
    private var pendingPageUrl: String? = null
    private val pendingScripts = mutableMapOf<String, CompletableDeferred<JSONObject>>()
    private val received = mutableListOf<Pair<ITMWebViewLogger.LogType, String>>()
    private var trustedOrigin = "https://appassets.itwinjs.org"
    private var foreignOrigin = "https://logger-test.invalid"
    private var debugServerMode = false

    private class TestSuite(val id: String, val name: String, val run: suspend () -> Unit)

    companion object {
        private const val RESULTS_BRIDGE = "ITMLoggerTestResults"
        private const val TAG = "SDKTests"
    }

    @SuppressLint("SetJavaScriptEnabled", "SetTextI18n")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        geolocationManager = ITMGeolocationManager(this)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = (16 * resources.displayMetrics.density).toInt()
            setPadding(padding, padding, padding, padding)
            fitsSystemWindows = true
        }
        output = TextView(this).apply { setTextIsSelectable(true) }
        val suiteButtons = mutableListOf<Button>()
        val suites = listOf(
            TestSuite("console-bridge", "Console bridge") { runConsoleTests(false) },
            TestSuite("console-bridge-debug-server", "Console bridge (debug server)") { runConsoleTests(true) },
            TestSuite("messenger", "ITMMessenger") { runMessengerTests() },
            TestSuite("geolocation", "Geolocation (See README.md)") { runLocationTests() }
        )
        for (suite in suites) {
            val button = Button(this).apply {
                text = suite.name
                tag = suite.id
                setCompoundDrawablesWithIntrinsicBounds(android.R.drawable.ic_media_play, 0, 0, 0)
                contentDescription = "Run ${suite.name} tests"
                setOnClickListener {
                    suiteButtons.forEach { it.isEnabled = false }
                    output.text = ""
                    report("Suite: ${suite.name}")
                    lifecycleScope.launch {
                        try {
                            suite.run()
                        } catch (cancelled: CancellationException) {
                            throw cancelled
                        } catch (error: Exception) {
                            report("FAIL: test runner: ${error.message}")
                        } finally {
                            geolocationManager.detach()
                            messenger?.detach()
                            messenger = null
                            logger?.detach()
                            logger = null
                            suiteButtons.forEach { it.isEnabled = true }
                        }
                    }
                }
            }
            suiteButtons.add(button)
            layout.addView(button)
        }
        layout.addView(ScrollView(this).apply { addView(output) }, LinearLayout.LayoutParams(-1, 0, 1f))
        webView = WebView(this)
        layout.addView(webView, LinearLayout.LayoutParams(-1, (120 * resources.displayMetrics.density).toInt()))
        setContentView(layout)
        webView.settings.apply {
            javaScriptEnabled = true
            allowFileAccess = false
            allowContentAccess = false
            blockNetworkLoads = true
        }
        webView.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                if (debugServerMode) return null
                val uri = request.url
                val allowedHost = uri.host == "appassets.itwinjs.org" || uri.host == "logger-test.invalid"
                val file = when (uri.path) {
                    "/sdk-tests/main.html" -> "main.html"
                    "/sdk-tests/frame.html" -> "frame.html"
                    "/sdk-tests/location.html" -> "location.html"
                    "/sdk-tests/geolocation.js" -> "geolocation.js"
                    "/sdk-tests/location-behavior.js" -> "location-behavior.js"
                    "/sdk-tests/messenger.html" -> "messenger.html"
                    "/sdk-tests/messenger.js" -> "messenger.js"
                    "/sdk-tests/messenger-behavior.js" -> "messenger-behavior.js"
                    else -> null
                }
                val content = if (uri.scheme == "https" && allowedHost && file != null) {
                    assets.open("sdk-tests/$file")
                } else {
                    ByteArrayInputStream(ByteArray(0))
                }
                return WebResourceResponse(if (file?.endsWith(".js") == true) "application/javascript" else "text/html", "UTF-8", content)
            }

            override fun onPageStarted(view: WebView, url: String, favicon: android.graphics.Bitmap?) {
                geolocationManager.onPageStarted(view)
                messenger?.onPageStarted(view)
                logger?.onPageStarted()
            }

            override fun onPageFinished(view: WebView, url: String) {
                if (url != pendingPageUrl) return
                geolocationManager.onPageFinished(view)
                messenger?.onPageFinished(view)
                logger?.inject()
                pageLoaded?.complete(Unit)
            }

            override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
                if (request.isForMainFrame && request.url.toString() == pendingPageUrl) {
                    pageLoaded?.completeExceptionally(IllegalStateException("Fixture navigation failed: ${error.description}"))
                }
            }

            override fun onReceivedHttpError(view: WebView, request: WebResourceRequest, errorResponse: WebResourceResponse) {
                if (request.isForMainFrame && request.url.toString() == pendingPageUrl) {
                    pageLoaded?.completeExceptionally(IllegalStateException("Fixture HTTP error: ${errorResponse.statusCode}"))
                }
            }
        }
        intent.getStringExtra("sdk-test-suite")?.let { requested ->
            val button = suiteButtons.firstOrNull { it.tag == requested }
            if (button != null) button.performClick() else report("FAIL: Unknown SDK test suite: $requested")
        }
    }

    private suspend fun loadPage(origin: String = trustedOrigin, fixture: String = "main.html") {
        val completion = CompletableDeferred<Unit>()
        pageLoaded = completion
        val url = "$origin/sdk-tests/$fixture?run=${UUID.randomUUID()}#platform=android"
        pendingPageUrl = url
        try {
            webView.loadUrl(url)
            check(withTimeoutOrNull(5000) { completion.await() } != null) { "Page load timed out: $origin" }
            val expectedFixture = when (fixture) {
                "location.html" -> "geolocation"
                "messenger.html" -> "messenger"
                else -> "console-bridge-main"
            }
            val loadedFixture = evaluate("location.href === ${JSONObject.quote(url)} && window.sdkTestFixture === ${JSONObject.quote(expectedFixture)};")
            check(loadedFixture == "true") { "Expected test fixture did not load at $origin" }
        } finally {
            pageLoaded = null
            pendingPageUrl = null
        }
    }

    private suspend fun script(body: String, timeoutMillis: Long = 5000): JSONObject {
        val id = UUID.randomUUID().toString()
        val completion = CompletableDeferred<JSONObject>()
        pendingScripts[id] = completion
        webView.evaluateJavascript(
            """(async function() {
                var result = { id: ${JSONObject.quote(id)} };
                try { result.value = await (async function() { $body })(); }
                catch (error) { result.error = String(error); }
                window.$RESULTS_BRIDGE.postMessage(JSON.stringify(result));
            })();""",
            null
        )
        try {
            val result = withTimeoutOrNull(timeoutMillis) { completion.await() }
                ?: error("JavaScript result timed out")
            check(!result.has("error")) { result.optString("error") }
            return result
        } finally {
            pendingScripts.remove(id)
        }
    }

    private suspend fun evaluate(body: String): String {
        val completion = CompletableDeferred<String>()
        webView.evaluateJavascript(body, completion::complete)
        return withTimeoutOrNull(5000) { completion.await() }
            ?: error("JavaScript evaluation timed out")
    }

    private fun report(message: String) {
        output.append("$message\n")
        Log.i(TAG, message)
    }

    private fun configureResultsBridge() {
        WebViewCompat.removeWebMessageListener(webView, RESULTS_BRIDGE)
        WebViewCompat.addWebMessageListener(webView, RESULTS_BRIDGE, setOf(trustedOrigin)) { _, message, origin, mainFrame, _ ->
            if (mainFrame && origin.toString().removeSuffix("/") == trustedOrigin) {
                val result = runCatching { JSONObject(message.data.orEmpty()) }.getOrNull()
                if (result?.has("report") == true) report(result.getString("report"))
                else if (result != null) pendingScripts.remove(result.optString("id"))?.complete(result)
            }
        }
    }

    private suspend fun runLocationTests() {
        check(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) { "Geolocation requires WEB_MESSAGE_LISTENER" }
        debugServerMode = false
        trustedOrigin = "https://appassets.itwinjs.org"
        webView.settings.blockNetworkLoads = true
        configureResultsBridge()
        geolocationManager.attach(webView, setOf(trustedOrigin))
        loadPage(fixture = "location.html")
        script("""
            await window.runLocationBehaviorTests({
                latitude: 37.3349, longitude: -122.0090,
                nextLatitude: 37.3449, nextLongitude: -121.9990
            }, function(message) {
                window.$RESULTS_BRIDGE.postMessage(JSON.stringify({ report: message }));
            });
            return true;
        """.trimIndent(), 150000)
    }

    private suspend fun messengerQuery(bridge: ITMMessenger, name: String, data: String = ""): String =
        withTimeout(10000) {
            val result = CompletableDeferred<String>()
            bridge.query<String, String>(name, data, { result.complete(it) }, { result.completeExceptionally(it) })
            result.await()
        }

    private suspend fun runMessengerTests() = coroutineScope {
        check(WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) { "ITMMessenger requires WEB_MESSAGE_LISTENER" }
        debugServerMode = false
        trustedOrigin = "https://appassets.itwinjs.org"
        webView.settings.blockNetworkLoads = true
        configureResultsBridge()
        val bridge = ITMMessenger()
        messenger = bridge
        var heldResponse = CompletableDeferred<ITMSuccessCallback<String>>()
        for (name in listOf("echo", "e".repeat(1025))) {
            bridge.registerQueryHandler<String, String>(name) { body, success, _ -> success?.invoke(body) }
        }
        bridge.registerQueryHandler<Any?, Boolean>("inspect-json") { body, success, _ ->
            val expected = mapOf(
                "nullable" to null, "nested" to mapOf("nullable" to null),
                "array" to listOf(null, mapOf("nullable" to null))
            )
            success?.invoke(body == expected)
        }
        bridge.registerQueryHandler<Any?, Boolean>("inspect-null") { body, success, _ ->
            success?.invoke(body == null)
        }
        bridge.registerQueryHandler<Any?, String>("native-failure") { _, _, failure ->
            failure?.invoke(IllegalStateException("native failure"))
        }
        for ((name, frontend) in listOf("round-trip" to "frontend-echo", "round-trip-failure" to "frontend-failure")) {
            bridge.registerQueryHandler<String, String>(name) { body, success, failure ->
                lifecycleScope.launch {
                    try {
                        success?.invoke(messengerQuery(bridge, frontend, body))
                    } catch (cancelled: CancellationException) {
                        throw cancelled
                    } catch (error: Exception) {
                        failure?.invoke(error)
                    }
                }
            }
        }
        bridge.registerQueryHandler<Any?, String>("native-hold") { _, success, _ ->
            heldResponse.complete(requireNotNull(success))
        }
        bridge.attach(webView, setOf(trustedOrigin))
        suspend fun loadMessenger() {
            loadPage(fixture = "messenger.html")
            script("""
                if (!window.messengerFixtureReady || typeof window.runMessengerBehaviorTests !== 'function')
                    throw new Error('Messenger fixture failed: ' + JSON.stringify(window.sdkMessengerErrors));
                await window.messengerFixtureReady; return true;
            """.trimIndent(), 15000)
            bridge.frontendLaunchSucceeded()
        }
        loadMessenger()
        val results = script("""
            return await window.runMessengerBehaviorTests(function(message) {
                window.$RESULTS_BRIDGE.postMessage(JSON.stringify({ report: message }));
            });
        """.trimIndent(), 60000).getJSONObject("value")
        var passed = results.getInt("passed")
        var total = results.getInt("total")
        for (detach in listOf(false, true)) {
            total++
            val name = if (detach) "Detach rejects pending work in both directions and reattachment recovers"
                else "Navigation rejects pending native work and discards late handler results"
            try {
                heldResponse = CompletableDeferred()
                script("window.startPendingFrontendQuery(); return true;")
                val completeOldQuery = withTimeout(10000) { heldResponse.await() }
                val pendingNative = async {
                    try {
                        messengerQuery(bridge, "frontend-hold")
                        false
                    } catch (cancelled: CancellationException) {
                        throw cancelled
                    } catch (_: Exception) {
                        true
                    }
                }
                script("await window.waitForNativeQuery(); return true;")
                if (detach) {
                    bridge.detach()
                    // Older WebViews can crash if another message bridge is used after removing a listener.
                    withTimeout(5000) {
                        while (evaluate("window.frontendPendingResult === 'rejected'") != "true") delay(10)
                    }
                    bridge.attach(webView, setOf(trustedOrigin))
                }
                loadMessenger()
                check(withTimeout(10000) { pendingNative.await() }) { "Old native query unexpectedly succeeded" }
                completeOldQuery("stale response")
                check(messengerQuery(bridge, "frontend-echo", "recovered") == "recovered")
                passed++
                report("PASS: $name")
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (error: Exception) {
                report("FAIL: $name: ${error.message}")
            }
        }
        report("Result: $passed/$total passed")
    }

    private suspend fun runConsoleTests(debugServer: Boolean) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            report("UNSUPPORTED: this WebView provider lacks WEB_MESSAGE_LISTENER.")
            return
        }
        debugServerMode = debugServer
        trustedOrigin = "https://appassets.itwinjs.org"
        foreignOrigin = "https://logger-test.invalid"
        if (debugServer) {
            val config = assets.open("ITMApplication/ITMAppConfig.json").bufferedReader().use { JSONObject(it.readText()) }
            val baseUrl = config.optString("ITMAPPLICATION_BASE_URL")
            check(baseUrl.isNotEmpty()) { "Enable debug server mode in ITMSamples.properties and rebuild; ITMAPPLICATION_BASE_URL is missing" }
            val url = URI(baseUrl)
            val scheme = url.scheme?.lowercase()
            check((scheme == "http" || scheme == "https") && url.host != null && url.rawUserInfo == null) {
                "Invalid configured debug server URL"
            }
            val defaultPort = if (scheme == "https") 443 else 80
            val port = if (url.port == defaultPort) -1 else url.port
            trustedOrigin = URI(scheme, null, url.host.lowercase(), port, null, null, null).toString()
            val foreignHost = if (url.host == "127.0.0.1") "localhost" else "127.0.0.1"
            foreignOrigin = URI(scheme, null, foreignHost, port, null, null, null).toString()
        }
        webView.settings.blockNetworkLoads = !debugServer
        configureResultsBridge()
        received.clear()
        logger = ITMWebViewLogger(webView, { type, message -> received.add(type to message) }, setOf(trustedOrigin))
        report("Frontend origin: $trustedOrigin (${if (debugServer) "debug server, real HTTP" else "packaged fixtures"})")
        loadPage()
        report("WebView: ${WebViewCompat.getCurrentWebViewPackage(this)?.versionName}")
        var passed = 0
        var total = 0
        suspend fun test(name: String, checkResult: suspend () -> Unit) {
            total++
            try {
                checkResult()
                passed++
                report("PASS: $name")
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (error: Exception) {
                report("FAIL: $name: ${error.message}")
            }
        }
        suspend fun expect(marker: String, count: Int) {
            delay(300)
            val actual = received.count { it.second == marker }
            check(actual == count) { "Expected $count callbacks, received $actual" }
        }
        test("Trusted main-frame console forwarding") {
            script("console.log('trusted-main'); return true;")
            expect("trusted-main", 1)
        }
        test("All log levels, assertions, and window errors") {
            script("""
                ['error', 'warn', 'info', 'log', 'trace'].forEach(function(type) { console[type]('level-' + type); });
                console.assert(true, 'assert-true');
                console.assert(false, 'assert-false');
                window.dispatchEvent(new ErrorEvent('error', { message: 'window-error' }));
                return true;
            """.trimIndent())
            delay(300)
            for (type in ITMWebViewLogger.LogType.values().filter { it != ITMWebViewLogger.LogType.Assert }) {
                check(received.count { it == type to "level-${type.name.lowercase()}" } == 1) { "Missing/duplicate $type" }
            }
            check(received.count { it.first == ITMWebViewLogger.LogType.Assert } == 1)
            expect("window-error", 1)
        }
        test("Foreign-origin iframe cannot access its bridge") {
            val result = script("return await runFrameTest('$foreignOrigin', 'foreign-frame', false);")
            check(result.getJSONObject("value").getString("status") == "absent") { "Foreign bridge was exposed" }
            expect("foreign-frame", 0)
        }
        test("Same-origin iframe bridge calls are rejected") {
            val result = script("return await runFrameTest('$trustedOrigin', 'same-frame', false);")
            check(result.getJSONObject("value").getString("status") == "sent") { "Frame did not exercise the bridge" }
            expect("same-frame", 0)
        }
        test("Opaque sandboxed iframe cannot access its bridge") {
            val result = script("return await runFrameTest('$trustedOrigin', 'opaque-frame', true);")
            check(result.getJSONObject("value").getString("status") == "absent") { "Opaque bridge was exposed" }
            expect("opaque-frame", 0)
        }
        test("Wrong session is rejected") {
            script("Bentley_ITMConsoleLogger.postMessage(JSON.stringify({ sessionId: 'wrong', type: 'log', message: 'wrong-session' })); return true;")
            expect("wrong-session", 0)
        }
        test("Malformed payload and invalid severity are rejected") {
            script("""
                Bentley_ITMConsoleLogger.postMessage('{');
                Bentley_ITMConsoleLogger.postMessage(JSON.stringify({ sessionId: Bentley_ITMConsoleLoggerState.sessionId, type: 'invalid', message: 'invalid-type' }));
                console.log('after-invalid'); return true;
            """.trimIndent())
            expect("invalid-type", 0)
            expect("after-invalid", 1)
        }
        test("Oversized output is dropped without breaking console") {
            val before = received.size
            script("""
                console.log('x'.repeat(16385));
                Bentley_ITMConsoleLogger.postMessage(JSON.stringify({ sessionId: Bentley_ITMConsoleLoggerState.sessionId, type: 'log', message: 'x'.repeat(16385) }));
                Bentley_ITMConsoleLogger.postMessage(' '.repeat(32769));
                return true;
            """.trimIndent())
            delay(300)
            check(received.size == before)
            script("console.log('after-oversized'); return true;")
            expect("after-oversized", 1)
        }
        test("Rate limit bounds a burst and recovers") {
            loadPage()
            script("for (var index = 0; index < 110; index++) console.log('rate-' + index); return true;")
            delay(300)
            val count = received.count { it.second.startsWith("rate-") }
            check(count == 100) { "Expected 100 rate-limited callbacks, received $count" }
            delay(1100)
            script("console.log('after-rate-limit'); return true;")
            expect("after-rate-limit", 1)
        }
        test("Repeated injection does not duplicate forwarding") {
            logger?.inject()
            logger?.inject()
            script("console.log('inject-once'); return true;")
            expect("inject-once", 1)
        }
        test("Reload rejects previous-document session") {
            val oldSession = script("return Bentley_ITMConsoleLoggerState.sessionId;").getString("value")
            loadPage()
            script("""
                Bentley_ITMConsoleLogger.postMessage(JSON.stringify({ sessionId: ${JSONObject.quote(oldSession)}, type: 'log', message: 'stale-session' }));
                console.log('new-session'); return true;
            """.trimIndent())
            expect("stale-session", 0)
            expect("new-session", 1)
        }
        test("Foreign main-frame navigation does not expose the bridge") {
            try {
                loadPage(foreignOrigin)
                check(evaluate("!window.Bentley_ITMConsoleLogger && !window.Bentley_ITMConsoleLoggerState") == "true") {
                    "Foreign document has a bridge or console wrapper"
                }
            } finally {
                loadPage()
            }
        }
        test("Detach restores console without native forwarding") {
            logger?.detach()
            val result = evaluate("console.log('after-detach'); console.log === originalConsoleLog && !window.Bentley_ITMConsoleLoggerState;")
            check(result == "true") { "Console wrapper was not restored" }
            expect("after-detach", 0)
        }
        test("Activity destruction retains forwarding for the retained WebView") {
            val retainedWebView = WebView(this@SDKTestsActivity)
            val loaded = CompletableDeferred<Unit>()
            val fixtureClient = webView.webViewClient
            val application = object : ITMApplication(this@SDKTestsActivity, attachWebViewLogger = true) {
                fun prepare() {
                    webView = retainedWebView
                    retainedWebView.settings.javaScriptEnabled = true
                    retainedWebView.settings.blockNetworkLoads = !debugServer
                    setupWebView()
                }

                override fun getBaseUrl() = "$trustedOrigin/sdk-tests/main.html"

                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest) =
                    fixtureClient.shouldInterceptRequest(view, request)

                override fun onPageFinished(view: WebView, url: String) {
                    super.onPageFinished(view, url)
                    loaded.complete(Unit)
                }

                override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError): Boolean {
                    if (request.isForMainFrame) loaded.completeExceptionally(IllegalStateException(error.description.toString()))
                    return true
                }

                override fun onWebViewLog(type: ITMWebViewLogger.LogType, message: String) {
                    received.add(type to message)
                }
            }
            try {
                application.prepare()
                retainedWebView.loadUrl("$trustedOrigin/sdk-tests/main.html")
                check(withTimeoutOrNull(5000) { loaded.await() } != null) { "Retained WebView did not load" }
                application.onActivityDestroy()
                val evaluated = CompletableDeferred<String>()
                retainedWebView.evaluateJavascript("console.log('after-activity-destroy'); true;", evaluated::complete)
                check(withTimeoutOrNull(5000) { evaluated.await() } == "true") { "Retained document did not execute" }
                expect("after-activity-destroy", 1)
                check(application.webView === retainedWebView) { "Application discarded its WebView" }
            } finally {
                WebViewCompat.removeWebMessageListener(retainedWebView, "Bentley_ITMConsoleLogger")
                retainedWebView.destroy()
            }
        }
        report("Result: $passed/$total passed")
    }

    override fun onDestroy() {
        messenger?.detach()
        messenger = null
        logger?.detach()
        logger = null
        pendingScripts.values.forEach { it.cancel() }
        pendingScripts.clear()
        pageLoaded?.cancel()
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.removeWebMessageListener(webView, RESULTS_BRIDGE)
        }
        (webView.parent as? ViewGroup)?.removeView(webView)
        webView.destroy()
        super.onDestroy()
    }
}