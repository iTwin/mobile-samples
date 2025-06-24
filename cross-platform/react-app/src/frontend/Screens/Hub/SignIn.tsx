/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { IModelApp } from "@itwin/core-frontend";
import { ProgressRadial } from "@itwin/itwinui-react";
import { useIsMountedRef } from "@itwin/mobile-ui-react";
import React from "react";
import { Button, presentError, useLocalizedString } from "../../Exports";

/** Properties for the {@link SignIn} React component. */
export interface SignInProps {
  onBack: () => void;
  onError: () => void;
  onSignedIn: () => void;
}

/**
 * React component to trigger sign in and then wait while the user is signing in.
 *
 * Shows a spinner and a cancel button while the sign in is happening.
 */
export function SignIn(props: SignInProps) {
  const { onBack, onError, onSignedIn } = props;
  const signedInRef = React.useRef(false);
  const cancelLabel = useLocalizedString("HubScreen", "Cancel");
  const connectingLabel = useLocalizedString("HubScreen", "Connecting");
  const userCanceledSignInLabel = useLocalizedString("HubScreen", "UserCanceledSignIn");
  const isMountedRef = useIsMountedRef();

  React.useEffect(() => {
    if (signedInRef.current) return;
    const signIn = async () => {
      try {
        // Asking for the access token will trigger sign in if that has not already happened.
        const accessToken = await IModelApp.authorizationClient?.getAccessToken();
        if (!isMountedRef.current)
          return;
        if (accessToken) {
          onSignedIn();
        } else {
          await presentError("SigninErrorFormat", new Error(userCanceledSignInLabel), "HubScreen");
          onError();
        }
      } catch (error) {
        await presentError("SigninErrorFormat", error, "HubScreen");
        onError();
      }
    };
    signedInRef.current = true;
    void signIn();
  }, [isMountedRef, onError, onSignedIn, userCanceledSignInLabel]);

  return <div className="centered-list">
    {connectingLabel}
    <ProgressRadial indeterminate />
    <Button title={cancelLabel} onClick={() => onBack()} />
  </div>;
}
