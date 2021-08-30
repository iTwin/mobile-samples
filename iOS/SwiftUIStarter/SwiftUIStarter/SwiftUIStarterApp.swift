//
//  SwiftUIStarterApp.swift
//  SwiftUIStarter
//
//  Created by Todd Southen on 2021-08-18.
//

import SwiftUI
import ITwinMobile

@main
struct SwiftUIStarterApp: App {
    private var application = ModelApplication()
    
    var body: some Scene {
        return WindowGroup {
            ITMSwiftUIContentView(application: application)
                .edgesIgnoringSafeArea(.all)
        }
    }
}
