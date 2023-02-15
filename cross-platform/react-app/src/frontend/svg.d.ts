/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

// The mere presence of this file allows *.svg files to be imported as strings that then get
// converted to IconSpec values using IconSpecUtilities.createWebComponentIconSpec.
// DO NOT import or export this file from anywhere.

declare module "*.svg" {
  const src: string;
  export default src;
}
