/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { IconImage } from "@itwin/mobile-ui-react";
import React from "react";
import "./SearchControl.scss";

/** Properties for the {@link SearchControl} React component. */
export interface SearchControlProps {
  placeholder?: string;
  initialValue?: string;
  onSearch?: (value: string) => void;
}

/** React component representing a simple search input field. */
export function SearchControl(props: SearchControlProps) {
  const { placeholder, onSearch, initialValue } = props;
  const [value, setValue] = React.useState<string>(initialValue ?? "");

  React.useEffect(() => {
    if (onSearch) {
      // Call onSearch 500 ms after the value stops changing.
      const id = setTimeout(() => onSearch(value), 500);
      return () => clearTimeout(id);
    }
  }, [value, onSearch]);

  return (
    <div className="search-control">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        onChange={(e) => setValue(e.target.value)}
        onKeyUp={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
      />
      {value && <div className="search-clear" onClick={() => setValue("")}>
        <IconImage iconSpec=" icon-close-circular" fontSize="20px" size="40px" />
      </div>}
    </div>
  );
}
