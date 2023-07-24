/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";
import { SuggestionContainer, ToolAssistanceSuggestion } from "@itwin/mobile-ui-react";

/**
 * React component that shows tool assistance.
 */
export function ToolAssistance() {
  return <SuggestionContainer>
    <ToolAssistanceSuggestion />
  </SuggestionContainer>;
}
