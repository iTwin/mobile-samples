package com.bentley.sample.thirdpartyauth

import com.auth0.android.authentication.storage.CredentialsManager
import com.auth0.android.jwt.JWT
import com.bentley.itwin.AuthTokenCompletionAction
import com.bentley.itwin.AuthorizationClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import retrofit2.Retrofit
import java.time.Instant
import java.time.format.DateTimeFormatter

class TokenServerAuthClient(private val tokenServerUrl: String, private var auth0CredentialManager: CredentialsManager) : AuthorizationClient() {

    private var bentleyToken: String? = null

    private suspend fun fetchBentleyToken(): String {
        val service = Retrofit.Builder()
            .baseUrl(tokenServerUrl)
            .build()
            .create(TokenService::class.java)

        val credentials = auth0CredentialManager.awaitCredentials(null, 30)
        val auth0Token = credentials.accessToken
        val response = service.getToken("Bearer $auth0Token")
        @Suppress("BlockingMethodInNonBlockingContext")
        return response.string()
    }

    override fun getAccessToken(tokenAction: AuthTokenCompletionAction?) {
        val jwt: JWT? = if (bentleyToken == null) null else JWT(bentleyToken!!)
        if (jwt == null || jwt.isExpired(30)) {
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val bearerToken = fetchBentleyToken()
                    bentleyToken = bearerToken.substring("Bearer ".length)
                    val jwt2 = JWT(bentleyToken!!)
                    val unixEpochExp = jwt2.getClaim("exp").asLong()!!
                    val isoTimestampExp = unixEpochToISO(unixEpochExp)
                    notifyAccessTokenChanged(bearerToken, isoTimestampExp)
                    tokenAction?.resolve(bearerToken, isoTimestampExp)
                } catch (ex: Exception) {
                    tokenAction?.error(ex.localizedMessage)
                }
            }
        } else {
            val isoVal = unixEpochToISO(jwt.getClaim("exp").asLong()!!)
            tokenAction?.resolve("Bearer $bentleyToken", isoVal)
        }
    }

    private fun unixEpochToISO(epoch: Long): String {
        return DateTimeFormatter.ISO_INSTANT.format(Instant.ofEpochSecond(epoch))
    }
}