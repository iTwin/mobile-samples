package com.bentley.sample.thirdpartyauth

import android.content.Context
import android.content.Intent
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.auth0.android.Auth0
import com.auth0.android.authentication.AuthenticationException
import com.auth0.android.callback.Callback
import com.auth0.android.provider.WebAuthProvider
import com.auth0.android.result.Credentials
import com.bentley.sample.shared.MainActivity

class LoginViewModel(
    resourceHelper: IResourceHelper,
    var onAuth0TokenUpdated: (auth0Token: String) -> Unit = {},
) : ViewModel() {
    /** Used to lookup string resources */
    private val _resourceHelper = resourceHelper
    
    /** Authorization client to login to Auth0 */
    private var _auth0Client: Auth0 = Auth0(
        resourceHelper.getString(R.string.ITMSAMPLE_AUTH0_CLIENT_ID), // from ITMSamples.properties
        resourceHelper.getString(R.string.ITMSAMPLE_AUTH0_DOMAIN) // from ITMSamples.properties
    )
    
    var displayText: MutableLiveData<String> = MutableLiveData("")
    
    fun loginToAuth0(context: Context) {
        displayText.value = _resourceHelper.getString(R.string.login_to_auth0)
        WebAuthProvider.login(_auth0Client)
            .withScheme(_resourceHelper.getString(R.string.ITMSAMPLE_AUTH0_SCHEME)) // from ITMSamples.properties
            .withScope("openid profile offline_access")
            .withAudience(_resourceHelper.getString(R.string.ITMSAMPLE_AUTH0_AUDIENCE)) // from ITMSamples.properties
            // Launch the authentication passing the callback where the results will be received
            .start(context, object : Callback<Credentials, AuthenticationException> {
                // Called when there is an authentication failure
                override fun onFailure(error: AuthenticationException) {
                    displayText.value = _resourceHelper.getString(R.string.auth0_login_error, error.localizedMessage)
                }
                
                // Called when authentication completed successfully
                override fun onSuccess(result: Credentials) {
                    // Get the access token from the credentials object.
                    val auth0Token = result.accessToken
                    displayText.value = _resourceHelper.getString(R.string.auth0_login_success)
                    onAuth0TokenUpdated(auth0Token)
                    // start the main activity with the auth token
                    val intent = Intent(context, MainActivity::class.java)
                    context.startActivity(intent)
                }
            })
    }
}