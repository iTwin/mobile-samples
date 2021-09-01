/*---------------------------------------------------------------------------------------------
* Copyright (c) 2021 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import { Messenger } from "@itwin/mobile-core";
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
        <Button title="Reload" onClick={() => {handleReload();}} />
        <div className="message">If it gets stuck here, switch away from app and back, then hit the Reload button.</div>
      </div>
    </Screen>
  );
}
