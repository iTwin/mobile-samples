/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.shared

import com.github.itwin.mobilesdk.ITMLogger
import java.lang.Integer.max
import java.text.SimpleDateFormat
import java.util.*

/**
 * Utility to record the timestamp of checkpoints and then log how long all the checkpoints took.
 */
class ActivityTimer(private val nameTitle: String = "ACTIVITY") {
    var enabled = true
    private val startTime = Date()
    private var checkpoints: Array<Pair<String, Date>> = emptyArray()
    private val maxLengths: Array<Int> = Array(4) { 0 }

    /**
     * Add a checkpoint
     * @param name: The name of the checkpoint
     */
    fun addCheckpoint(name: String) {
        if (!enabled) return
        checkpoints += Pair(name, Date())
    }

    /**
     * Create a string representing the elapsed time (in seconds and milliseconds) between two [Date] values.
     * @param start: The start date for the elapsed time
     * @param end: The end date for the elapsed time
     * @return A string representing the elapsed time between the two dates
     */
    private fun timeDelta(start: Date, end: Date): String {
        val delta = end.time - start.time
        return "${delta / 1000}.${(delta % 1000).toString().padStart(3, '0')}"
    }

    /**
     * Join all of the strings in row using separator, then add a line feed.
     *
     * Each value will be padded based on the associated value in [maxLengths].
     * @param row: The strings to join together
     * @param separator: The separator to use when joining the strings
     * @param padChar: The character to use to pad values in the row
     * @return The joined string
     */
    private fun buildRow(row: Array<String>, separator: String = "  | ", padChar: Char = ' '): String {
        var i = 0
        return "${row.joinToString(separator) { it.padEnd(maxLengths[i++], padChar) }}\n"
    }

    /**
     * Log the time of all checkpoints in ASCII table format.
     * @param logger: The [ITMLogger] to use to log the times
     * @param title: Title to be printed before the checkpoints table
     */
    fun logTimes(logger: ITMLogger, title: String) {
        if (!enabled) return
        if (checkpoints.isEmpty()) {
            logger.log(ITMLogger.Severity.Info, "${title}:\nNO CHECKPOINTS.")
            return
        }
        val timeFormat = SimpleDateFormat("HH:mm:ss.SSS")
        val headerRow = arrayOf(nameTitle, "START", "STEP", "TOTAL")
        assert(headerRow.size == maxLengths.size)
        val lineRow = Array(maxLengths.size) { "-" }
        var lastTime = startTime
        var rows: Array<Array<String>> = emptyArray()
        for (i in maxLengths.indices) {
            maxLengths[i] = headerRow[i].length
        }
        for (checkpoint in checkpoints) {
            val row = arrayOf(
                checkpoint.first,
                timeFormat.format(checkpoint.second),
                timeDelta(lastTime, checkpoint.second),
                timeDelta(startTime, checkpoint.second)
            )
            for (i in maxLengths.indices) {
                maxLengths[i] = max(maxLengths[i], row[i].length)
            }
            rows += row
            lastTime = checkpoint.second
        }
        var message = "${title}:\n"
        message += buildRow(headerRow)
        message += buildRow(lineRow, "--+-", '-')
        for (row in rows) {
            message += buildRow(row)
        }
        logger.log(ITMLogger.Severity.Info, message)
    }
}
