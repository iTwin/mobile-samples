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
  onFilter?: (value: string) => void;
  value?: string;
}

/**
 * A React component representing a simple list filter input field.
 */
export function FilterControl(props: FilterControlProps) {
  const { placeholder, onFilter, value } = props;
  const [pendingFilter, setPendingFilter] = React.useState<NodeJS.Timeout>();

  const clearPendingFilter = React.useCallback(() => {
    if (pendingFilter) {
      clearTimeout(pendingFilter);
      setPendingFilter(undefined);
    }
  }, [pendingFilter]);

  const handleChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    clearPendingFilter();
    setPendingFilter(setTimeout(() => {
      onFilter?.(value);
    }, 500));
  }, [clearPendingFilter, onFilter]);

  return (
    <div className="filter-control">
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        onChange={handleChange}
        onKeyPress={(e) => {
          if (e.key === "Enter") {
            clearPendingFilter();
            onFilter?.(e.currentTarget.value);
            e.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}
