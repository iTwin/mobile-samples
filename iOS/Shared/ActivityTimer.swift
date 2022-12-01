/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import Foundation
import ITwinMobile

/// Utility to record the timestamp of checkpoints and then log how long all the checkpoints took.
class ActivityTimer {
    public var enabled = true
    private var nameTitle: String
    private let startTime = Date()
    private var checkpoints: [ (String, Date) ] = []
    private var maxLengths: [Int] = []
    
    /// Creates an ``ActivityTimer``.
    /// - Parameter nameTitle: The title to use for the first column of the table logged in ``logTimes(title:)``.
    init(nameTitle: String = "ACTIVITY") {
        self.nameTitle = nameTitle
    }
    
    /// Add a checkpoint
    /// - Parameter name: The name of the checkpoint
    func addCheckpoint(name: String) {
        guard enabled else { return }
        checkpoints.append((name, Date()))
    }
    
    /// Create a string representing the elapsed time (in seconds and milliseconds) between two 'Date' values.
    /// - Parameters:
    ///   - start: The start date for the elapsed time
    ///   - end: The end date for the elapsed time
    /// - Returns: A string representing the elapsed time between the two dates
    private func timeDelta(_ start: Date, _ end: Date) -> String {
        String(format: "%.3f", end.timeIntervalSince(start))
    }
    
    /// Join all of the strings in row using separator, then add a line feed.
    ///
    /// Each value will be padded based on the associated value in `maxLengths`.
    /// - Parameters:
    ///   - row: The strings to join together
    ///   - separator: The separator to use when joining the strings
    ///   - pad: The character to use to pad values in the row
    /// - Returns: The joined string
    private func buildRow(row: [String], separator: String = "  | ", pad: String = " ") -> String {
        var maxLengthIt = maxLengths.makeIterator()
        return "\(row.map {$0.padding(toLength: maxLengthIt.next() ?? 0, withPad: pad, startingAt: 0)}.joined(separator: separator))\n"
    }

    /// Log the time of all checkpoints in ASCII table format.
    /// - Parameter title: Title to be printed before the checkpoints table.
    func logTimes(title: String) {
        guard enabled else { return }
        guard !checkpoints.isEmpty else {
            ITMApplication.logger.log(.info, "\(title):\nNO CHECKPOINTS.")
            return
        }
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "HH:mm:ss.SSS"
        let headerRow = [ nameTitle, "START", "STEP", "TOTAL" ]
        maxLengths = headerRow.map { $0.count }
        let lineRow = [String](repeating: "-", count: maxLengths.count)
        var lastTime = startTime
        var rows: [[String]] = []
        for checkpoint in checkpoints {
            let row = [
                checkpoint.0,
                dateFormatter.string(from: checkpoint.1),
                timeDelta(lastTime, checkpoint.1),
                timeDelta(startTime, checkpoint.1)
            ]
            for i in maxLengths.indices {
                maxLengths[i] = max(maxLengths[i], row[i].count)
            }
            rows.append(row)
            lastTime = checkpoint.1
        }
        var message = "\(title):\n"
        message += buildRow(row: headerRow)
        message += buildRow(row: lineRow, separator: "--+-", pad: "-")
        for row in rows {
            message += buildRow(row: row)
        }
        ITMApplication.logger.log(.info, message)
    }
}
