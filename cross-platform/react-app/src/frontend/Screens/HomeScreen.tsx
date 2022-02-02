/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { Button, i18n, Screen } from "../Exports";
import "./HomeScreen.scss";

export enum ActiveScreen {
  Loading,
  Home,
  Snapshots,
  Hub,
  Model,
};

/// Properties for [[HomeScreen]] React component.
export interface HomeScreenProps {
  /// Calback to select another screen.
  onSelect: (screen: ActiveScreen) => void;
}

/// React component for Home screen (shown after loading has completed).
export function HomeScreen(props: HomeScreenProps) {
  const { onSelect } = props;
  const homeLabel = React.useMemo(() => i18n("HomeScreen", "Home"), []);
  const snapshotIModelsLabel = React.useMemo(() => i18n("HomeScreen", "SnapshotIModels"), []);
  const hubIModelsLabel = React.useMemo(() => i18n("HomeScreen", "HubIModels"), []);
  return (
    <Screen>
      <div className="home-screen">
        <div className="title">{homeLabel}</div>
        <div className="list">
          <div className="list-items">
            <Button title={snapshotIModelsLabel} onClick={() => onSelect(ActiveScreen.Snapshots)} />
            <Button title={hubIModelsLabel} onClick={() => onSelect(ActiveScreen.Hub)} />
          </div>
        </div>
      </div>
    </Screen>
  );
}
