/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.shared

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import com.eclipsesource.json.JsonArray
import com.eclipsesource.json.WriterConfig
import com.github.itwin.mobilesdk.ITMLogger
import com.github.itwin.mobilesdk.epochMillisToISO8601
import com.github.itwin.mobilesdk.jsonvalue.jsonOf
import java.lang.Integer.max
import java.text.SimpleDateFormat
import java.util.*

/**
 * Utility to record the timestamp of checkpoints and then log how long all the checkpoints took.
 *
 * __Note:__ This class is not related to the Android Activity class.
 */
class ActivityTimer(private val nameTitle: String = "ACTIVITY") {
    var enabled = true
    var useJSON = false
    var iTwinVersion = "<Unknown>"
    var usingRemoteServer = false
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
    private fun timeDeltaString(start: Date, end: Date): String {
        return String.format("%.3f", timeDelta(start, end))
    }

    private fun timeDelta(start: Date, end: Date): Double {
        return (end.time - start.time).toDouble() / 1000.0
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
    fun logTimes(logger: ITMLogger, appContext: Context, title: String) {
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
        val jsonCheckpoints = JsonArray()
        for (checkpoint in checkpoints) {
            val row = arrayOf(
                checkpoint.first,
                timeFormat.format(checkpoint.second),
                timeDeltaString(lastTime, checkpoint.second),
                timeDeltaString(startTime, checkpoint.second),
            )
            jsonCheckpoints.add(jsonOf(mapOf(
                "action" to row[0],
                "timestamp" to checkpoint.second.time.epochMillisToISO8601(),
                "step" to timeDelta(lastTime, checkpoint.second),
                "total" to timeDelta(startTime, checkpoint.second),
            )))
            for (i in maxLengths.indices) {
                maxLengths[i] = max(maxLengths[i], row[i].length)
            }
            rows += row
            lastTime = checkpoint.second
        }
        var message = "${title}:\n"
        if (useJSON) {
            val actManager = appContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
            val memInfo = ActivityManager.MemoryInfo()
            actManager.getMemoryInfo(memInfo)
            val totalMemory = memInfo.totalMem
            val json = jsonOf(mapOf(
                "checkpoints" to jsonCheckpoints,
                "device" to jsonOf(
                    "cpuCores" to Runtime.getRuntime().availableProcessors(),
                    "memory" to totalMemory,
                    "modelID" to "${Build.MANUFACTURER} ${Build.MODEL}",
                    "modelIDRefURL" to "https://storage.googleapis.com/play_public/supported_devices.html",
                    "systemName" to "Android",
                    "systemVersion" to "API ${Build.VERSION.SDK_INT}",
                ),
                "iTwinVersion" to iTwinVersion,
                "timestamp" to Date().time.epochMillisToISO8601(),
                "title" to title,
                "totalTime" to timeDelta(startTime, lastTime),
                "usingRemoteServer" to usingRemoteServer
            ))
            message += json.toString(WriterConfig.PRETTY_PRINT)
        } else {
            message += buildRow(headerRow)
            message += buildRow(lineRow, "--+-", '-')
            for (row in rows) {
                message += buildRow(row)
            }
        }
        logger.log(ITMLogger.Severity.Info, message)
    }
}
