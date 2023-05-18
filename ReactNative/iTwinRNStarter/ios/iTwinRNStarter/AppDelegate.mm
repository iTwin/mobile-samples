/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <React/RCTRootView.h>
#import <WebKit/WebKit.h>

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"iTwinRNStarter";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  [[NSNotificationCenter defaultCenter] addObserver:self selector:@selector(contentDidAppear:) name:RCTContentDidAppearNotification object:nil];
  self.modelApplicationBridge = [[ModelApplicationBridge alloc] init];
  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

/// Find a `WKWebView` in the view hierarchy of the given view.
/// - Parameter parentView: An ancestor view of a `WKWebView`.
- (WKWebView *)findWebView:(UIView *)parentView
{
  for (UIView *view in parentView.subviews)
  {
    if ([view isKindOfClass:[WKWebView class]])
    {
      return (WKWebView *)view;
    }
    else
    {
      WKWebView *webView = [self findWebView:view];
      if (webView != nil)
      {
        return webView;
      }
    }
  }
  return nil;
}

/// Start up iTwin Mobile once the initial UI loading is done.
/// - Parameter notification: The notification object that posted the notification.
- (void)contentDidAppear:(NSNotification *)notification
{
  WKWebView *webView = [self findWebView:self.window.rootViewController.view];
  if (webView != nil)
  {
    [self.modelApplicationBridge startup:webView];
  }
}

/// This method controls whether the `concurrentRoot`feature of React18 is turned on or off.
///
/// @see: https://reactjs.org/blog/2022/03/29/react-v18.html
/// @note: This requires to be rendering on Fabric (i.e. on the New Architecture).
/// @return: `true` if the `concurrentRoot` feature is enabled. Otherwise, it returns `false`.
- (BOOL)concurrentRootEnabled
{
  return true;
}

@end

@implementation WKWebViewConfiguration(ITwinCustomization)

/// Create a new `WKWebViewConfiguration` and then customize it for use with iTwin Mobile.
///
/// React Native does not provide a mechanism to customize the `WKWebViewConfiguration` used by its WebView
/// component. Since iTwin Mobile __requires__ the configuration to be customized, and the configuration cannot be
/// customized __after__ the `WKWebView` is created, this override of `NSObject`'s `new` class function makes it
/// so that all `WKWebViewConfiguration` objects created using `new` will be customized to work with iTwin Mobile.
/// Since all that `NSObject`'s `new` does is `return [[self alloc] init]`, it is an easy function to replace.
///
/// - Note: This only works because React Native uses `new` to create its `WKWebViewConfiguration`. If it
/// instead used `alloc init`, there would be no convenient way to perform this customization.
+ (instancetype)new {
  WKWebViewConfiguration *configuration = [[self alloc] init];
  [RNModelApplication setupWebViewConfiguration:configuration];
  return configuration;
}

@end
