/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
package com.bentley.sample.shared

import android.app.ActivityManager
import android.content.Context
import android.os.Build
import com.github.itwin.mobilesdk.ITMLogger
import com.github.itwin.mobilesdk.epochMillisToISO8601
import com.github.itwin.mobilesdk.jsonvalue.jsonOf
import org.json.JSONArray
import org.json.JSONObject
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
    private data class Checkpoint(val name: String, val timestamp: Date)
    private val checkpoints: MutableList<Checkpoint> = mutableListOf()
    private var maxLengths: Array<Int> = emptyArray()

    /**
     * Add a checkpoint.
     *
     * @param name The name of the checkpoint.
     */
    fun addCheckpoint(name: String) {
        if (!enabled) return
        checkpoints.add(Checkpoint(name, Date()))
    }

    /**
     * Create a string representing the elapsed time (in seconds and milliseconds) between two
     * [Date] values.
     *
     * @param start The start date for the elapsed time.
     * @param end The end date for the elapsed time.
     * @return A string representing the elapsed time between [start] and [end].
     */
    private fun timeDeltaString(start: Date, end: Date): String {
        return String.format("%.3f", timeDelta(start, end))
    }

    /**
     * Determine the elapsed time (in floating point seconds) between two [Date] values.
     *
     * @param start The start date for the elapsed time.
     * @param end The end date for the elapsed time.
     * @return The number of seconds between [start] and [end].
     */
    private fun timeDelta(start: Date, end: Date): Double {
        return (end.time - start.time).toDouble() / 1000.0
    }

    /**
     * Join all of the strings in [row] using [separator], then add a line feed.
     *
     * Each value will be padded based on the associated value in [maxLengths].
     *
     * @param row The strings to join together.
     * @param separator The separator to use when joining the strings.
     * @param padChar The character to use to pad values in the row.
     * @return The joined string.
     */
    private fun buildRow(row: Array<String>, separator: String = "  | ", padChar: Char = ' ') =
        "${row.zip(maxLengths).joinToString(separator) { (field, length) -> field.padEnd(length, padChar) }}\n"

    /**
     * Get the timing information in JSON format.
     *
     * @param appContext The application's [Context].
     * @param title The information title.
     * @return Timing information in JSON format.
     */
    private fun getJSONOutput(appContext: Context, title: String): String {
        var lastTime = startTime
        val jsonCheckpoints = JSONArray()
        for ((name, timestamp) in checkpoints) {
            jsonCheckpoints.put(JSONObject(mapOf(
                "action" to name,
                "timestamp" to timestamp.time.epochMillisToISO8601(),
                "step" to timeDelta(lastTime, timestamp),
                "total" to timeDelta(startTime, timestamp),
            )))
            lastTime = timestamp
        }
        val actManager = appContext.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
        val memInfo = ActivityManager.MemoryInfo()
        actManager.getMemoryInfo(memInfo)
        val totalMemory = memInfo.totalMem
        val json = jsonOf(
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
        )
        return json.toPrettyString()
    }

    /**
     * Get timing information in human-readable text format.
     *
     * @return Timing information in human-readable text format.
     */
    private fun getTextOutput(): String {
        val timeFormat = SimpleDateFormat("HH:mm:ss.SSS", Locale.US)
        val headerRow = arrayOf(nameTitle, "START", "STEP", "TOTAL")
        val lineRow = Array(headerRow.size) { "" }
        var lastTime = startTime
        var rows: Array<Array<String>> = emptyArray()
        maxLengths = headerRow.map { it.length }.toTypedArray()
        for ((name, timestamp) in checkpoints) {
            val row = arrayOf(
                name,
                timeFormat.format(timestamp),
                timeDeltaString(lastTime, timestamp),
                timeDeltaString(startTime, timestamp),
            )
            for (i in maxLengths.indices) {
                maxLengths[i] = max(maxLengths[i], row[i].length)
            }
            rows += row
            lastTime = timestamp
        }
        return buildString {
            append("DEVICE MODELID: ${Build.MANUFACTURER} ${Build.MODEL}\n")
            append(buildRow(headerRow))
            append(buildRow(lineRow, "--+-", '-'))
            for (row in rows) {
                append(buildRow(row))
            }
        }
    }

    /**
     * Log the time of all checkpoints if [enabled] is `true`.
     *
     * @param logger The [ITMLogger] to use to log the times.
     * @param appContext The application's [Context].
     * @param title Title to be printed before the output.
     */
    fun logTimes(logger: ITMLogger, appContext: Context, title: String) {
        if (!enabled) return
        if (checkpoints.isEmpty()) {
            logger.log(ITMLogger.Severity.Info, "${title}:\nNO CHECKPOINTS.")
            return
        }
        val output = if (useJSON) getJSONOutput(appContext, title) else getTextOutput()
        logger.log(ITMLogger.Severity.Info, "$title:\n$output")
    }
}
