//
//  ViewController.swift
//  MobileStarter
//
//  Created by Travis Local on 4/8/21.
//

import UIKit
import WebKit
import ITwinMobile

class ViewController: UIViewController {
    private let queryName = "Bentley_ITMMessenger_Query"
    private var jsQueue: [String] = []
    private var jsBusy = false
    private let ma = ModelApplication()
    private var iTwinMobile: ITwinMobile?
    private var loadedOnce = false
    private var willEnterForegroundObserver: Any? = nil

    deinit {
        if let willEnterForegroundObserver = willEnterForegroundObserver {
            NotificationCenter.default.removeObserver(willEnterForegroundObserver)
        }
    }

    override func viewWillAppear(_ animated: Bool) {
        iTwinMobile = ITwinMobile(viewController: self, itmMessenger: ma.itmMessenger)
        super.viewWillAppear(animated)
    }

    override func viewWillDisappear(_ animated: Bool) {
        iTwinMobile?.detach()
        iTwinMobile = nil
        super.viewWillDisappear(animated)
    }

    override func viewDidLoad() {
        willEnterForegroundObserver = NotificationCenter.default.addObserver(forName: UIApplication.willEnterForegroundNotification, object: nil, queue: nil) { _ in
            if !self.loadedOnce {
                self.ma.loadBackend(true)
                // Due to a bug in iModelJS, loadFrontend must be executed after the initial willEnterForegroundNotification.
                Timer.scheduledTimer(withTimeInterval: 2, repeats: false) { _ in
                    self.ma.loadFrontend();
                }
                self.loadedOnce = true
            }
        }
        super.viewDidLoad()
        let webView = ma.webView
        view = webView
    }
}
