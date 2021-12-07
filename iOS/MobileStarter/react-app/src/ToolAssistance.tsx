/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { UiEvent } from "@itwin/core-react";
import { ToolAssistanceInstructions } from "@itwin/core-frontend";
import { SuggestionContainer, ToolAssistanceSuggestion } from "@itwin/mobile-ui-react";

export function ToolAssistance() {
    return <SuggestionContainer>
        <ToolAssistanceSuggestion onSetToolAssistance={ToolAssistance.onSetToolAssistance} />
    </SuggestionContainer>;
}

ToolAssistance.onSetToolAssistance = new UiEvent<ToolAssistanceInstructions | undefined>();
