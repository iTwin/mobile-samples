/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { Messenger } from "@itwin/mobile-sdk-core";
import { Button } from "./Button";
import { Screen } from "./Exports";
import "./LoadingScreen.scss";

/// React component that shows while the application is doing its initial loading of iModelJS and iTwinMobileUI.
export function LoadingScreen() {
  const handleReload = async () => {
    await Messenger.initialize();
    Messenger.sendMessage("reload");
  };
  return (
    <Screen>
      <div className="loading-screen">
        Loading...
        <Button title="Reload" onClick={() => { handleReload(); }} />
        <div className="message">If it gets stuck here, switch away from app and back, then hit the Reload button.</div>
      </div>
    </Screen>
  );
}
