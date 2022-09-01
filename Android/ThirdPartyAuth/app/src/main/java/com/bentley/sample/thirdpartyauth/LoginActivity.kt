package com.bentley.sample.thirdpartyauth

import android.content.res.Configuration
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.material.Button
import androidx.compose.material.MaterialTheme
import androidx.compose.material.Surface
import androidx.compose.material.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.livedata.observeAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bentley.sample.thirdpartyauth.ui.theme.ThirdPartyAuthTheme

class LoginActivity : ComponentActivity() {

    lateinit var loginViewModel: LoginViewModel

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        loginViewModel = (application as ThirdPartyAuthApplication).loginViewModel

        setContent {
            ThirdPartyAuthTheme {
                // A surface container using the 'background' color from the theme
                Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colors.background) {
                    LoginView(loginViewModel)
                }
            }
        }
    }

    override fun onStart() {
        super.onStart()
        loginViewModel.displayText.value = ""
    }

}

@Composable
fun LoginView(vm: LoginViewModel) {

    val displayText by vm.displayText.observeAsState("")

    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        val context = LocalContext.current

        Button(
            onClick = { vm.loginToAuth0(context) },
            modifier = Modifier.size(150.dp, 65.dp)
        ) {
            Text(stringResource(R.string.login), fontSize = 25.sp)
        }
        Text(displayText)
    }
}

@Preview(showBackground = true, uiMode = Configuration.UI_MODE_NIGHT_YES)
@Composable
fun DefaultPreview() {
    val context = LocalContext.current

    class PreviewResourceHelper : IResourceHelper {
        override fun getString(id: Int): String {
            return context.getString(id)
        }

        override fun getString(id: Int, vararg formatArgs: Any): String {
            return context.getString(id, formatArgs)
        }
    }

    val previewVm = LoginViewModel(PreviewResourceHelper())

    ThirdPartyAuthTheme {
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colors.background) {
            LoginView(previewVm)
        }
    }
}
