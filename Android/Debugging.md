# Debugging iTwin Mobile SDK-based Android Apps

## Native Debugging

When you run the app from Android Studio, you can use Android Studio to debug any of your native code. Simply by starting a debug session as normal, all the usual Android Studio debugging functionaliy works for native code. However, Android Studio can *only* debug native code, not TypeScript (or JavaScript) code. Note: this guide assumes that you will be writing TypeScript code, but anywhere it mentions TypeScript, be aware that if you do have JavaScript code, it will work for that also.

## TypeScript Debugging

To debug your frontend TypeScript code, you use the Chrome Developer Tools in Google Chrome on your computer. Instructions for setting this up can be found [here](https://developer.chrome.com/docs/devtools/remote-debugging/).

Note: USB debugging may only worked reliably if you disable "Discover network targets" in the Chrome Developer Tools.

Once you have configured Google Chrome on your computer and debug settings on your device, you are ready to debug your TypeScript.

1. Launch Google Chrome on your computer.
1. Launch your app from Android Studio, and make sure it is launched and in the foreground on your device.
1. In Google Chrome, navigate to the URl `chrome://inspect/#devices`.
1. You should see an entry for "WebView in ..." on the list; click the `inspect` link for that entry. If you do not see the entry, you may have to reload the page.
1. This will open a DevTools window (debugger). From here you can look at the HTML DOM tree of the running app, as well as debug and profile your TypeScript code.

This document is not intended to provide in-depth instructions on using the Chrome Developer Tools. For that, you'll need to look at the [official documentation](https://developer.chrome.com/docs/), as well as any guides that are available from third parties on the web. However, we will quickly summarize the most frequently used functionality.

Note that the overview below assumes that you are using React for your UI, and that you used something similar to the sample app's index.html (which has a top-level `div` element with an id of `root` into which the React UI renders). Also note that these instructions were created for Google Chrome 100. If you have a different version of Google Chrome, there might be minor differences.

1. The preview area on the left side of the window will show your running app's page contents, but does not display any WebGL content. That means that if you are on a screen that shows an iModel, the iModel itself won't be visible in the preview.
1. Across the top of the DevTools window are a number of tabs.
1. The Elements tab shows the HTML DOM tree for your running app.
    * The left side should show the DOM tree, while the right side has an inspector pane with information about the selected DOM node.
    * When you first open this tab, the `html` element of the document should already be expanded, as well as the `body` element, and the `body` element should be selected. If not, you can do that manually.
    * Inside the `body` element, you should see a `div` element with an `id` of `root`. This element is the top-level element of the React-based UI. Expand that.
    * Inside that `root` `div` is your React UI. You can navigate it to see all of the elements in your UI.
    * If you want to find a specific element, you can hit Ctrl+F (Cmd+F on macOS) to bring up a find UI, then type in a search string.
    * When you select an element (or just hover your cursor over it), it will highlight in the preview area if it is a graphical element.
    * You will see information about the selected element in the inspector pane to the right.
1. The Sources tab shows your loaded source files, as well as any breakpoints you have set, and the call stack if the debugger is paused.
    * You can select sources from the list on the left; you should see a folder that represents your React app.
    * Hit Ctrl+P (Cmd+P on Mac) to bring up the file picker. Start typing the name of your original TypeScript source file, then select the file when it shows up in the list.
    * Once a file is selected, you can set breakpoints in the file by clicking on any line number.
    * Clicking on a breakpoint that is already set toggles it back off (unsets it). If you want to leave a breakpoint, but toggle it off, you can uncheck the checkbox next to it in the Breakpoints list on the right. You can also right click on the breakpoint in that list to see a list of things you can do (including deleting it and jumping to it in the source view).
    * When you hit a breakpoint and the debugger pauses, you can see information in the inspector pane on the right.
    * If you don't see the Console drawer at the bottom of the screen, you can hit Escape to show it. You can type JavaScript directly into that console. If you do so (for example typing "document" and hitting enter), the console will show you the result of whatever you typed.
1. The Application tab includes various useful pieces of information, including Local Storage and Session Storage.
    * If you use the Hub iModels screen on the sample app and select a project, you will see an entry that this process creates in Local Storage.
    * If you download and open a hub iModel, you will see an entry in Local Store that maps its GUID to its name.
1. The Network tab shows network traffic that your app makes via the web view. *Note:* Downloading of iModels happens in the backend, and so does not show up here.
1. The Performance tab is a profiler.
1. The Console tab shows a JavaScript console. At the very bottom is a console command line where you can type JavaScript to have it execute inside your running app. Above that is any console output (including results from JavaScript code that you directly execute).
1. Sometimes (at least on some devices), the USB connection will get lost, and the device will ask for permission to connect to the computer. Grant the permission, but if this happens, you will likely need to kill the app and restart, as well as probably disconnecting and reconnecting the USB cable.