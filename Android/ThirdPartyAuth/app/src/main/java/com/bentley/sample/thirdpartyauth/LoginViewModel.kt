package com.bentley.sample.thirdpartyauth

import android.content.Context
import android.content.Intent
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.auth0.android.Auth0
import com.auth0.android.authentication.AuthenticationException
import com.auth0.android.callback.Callback
import com.auth0.android.provider.WebAuthProvider
import com.auth0.android.result.Credentials
import com.bentley.sample.shared.MainActivity
import kotlinx.coroutines.*
import retrofit2.Retrofit
import java.lang.Exception

class LoginViewModel(resourceHelper: IResourceHelper) : ViewModel() {
	/** Used to lookup string resources */
	private val _resourceHelper = resourceHelper

	/** Authorization client to login to Auth0 */
	private var _auth0Client: Auth0 = Auth0(
		resourceHelper.getString(R.string.ITMSAMPLE_AUTH0_CLIENT_ID),
		resourceHelper.getString(R.string.ITMSAMPLE_AUTH0_DOMAIN)
	)

	private var _bentleyAuthClient: TokenServerAuthClient? = null

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
					val token = credentials.accessToken
					_auth0Token.value = token
					displayText.value = "Received token from auth0: ${token}"
					val bentleyAuthClient = TokenServerAuthClient(_resourceHelper.getString(R.string.ITMSAMPLE_TOKEN_SERVER_URL), token)
					_bentleyAuthClient = bentleyAuthClient

					// start the main activity with the auth token
					val app = context.applicationContext as ThirdPartyAuthApplication
					app.initITMApp(bentleyAuthClient)
					val intent = Intent(context, MainActivity::class.java)
					context.startActivity(intent)
				}
			})
	}
}