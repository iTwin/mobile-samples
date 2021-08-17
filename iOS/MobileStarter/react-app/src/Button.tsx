import React from "react";

import "./Button.css";

export interface ButtonProps {
  title: string;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function Button(props: ButtonProps) {
  const { title, onClick } = props;
  return <div className="Button" onClick={onClick}>{title}</div>
}
