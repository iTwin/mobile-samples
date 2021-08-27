import { Messenger } from "@itwin/mobileui-react";
import { Button, Screen } from "./Exports";
import "./HomeScreen.scss";

export enum ActiveScreen {
  Loading,
  Home,
  Snapshots,
  Hub,
  Model,
};

export interface HomeScreenProps {
  onSelect: (screen: ActiveScreen) => void;
}

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
            <Button title="Select Document..." onClick={() => Messenger.sendMessage("chooseDocument")}/>
          </div>
        </div>
      </div>
    </Screen>
  );
}
