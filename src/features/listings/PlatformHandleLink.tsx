import {
  getTypeIcon,
} from "../../lib/marketplace/icons";

import {
  formatPlatformHandle,
} from "../../lib/marketplace/platformDisplay";

import "./platform-handle-link.css";

type PlatformHandleLinkProps = {
  typeName: string;
  handle?: string;
  platformUrl?: string;
};

export function PlatformHandleLink({
  typeName,
  handle,
  platformUrl,
}: PlatformHandleLinkProps) {
  if (!handle) {
    return null;
  }

  const content = (
    <>
      {getTypeIcon(typeName)}

      <span>
        {formatPlatformHandle(
          handle,
        )}
      </span>
    </>
  );

  if (!platformUrl) {
    return (
      <span className="platform-handle-link no-link">
        {content}
      </span>
    );
  }

  return (
    <a
      className="platform-handle-link"
      href={platformUrl}
      target="_blank"
      rel="noreferrer"
      title={`Open ${typeName}`}
    >
      {content}
    </a>
  );
}