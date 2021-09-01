/*---------------------------------------------------------------------------------------------
* Copyright (c) 2021 Bentley Systems, Incorporated. All rights reserved.
*--------------------------------------------------------------------------------------------*/
import { Button, Screen } from "./Exports";
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
  const {onSelect} = props;
  return (
    <Screen>
      <div className="home-screen">
        <div className="title">Home</div>
        <div className="list">
          <div className="list-items">
            <Button title="Snapshot iModels" onClick={() => onSelect(ActiveScreen.Snapshots)}/>
            <Button title="Hub iModels" onClick={() => onSelect(ActiveScreen.Hub)}/>
          </div>
        </div>
      </div>
    </Screen>
  );
}
