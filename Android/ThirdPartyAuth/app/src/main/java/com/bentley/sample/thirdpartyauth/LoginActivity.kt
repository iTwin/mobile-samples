package com.bentley.sample.thirdpartyauth

import android.content.res.Configuration
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material.Button
import androidx.compose.runtime.livedata.observeAsState
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Surface
import androidx.compose.material.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import com.bentley.sample.thirdpartyauth.ui.theme.ThirdPartyAuthTheme

class LoginActivity : ComponentActivity() {

    lateinit var resourceHelper: ResourceHelper

    lateinit var loginViewModel: LoginViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        resourceHelper = ResourceHelper(application)
        loginViewModel = LoginViewModel(resourceHelper)

        setContent {
            ThirdPartyAuthTheme {
                // A surface container using the 'background' color from the theme
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colors.background) {
                    LoginView(loginViewModel)
                }
            }
        }
    }

}

@Composable
fun LoginView(vm: LoginViewModel) {

    val displayText by vm.displayText.observeAsState("")
    val thirdPartyToken by vm.auth0Token.observeAsState()
    val tokenServerToken by vm.bentleyToken.observeAsState()

    Column {
        val context = LocalContext.current

        Button(onClick = { vm.loginToAuth0(context) }, enabled = thirdPartyToken == null) {
            Text ("Login")
        }
        Text(displayText)
    }
}

@Preview(showBackground = true, uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
fun DefaultPreview() {
    val context = LocalContext.current
    class previewResourceHelper: IResourceHelper {
        override fun getString(id: Int): String {
            return context.getString(id)
        }
    }

    val previewVm = LoginViewModel(previewResourceHelper())

    ThirdPartyAuthTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colors.background) {
            LoginView(previewVm)
        }
    }
}
