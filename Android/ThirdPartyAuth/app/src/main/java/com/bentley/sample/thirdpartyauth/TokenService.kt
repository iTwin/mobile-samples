package com.bentley.sample.thirdpartyauth

import okhttp3.ResponseBody
import retrofit2.http.GET
import retrofit2.http.Header

interface TokenService {
    @GET("/getToken")
    suspend fun getToken(@Header("Authorization") authorization: String): ResponseBody
    
}