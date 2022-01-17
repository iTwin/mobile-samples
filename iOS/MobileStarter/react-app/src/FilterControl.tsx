/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import React from "react";

/**
 * Properties for the [[FilterControl]] React component.
 */
export interface FilterControlProps {
  placeholder?: string;
  initialValue?: string;
  onFilter?: (value: string) => void;
}

/**
 * A React component representing a simple list filter input field.
 */
export function FilterControl(props: FilterControlProps) {
  const { placeholder, onFilter, initialValue } = props;
  const [value, setValue] = React.useState<string>(initialValue ?? "");

  React.useEffect(() => {
    if (onFilter) {
      const id = setTimeout(() => onFilter(value), 500);
      return () => clearTimeout(id);
    }
  }, [value, onFilter]);

  return (
    <div className="filter-control">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        onChange={e => setValue(e.target.value)}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}
