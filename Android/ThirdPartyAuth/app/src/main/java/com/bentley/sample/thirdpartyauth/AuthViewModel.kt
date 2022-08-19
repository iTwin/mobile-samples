package com.bentley.sample.thirdpartyauth

import android.content.Context
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.auth0.android.Auth0
import com.auth0.android.authentication.AuthenticationException
import com.auth0.android.callback.Callback
import com.auth0.android.provider.WebAuthProvider
import com.auth0.android.result.Credentials
import kotlinx.coroutines.*
import retrofit2.Retrofit
import java.lang.Exception

class AuthViewModel(resourceHelper: IResourceHelper) : ViewModel() {
	/** Used to lookup string resources */
	private val _resourceHelper = resourceHelper

	/** Authorization client to login to Auth0 */
	private var _auth0Client: Auth0 = Auth0(
		resourceHelper.getString(R.string.ITMSAMPLE_AUTH0_CLIENT_ID),
		resourceHelper.getString(R.string.ITMSAMPLE_AUTH0_DOMAIN)
	)


	private val _auth0Token: MutableLiveData<String?> = MutableLiveData(null)
	val auth0Token: LiveData<String?> = _auth0Token

	private val _bentleyToken: MutableLiveData<String?> = MutableLiveData(null)
	val bentleyToken: LiveData<String?> = _bentleyToken

	var displayText: MutableLiveData<String> = MutableLiveData("")

	fun loginToAuth0(context: Context) {
		WebAuthProvider.login(_auth0Client)
			.withScheme(_resourceHelper.getString(R.string.ITMSAMPLE_AUTH0_SCHEME))
			.withScope("openid profile offline_access")
			.withAudience(_resourceHelper.getString(R.string.ITMSAMPLE_AUTH0_AUDIENCE))
			// Launch the authentication passing the callback where the results will be received
			.start(context, object : Callback<Credentials, AuthenticationException> {
				// Called when there is an authentication failure
				override fun onFailure(exception: AuthenticationException) {
					displayText.value = "Something went wrong receiving token from auth0: ${exception.localizedMessage}"
				}

				// Called when authentication completed successfully
				override fun onSuccess(credentials: Credentials) {
					// Get the access token from the credentials object.
					// This can be used to call APIs
					_auth0Token.value = credentials.accessToken
					displayText.value = "Received token from auth0: ${_auth0Token.value}"
				}
			})
	}

	fun fetchBentleyToken(): Unit {
		val service = Retrofit.Builder()
			.baseUrl(_resourceHelper.getString(R.string.ITMSAMPLE_TOKEN_SERVER_URL))
			.build()
			.create(TokenService::class.java)

		CoroutineScope(Dispatchers.IO).launch {
			try {
				val response = service.getToken("Bearer ${auth0Token.value}")
				CoroutineScope(Dispatchers.Main).launch {
					_bentleyToken.value = response.string()
					displayText.value = "Received Bentley token from Token Server: ${bentleyToken.value}"
				}
			} catch(ex: Exception) {
				CoroutineScope(Dispatchers.Main).launch {
					_bentleyToken.value = null
					displayText.value = "Failed to retrieve Bentley token from the token server: ${ex.localizedMessage}"
				}
			}
		}
	}

}