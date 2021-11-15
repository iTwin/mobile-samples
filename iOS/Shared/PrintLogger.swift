/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import Foundation
import ITwinMobile

/// Example ITMLogger override that uses Swift's print so that log messages don't get truncated to 1024 bytes.
///
/// Includes a timestamp prefix (including milliseconds).
class PrintLogger: ITMLogger {
    open override func log(_ severity: Severity?, _ logMessage: String) {
        let dateFmt = DateFormatter()
        dateFmt.dateFormat = "yyyy-MM-dd HH:mm:ss.SSS"
        print("\(dateFmt.string(from: Date())): \(severity?.description ?? "<UNKNOWN>") \(logMessage)")
    }
}
