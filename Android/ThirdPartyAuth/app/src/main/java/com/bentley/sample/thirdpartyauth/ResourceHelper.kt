package com.bentley.sample.thirdpartyauth

import android.app.Application

/**
 * A helper interface to load strings from a resource file.
 */
interface IResourceHelper {
    /**
     * Retrieve the string resource
     * @param id the id of the string resource
     */
    fun getString(id: Int): String
    
    fun getString(id: Int, vararg formatArgs: Any): String
}

/**
 * An Android implementation of IResourceHelper that loads values using the Android Application Context
 */
class ResourceHelper(context: Application) : IResourceHelper {
    
    private val _context: Application = context
    
    override fun getString(id: Int): String {
        return _context.getString(id)
    }
    
    override fun getString(id: Int, vararg formatArgs: Any): String {
        return _context.getString(id, formatArgs)
    }
    
}