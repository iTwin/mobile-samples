/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { IModelApp } from "@itwin/core-frontend";
import { LoadingSpinner } from "@itwin/core-react";
import { useIsMountedRef } from "@itwin/mobile-ui-react";
import React from "react";
import { Button, i18n, presentError } from "../../Exports";

export interface SignInProps {
  onBack: () => void;
  onError: () => void;
  onSignedIn: () => void;
}

export function SignIn(props: SignInProps) {
  const { onBack, onError, onSignedIn } = props;
  const [signedIn, setSignedIn] = React.useState(false);
  const cancelLabel = React.useMemo(() => i18n("HubScreen", "Cancel"), []);
  const connectingLabel = React.useMemo(() => i18n("HubScreen", "Connecting"), []);
  const isMountedRef = useIsMountedRef();

  React.useEffect(() => {
    if (signedIn)
      return;
    const signIn = async () => {
      try {
        await IModelApp.authorizationClient?.getAccessToken();
        if (!isMountedRef.current)
          return;
        onSignedIn();
      } catch (error) {
        presentError("SigninErrorFormat", error, "HubScreen");
        onError();
      }
    };
    setSignedIn(true);
    signIn(); // eslint-disable-line @typescript-eslint/no-floating-promises
  }, [isMountedRef, onError, onSignedIn, signedIn]);

  return <div className="centered-list">
    {connectingLabel}
    <LoadingSpinner />
    <Button title={cancelLabel} onClick={() => onBack()} />
  </div>;
}
