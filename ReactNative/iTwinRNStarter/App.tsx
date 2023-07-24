/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from 'react';
import {SafeAreaView, StatusBar, Text, useColorScheme} from 'react-native';
import WebView from 'react-native-webview';
import {Colors} from 'react-native/Libraries/NewAppScreen';

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
    flex: 1,
  };
  const webViewStyle = {flex: 1};

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={backgroundStyle.backgroundColor}
      />
      <Text>Welcome to the iTwin.js ReactNative Sample!</Text>
      <WebView
        originWhitelist={['*']}
        source={{html: '<h1>iTwin.js content appears here</h1>'}}
        style={webViewStyle}
        applicationNameForUserAgent="iTwin.js" //could be used by native code to identify the webView if app uses more than one webView
      />
    </SafeAreaView>
  );
}

export default App;
