/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import UIKit
import ITwinMobile

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Customize the ITMViewController used by the sample app. Note that since this sample
        // puts all of the UI inside a full-screen WKWebView, it has no customization to the
        // view controller, and simply uses the ITMViewController in its storyboard.
        
        // Use our ModelApplication (a subclass of ITMApplication) as the application object.
        ITMViewController.application = ModelApplication()
        if #available(iOS 13, *) {
            // Delay the automatic loading of the frontend and backend to account for problem when
            // that happens before the application's first willEnterForeground.
            // Note that the sequence of events is different prior to iOS 13, so only do this in
            // iOS 13 and later.
            ITMViewController.delayedAutoLoad = true
        }
        return true
    }

    // MARK: UISceneSession Lifecycle

    @available(iOS 13.0, *)
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        // Called when a new scene session is being created.
        // Use this method to select a configuration to create the new scene with.
        return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    }

    @available(iOS 13.0, *)
    func application(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {
        // Called when the user discards a scene session.
        // If any sessions were discarded while the application was not running, this will be called shortly after application:didFinishLaunchingWithOptions.
        // Use this method to release any resources that were specific to the discarded scenes, as they will not return.
    }
    
    func application(_ application: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Note: This only gets called in iOS prior to 13.
        DocumentHelper.openInboxUrl(url)
        return true
    }
}
