#if DEBUG
import UIKit

@MainActor
final class SDKTestsViewController: UIViewController {
    private let consoleTests = ConsoleBridgeTests()
    private let output = UITextView()
    private var suites: [(id: String, name: String, run: () async throws -> Void)] = []
    private var buttons: [UIButton] = []
    private var runningTask: Task<Void, Never>?
    private var checkedRequestedSuite = false

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "SDK Tests"
        view.backgroundColor = .systemBackground
        consoleTests.report = { [weak self] message in self?.report(message) }
        suites = [
            ("console-bridge", "Console bridge", { [consoleTests] in try await consoleTests.run() }),
            ("console-bridge-debug-server", "Console bridge (debug server)", { [consoleTests] in try await consoleTests.run(debugServer: true) }),
            ("geolocation", "Geolocation (See README.md)", { [consoleTests] in try await consoleTests.runLocationTests() })
        ]

        let layout = UIStackView()
        layout.axis = .vertical
        layout.spacing = 12
        layout.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(layout)
        NSLayoutConstraint.activate([
            layout.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 16),
            layout.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor, constant: -16),
            layout.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
            layout.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -12)
        ])
        for (index, suite) in suites.enumerated() {
            let button = UIButton(type: .system)
            button.setTitle("  \(suite.name)", for: .normal)
            button.setImage(UIImage(systemName: "play.fill"), for: .normal)
            button.contentHorizontalAlignment = .leading
            button.titleLabel?.font = .preferredFont(forTextStyle: .headline)
            button.titleLabel?.numberOfLines = 0
            button.accessibilityLabel = "Run \(suite.name) tests"
            button.tag = index
            button.heightAnchor.constraint(greaterThanOrEqualToConstant: 48).isActive = true
            button.addTarget(self, action: #selector(runSuite(_:)), for: .touchUpInside)
            buttons.append(button)
            layout.addArrangedSubview(button)
        }
        output.isEditable = false
        output.font = .monospacedSystemFont(ofSize: 13, weight: .regular)
        output.accessibilityIdentifier = "SDKTestResults"
        layout.addArrangedSubview(output)
        consoleTests.webView.isHidden = true
        view.addSubview(consoleTests.webView)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !checkedRequestedSuite else { return }
        checkedRequestedSuite = true
        let arguments = ProcessInfo.processInfo.arguments
        guard let option = arguments.firstIndex(of: "-sdk-test-suite"), option + 1 < arguments.count else { return }
        guard let index = suites.firstIndex(where: { $0.id == arguments[option + 1] }) else {
            report("FAIL: Unknown SDK test suite: \(arguments[option + 1])")
            return
        }
        runSuite(buttons[index])
    }

    @objc private func runSuite(_ sender: UIButton) {
        guard runningTask == nil else { return }
        let suite = suites[sender.tag]
        output.text = ""
        report("Suite: \(suite.name)")
        buttons.forEach { $0.isEnabled = false }
        runningTask = Task { [weak self] in
            do {
                try await suite.run()
            } catch is CancellationError {
                self?.report("Cancelled")
            } catch {
                self?.report("FAIL: test runner: \(error.localizedDescription)")
            }
            self?.buttons.forEach { $0.isEnabled = true }
            self?.runningTask = nil
        }
    }

    private func report(_ message: String) {
        output.text.append(message + "\n")
        NSLog("SDKTests: %@", message)
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        runningTask?.cancel()
        consoleTests.cancel()
    }
}
#endif