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
    init() {
        ITMViewController.applicationType = ModelApplication.self
    }
    var body: some Scene {
        WindowGroup {
            ITMSwiftUIContentView()
                .edgesIgnoringSafeArea(.all)
        }
    }
}
