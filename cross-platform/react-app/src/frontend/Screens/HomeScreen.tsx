/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { IconSpecUtilities } from "@itwin/appui-abstract";
import { Messenger } from "@itwin/mobile-sdk-core";
import { BackButton, IconImage } from "@itwin/mobile-ui-react";
import { ActiveScreen, Button, Screen, signOut, useLocalizedString } from "../Exports";
import "./HomeScreen.scss";

// With svg.d.ts present in the root of this project, Webpack automatically handles the import below
// by having folderSvg be the path to the name-mangled version of folder.svg.
import folderSvg from "../Images/folder.svg";
// IconSpecUtilities.createWebComponentIconSpec takes the SVG path and tweaks it for use in any
// place that expects an IconSpec.
const folderIconSpec = IconSpecUtilities.createWebComponentIconSpec(folderSvg);

/**
 *  Properties for {@link HomeScreen} React component.
 */
export interface HomeScreenProps {
  /** Callback to select another screen. */
  onSelect: (screen: ActiveScreen) => void;
  showBackButton: boolean;
}

/**
 *  React component for Home screen (shown after loading has completed).
 */
export function HomeScreen(props: HomeScreenProps) {
  const { onSelect, showBackButton } = props;
  const homeLabel = useLocalizedString("HomeScreen", "Home");
  const localModelsLabel = useLocalizedString("HomeScreen", "LocalIModels");
  const hubIModelsLabel = useLocalizedString("HomeScreen", "HubIModels");
  const signOutLabel = useLocalizedString("Shared", "SignOut");

  const handleBack = React.useCallback(async () => {
    Messenger.sendMessage("goBack");
  }, []);

  return (
    <Screen className="home-screen">
      <div className="title">
        {showBackButton && <BackButton onClick={handleBack} />}
        <IconImage iconSpec="icon-home" margin="0px 0px 0px 10px" size="28px" />
        <div className="title-text">{homeLabel}</div>
      </div>
      <div className="list">
        <div className="list-items">
          <Button
            icon={<IconImage iconSpec={folderIconSpec} margin="0px 8px 0px 0px" size="28px" />}
            title={localModelsLabel}
            onClick={() => onSelect(ActiveScreen.LocalModels)} />
          <Button title={hubIModelsLabel} onClick={() => onSelect(ActiveScreen.Hub)} />
          <Button title={signOutLabel} onClick={async () => signOut()} />
        </div>
      </div>
    </Screen>
  );
}
