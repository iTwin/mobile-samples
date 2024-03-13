/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import Foundation
import ITwinMobile
import UIKit

/// Utility to record the timestamp of checkpoints and then log how long all the checkpoints took.
class ActivityTimer {
    /// Controls whether or not the receiver is enabled.
    public var enabled = true
    /// Controls whether or not the output is in JSON format (as opposed to human-readable).
    public var useJSON = false
    /// If ``useJSON`` is `true`, controls whether or not results are also saved to a log file.
    public var logToFile = false
    /// The iTwin version to include in the output.
    public var iTwinVersion = "<Unknown>"
    /// Whether the web app is running on a remote server or on the device.
    public var usingRemoteServer = false
    private var nameTitle: String
    private let startTime = Date()
    private var checkpoints: [ (String, Date) ] = []
    private var maxLengths: [Int] = []

    /// Creates an ``ActivityTimer``.
    /// - Parameter nameTitle: The title to use for the first column of the table logged in ``logTimes(title:)``.
    init(nameTitle: String = "ACTIVITY") {
        self.nameTitle = nameTitle
    }

    /// Add a checkpoint if ``enabled`` is true.
    /// - Parameter name: The name of the checkpoint
    func addCheckpoint(name: String) {
        guard enabled else { return }
        checkpoints.append((name, Date()))
    }

    /// Create a string representing the elapsed time (in seconds and milliseconds) between two `Date` values.
    /// - Parameters:
    ///   - start: The start date for the elapsed time
    ///   - end: The end date for the elapsed time
    /// - Returns: A string representing the elapsed time between the two dates
    private func timeDelta(_ start: Date, _ end: Date) -> String {
        String(format: "%.3f", end.timeIntervalSince(start))
    }

    /// Join all of the strings in `row` using `separator`, then add a line feed.
    ///
    /// Each value will be padded based on the associated calculated max column width.
    /// - Parameters:
    ///   - row: The strings to join together
    ///   - separator: The separator to use when joining the strings, default `"  | "`
    ///   - pad: The character to use to pad values in the row, default space
    /// - Returns: The joined string
    private func buildRow(row: [String], separator: String = "  | ", pad: String = " ") -> String {
        "\(zip(row, maxLengths).map { (field, length) in field.padding(toLength: length, withPad: pad, startingAt: 0)}.joined(separator: separator))\n"
    }

    /// Get the timing information in JSON format.
    /// - Parameter title: The information title
    /// - Returns: Timing information in JSON format
    private func getJSONOutput(title: String) -> String {
        let isoDateFormatter = DateFormatter()
        isoDateFormatter.timeZone = TimeZone(secondsFromGMT: 0)
        isoDateFormatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
        var lastTime = startTime
        var jsonCheckpoints: [JSON] = []
        for (name, timestamp) in checkpoints {
            jsonCheckpoints.append([
                "action": name,
                "timestamp": isoDateFormatter.string(from: timestamp),
                "step": timestamp.timeIntervalSince(lastTime),
                "total": timestamp.timeIntervalSince(startTime),
            ])
            lastTime = timestamp
        }
        let device = UIDevice.current
        let processInfo = ProcessInfo.processInfo
        let json: JSON = [
            "checkpoints": jsonCheckpoints,
            "device": [
                "cpuCores": processInfo.activeProcessorCount,
                "memory": processInfo.physicalMemory,
                "model": device.model,
                "modelID": UIDevice.modelID,
                "modelIDRefURL": "https://www.theiphonewiki.com/wiki/Models",
                "systemName": device.systemName,
                "systemVersion": device.systemVersion,
            ] as [String : Any],
            "iTwinVersion": iTwinVersion,
            "timestamp": isoDateFormatter.string(from: Date()),
            "totalTime": lastTime.timeIntervalSince(startTime),
            "title": title,
            "usingRemoteServer": usingRemoteServer,
        ]
        guard let data = try? JSONSerialization.data(withJSONObject: json, options: [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]),
              let jsonString = String(data: data, encoding: .utf8) else {
            return ""
        }
        return jsonString
    }

    /// Get timing information in human-readable text format.
    /// - Returns: Timing information in human-readable text format
    private func getTextOutput() -> String {
        let headerRow = [ nameTitle, "START", "STEP", "TOTAL" ]
        maxLengths = headerRow.map(\.count)
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "HH:mm:ss.SSS"
        var lastTime = startTime
        var rows: [[String]] = []
        for (name, timestamp) in checkpoints {
            let row = [
                name,
                dateFormatter.string(from: timestamp),
                timeDelta(lastTime, timestamp),
                timeDelta(startTime, timestamp)
            ]
            for i in maxLengths.indices {
                maxLengths[i] = max(maxLengths[i], row[i].count)
            }
            rows.append(row)
            lastTime = timestamp
        }
        let lineRow = [String](repeating: "", count: maxLengths.count)
        var output = "DEVICE MODELID: \(UIDevice.modelID) (see https://www.theiphonewiki.com/wiki/Models)\n"
        output += buildRow(row: headerRow)
        output += buildRow(row: lineRow, separator: "--+-", pad: "-")
        for row in rows {
            output += buildRow(row: row)
        }
        return output
    }

    /// Log the time of all checkpoints if ``enabled`` is true.
    ///
    /// If ``useJSON`` is true, the output is in JSON format, otherwise it is in human-readble text table format.
    /// - Parameter title: Title to be printed before the output.
    func logTimes(title: String) {
        guard enabled else { return }
        guard !checkpoints.isEmpty else {
            ITMApplication.logger.log(.info, "\(title):\nNO CHECKPOINTS.")
            return
        }
        let output = useJSON ? getJSONOutput(title: title) : getTextOutput()
        if output.isEmpty {
            ITMApplication.logger.log(.info, "\(title):\nNO OUTPUT.")
            return
        }
        ITMApplication.logger.log(.info, "\(title):\n\(output)")
        if useJSON, logToFile {
            logToFile(jsonString: output)
        }
    }

    /// Determine if the app is being run from the debugger.
    /// - Returns: true if running from the debugger, or false otherwise.
    private func runningInDebugger() -> Bool {
        // Buffer for "sysctl(...)" call's result.
        var info = kinfo_proc()
        // Counts buffer's size in bytes (like C/C++'s `sizeof`).
        var size = MemoryLayout.stride(ofValue: info)
        // Tells we want info about own process.
        var mib : [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
        // Call the API (and assert success).
        if sysctl(&mib, UInt32(mib.count), &info, &size, nil, 0) != 0 {
            // If the sysctl call fails, just assume we aren't being debugged
            return false
        }
        // Finally, checks if debugger's flag is present yet.
        return (info.kp_proc.p_flag & P_TRACED) != 0
    }

    /// Log the given JSON string to a file as long as the app is not running from the debugger.
    ///
    /// The filename for the log file is based on the modelID of the current device.
    /// __Note__: The given JSON is appended to the log file (followed by two line feeds). This means that even
    /// thought the log file contains JSON, it is not valid JSON after the second log appends data, since this does
    /// __not__ put the new JSON string into a JSON array inside the log file.
    /// - Parameter jsonString: The JSON string to add to the log file.
    private func logToFile(jsonString: String) {
        if runningInDebugger() {
            // Don't log times to disk if we are running in the debugger.
            return
        }
        guard let documentsURL = try? FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true) else {
            return
        }
        let logFileURL = documentsURL.appendingPathComponent("\(UIDevice.modelID).log")
        guard let jsonData = "\(jsonString)\n\n".data(using: .utf8) else {
            return
        }
        do {
            if var logFileData = try? Data(contentsOf: logFileURL) {
                logFileData.append(jsonData)
                try logFileData.write(to: logFileURL)
            } else {
                try jsonData.write(to: logFileURL)
            }
        } catch {
            ITMApplication.logger.log(.error, "Error writing startup times to log file: \(error)")
        }
    }
}

/// Extension that provides the model ID of the currently running device.
public extension UIDevice {
    /// The model ID of the currently running device. For example, a second generation iPad Pro has a model ID of `iPad8,9`.
    /// A second generation iPhone SE has a model ID of `iPhone12,8`.
    static var modelID: String {
        get {
            var systemInfo = utsname()
            uname(&systemInfo)
            return String(bytes: Data(bytes: &systemInfo.machine, count: Int(_SYS_NAMELEN)), encoding: .ascii)!.trimmingCharacters(in: .controlCharacters)
        }
    }
}
