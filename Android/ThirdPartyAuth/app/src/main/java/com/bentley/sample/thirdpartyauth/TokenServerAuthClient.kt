package com.bentley.sample.thirdpartyauth

import com.auth0.android.jwt.JWT
import com.bentley.itwin.AuthTokenCompletionAction
import com.bentley.itwin.AuthorizationClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import retrofit2.Retrofit

class TokenServerAuthClient(private val tokenServerUrl: String, private var auth0Token: String) : AuthorizationClient() {

    private var bentleyToken: String? = null

    private suspend fun fetchBentleyToken(): String {
        val service = Retrofit.Builder()
            .baseUrl(tokenServerUrl)
            .build()
            .create(TokenService::class.java)

        val response = service.getToken("Bearer $auth0Token")
        return response.string()
    }

    override fun getAccessToken(tokenAction: AuthTokenCompletionAction?) {
        val jwt: JWT? = if (bentleyToken == null) null else JWT(bentleyToken!!)
        if (jwt == null || jwt.isExpired(30)) {
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    bentleyToken = fetchBentleyToken()
                    val jwt2 = JWT(bentleyToken!!.substring("Bearer ".length))
                    val exp = jwt2.getClaim("exp").asString()!!
                    notifyAccessTokenChanged(bentleyToken, exp)
                    tokenAction?.resolve(bentleyToken, exp)
                } catch (ex: Exception) {
                    tokenAction?.error(ex.localizedMessage)
                }
            }
        } else {
            tokenAction?.resolve(bentleyToken, jwt.getClaim("exp").asString()!!)
        }
    }
}