import { createAvatar } from '@dicebear/core';
import { pixelArt } from '@dicebear/collection';

interface Props {
  seed: string;
  size?: number;
  className?: string;
  responsive?: boolean;
}

export function AvatarDisplay({ seed, size = 48, className, responsive }: Props) {
  const avatar = createAvatar(pixelArt, {
    seed,
    ...(responsive ? {} : { size }),
  });

  const svg = responsive
    ? avatar.toString().replace('<svg', '<svg style="width:100%;height:100%"')
    : avatar.toString();

  return (
    <div
      className={className}
      style={{
        ...(responsive ? {} : { width: size, height: size }),
        lineHeight: 0,
        overflow: 'hidden',
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
