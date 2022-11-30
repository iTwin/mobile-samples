/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import Foundation
import ITwinMobile

/// Utility to record the timestamp of checkpoints and then log how long all the checkpoints took.
class ActivityTimer {
    private let startTime = Date()
    private var checkpoints: [ (String, Date) ] = []
    private var startupCheckpoint = Date()
    private var nameTitle: String
    private var maxStartupNameLen: Int
    
    /// Creates an ``ActivityTimer``.
    /// - Parameter nameTitle: The title to use for the first column of the table logged in ``logTimes(title:)``.
    init(nameTitle: String = "ACTIVITY") {
        self.nameTitle = nameTitle
        maxStartupNameLen = nameTitle.count
    }
    
    /// Add a checkpoint
    /// - Parameter name: The name of the checkpoint
    func addCheckpoint(name: String) {
        checkpoints.append((name, Date()))
        maxStartupNameLen = max(name.count, maxStartupNameLen)
    }
    
    /// Log the time of all checkpoints in ASCII table format.
    /// - Parameter title: Title to be printed before the checkpoints table.
    func logTimes(title: String) {
        guard !checkpoints.isEmpty else {
            ITMApplication.logger.log(.info, "\(title):\nNO CHECKPOINTS.")
            return
        }
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "HH:mm:ss.SSS"
        var message = """
            \(title):
            \(nameTitle.padding(toLength: maxStartupNameLen, withPad: " ", startingAt: 0))  | START         | STEP   | TOTAL
            \("".padding(toLength: maxStartupNameLen, withPad: "-", startingAt: 0))--+---------------+--------+--------

            """
        var lastTime = startTime
        for time in checkpoints {
            let row = [
                time.0.padding(toLength: maxStartupNameLen, withPad: " ", startingAt: 0),
                "\(dateFormatter.string(from: time.1))",
                String(format: "%.3f", time.1.timeIntervalSince(lastTime)),
                String(format: "%.3f", time.1.timeIntervalSince(self.startTime))
            ]
            message.append(row.joined(separator: "  | "))
            message.append("\n")
            lastTime = time.1
        }
        ITMApplication.logger.log(.info, message)
    }
}
