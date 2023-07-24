/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
#import <RCTAppDelegate.h>
#import <UIKit/UIKit.h>
@import ITwinMobile;
#import "iTwinRNStarter-Swift.h"

@interface AppDelegate : RCTAppDelegate

@property (nonatomic, strong) ModelApplicationBridge *modelApplicationBridge;

@end
