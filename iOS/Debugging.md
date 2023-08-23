# Debugging iTwin Mobile SDK-based iOS Apps

## Native Debugging

When you run the app from Xcode, you can use Xcode to debug any of your native code. Simply by starting a debug session as normal, all the usual Xcode debugging functionaliy works for native code. However, Xcode can *only* debug native code, not TypeScript (or JavaScript) code. Note: this guide assumes that you will be writing TypeScript code, but anywhere it mentions TypeScript, be aware that if you do have JavaScript code, it will work for that also.

## TypeScript Debugging

To debug your frontend TypeScript code, you use the Safari Debugger from Safari on your Mac. In order to do this, you must configure Safari on your Mac to enable its Develop menu and Mobile Safari on your device to allow remote debugging.

1. In Safari on your Mac, select "Preferences..." from the "Safari" top-level menu.
1. Go to the "Advanced" tab.
1. Check the "Show Develop menu in menu bar" check box.

Next, you must enable remote debugging on your device.

1. Launch the Settings app on the device.
1. Select "Safari" from the top level list.
1. Scroll all the way to the bottom of the Safari settings and select "Advanced".
1. Turn on the "Web Inspector" switch.

Once you have configured Safari on your Mac and Mobile Safari on your device, you are ready to debug your TypeScript. Note: in iOS 16.4 and later, the `isInspectable` property of the `WKWebView` containing the web app must be set to `true`. This is done automatically in debug builds in `ITMApplication.createEmptyWebView`. If you override `createEmptyWebView` without calling super, or you want to debug a release build, you must set this property to `true` yourself.

1. Launch Safari on your Mac.
1. Launch your app from Xcode, and make sure it is launched and in the foreground on your device.
1. From Safari on your Mac, select the "Develop" menu.
1. You should see a list of devices in the second grouped section of that menu. Your iOS device's name should show up as one of the devices. Select that submenu.
1. You should see an entry for your running app on the device. Select it.
1. This will open the Safari Web Inspector (debugger). From here you can look at the HTML DOM tree of the running app, as well as debug and profile your TypeScript code.

This document is not intended to provide in-depth instructions on using the Safari Web Inspector. For that, you'll need to look at the [official documentation](https://webkit.org/web-inspector/), as well as any guides that are available from third parties on the web. However, we will quickly summarize the most frequently used functionality.

Note that the overview below assumes that you are using React for your UI, and that you used something similar to the sample app's index.html (which has a top-level `div` element with an id of `root` into which the React UI renders). Also note that these instructions were created for Safari 16.5. If you have a different version of Safari, there might be minor differences.

1. Across the top of the Safari Web Inspector are a number of tabs. If you right click on any tab, you should see the list of possible tabs that can be enabled and disabled.
1. You can click and drag any tab to reorder the tabs.
1. The Elements tab shows the HTML DOM tree for your running app.
    * The left side of the window should show the DOM tree, while the right side has an inspector pane with informations about the selected DOM node. If you don't see the inspector pane, click the rightmost button in the toolbar just underneath the tab bar at the top of the window.
    * When you first open this tab, the `html` element of the document should already be expanded, and the `body` element should be selected. If not, you can do that manually. Also, expand the `body` element.
    * Inside the `body` element, you should see a `div` element with an `id` of `root`. This element is the top-level element of the React-based UI. Expand that.
    * Inside that `root` `div` is your React UI. You can navigate it to see all of the elements in your UI.
    * If you want to find a specific element, you can hit Cmd+F to bring up a find UI, then type in a search string.
    * When you select an element (or just hover your cursor over it), it will highlight on your device if it is a graphical element.
    * You will see information about the selected element in the inspector pane to the right.
1. The Sources tab shows your loaded source files, as well as any breakpoints you have set, and the call stack if the debugger is paused.
    * While in theory you can select sources from the list on the left, in practice it doesn't work very well, since that list doesn't respect the map files that map your original TypeScript source into JavaScript, and the React build process bundles all the source up into a relatively small number of extremely obfuscated JavaScript files.
    * Hit Cmd+P to bring up the "File or Resource" picker. Start typing the name of your original TypeScript source file, then select the file when it shows up in the list.
        * **Note 1:** If you do this right after connecting to your app, Safari sometimes hasn't fully loaded the list of map files, and so won't find the file you are looking for. If this happens, hit escape until the "File or Resource" picker is gone, then hit Cmd+P and try again.
        * **Note 2:** Sometimes when you pick your file, Safari doesn't show it. If this happens, just repeat.
    * Once a file is selected, you can set breakpoints in the file by clicking on any line number.
    * Clicking on a breakpoint that is already set toggles whether it is enabled, but leaves the breakpoint in place. You can click and drag the breakboint away to delete it entirely. You can also select a breakpoint from the full list of breakpoints in the navigator on the far left of the window and hit backspace to delete it. If you select a file from that breakpoints list and hit backspace, it will delete all breakpoints in that file.
    * When you hit a breakpoint and the debugger pauses, you can see information in the inspector pane on the right. If this is not visible, enable it using the rightmost button in the toolbar directly under the tabs at the top of the window.
    * A Console line is visible at the bottom of the screen. You can type JavaScript directly into that console. If you do so (for example typing "document" and hitting enter), the console line will expand to show you the return value of the JavaScript you executed.
1. The Storage tab shows data stored in Local Storage and Session Storage.
    * If you use the Hub iModels screen on the sample app and select a project, you will see an entry that this process creates in Local Storage.
    * If you download and open a hub iModel, you will see an entry in Local Store that maps its GUID to its name.
1. The Network tab shows network traffic that your app makes via the web view. *Note:* Downloading of iModels happens in the backend, and so does not show up here.
1. The Timelines tab is Safari's profiler.
1. The Graphics tab shows various graphics-related information.
1. The Layers tab shows layers in your UI. You can click and drag to rotate to see layers that are covered by other layers. Clicking on a layer gives you information about that layer.
1. The Audit tab allows you to check that a web page conforms to certain rules. (See this [blog post](https://webkit.org/blog/8935/audits-in-web-inspector/).)
1. The Console tab shows a JavaScript console. At the very bottom is a console command line where you can type JavaScript to have it execute inside your running app. Above that is any console output (including results from JavaScript code that you directly execute).