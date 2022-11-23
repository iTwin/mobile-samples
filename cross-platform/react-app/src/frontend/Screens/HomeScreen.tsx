/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { Messenger } from "@itwin/mobile-sdk-core";
import { BackButton, useBeEvent } from "@itwin/mobile-ui-react";
import { Button, i18n, Screen } from "../Exports";
import { OfflineMapPort } from "../OfflineMapPort";

import "./HomeScreen.scss";

export enum ActiveScreen {
  Loading,
  Home,
  LocalModels,
  Hub,
  Model,
}

/// Properties for [[HomeScreen]] React component.
export interface HomeScreenProps {
  /// Callback to select another screen.
  onSelect: (screen: ActiveScreen) => void;
  showBackButton: boolean;
}

/// React component for Home screen (shown after loading has completed).
export function HomeScreen(props: HomeScreenProps) {
  const { onSelect, showBackButton } = props;
  const homeLabel = React.useMemo(() => i18n("HomeScreen", "Home"), []);
  const localModelsLabel = React.useMemo(() => i18n("HomeScreen", "LocalIModels"), []);
  const hubIModelsLabel = React.useMemo(() => i18n("HomeScreen", "HubIModels"), []);
  const [mapTilePort, setMapTilePort] = React.useState(OfflineMapPort.value);

  const handleBack = React.useCallback(async () => {
    Messenger.sendMessage("goBack");
  }, []);

  useBeEvent((port: number | undefined) => {
    setMapTilePort(port);
  }, OfflineMapPort.onChanged);

  return (
    <Screen className="home-screen">
      <div className="title">
        {showBackButton && <BackButton onClick={handleBack} />}
        <div className="title-text">{homeLabel}</div>
      </div>
      <div className="list">
        <div className="list-items">
          {mapTilePort !== undefined && <img src={`http://127.0.0.1:${mapTilePort}/8/207/98`} alt="Map Tile" />}
          <Button title={localModelsLabel} onClick={() => onSelect(ActiveScreen.LocalModels)} />
          <Button title={hubIModelsLabel} onClick={() => onSelect(ActiveScreen.Hub)} />
        </div>
      </div>
    </Screen>
  );
}
