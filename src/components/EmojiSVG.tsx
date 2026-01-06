import type { FC } from 'react';

interface EmojiTextProps {
  children: string;
  size?: number;
  className?: string;
}

const EmojiText: FC<EmojiTextProps> = ({
  children,
  size = 24,
  className = '',
}) => {
  // Convert emoji to unicode codepoint for twemoji URL
  function emojiToCodepoints(emoji: string): string {
    // Get the codepoints of the emoji
    const codePoints = [...emoji]
      .map((char) => {
        const codePoint = char.codePointAt(0);
        if (!codePoint) return '';

        // Convert to hex and pad to at least 4 characters
        const hex = codePoint.toString(16).toLowerCase();
        return hex.length <= 4 ? hex.padStart(4, '0') : hex;
      })
      .filter((code) => code !== '' && code !== 'fe0f'); // Filter out variation selector

    return codePoints.join('-');
  }

  const codepoints = emojiToCodepoints(children);
  const twemojiUrl = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoints}.svg`;

  return (
    <span className={`flex justify-center items-center ${className}`}>
      <img
        src={twemojiUrl}
        alt={children}
        className="inline-block"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          verticalAlign: 'middle',
        }}
        loading="lazy"
        onError={(e) => {
          // Fallback to text emoji if SVG fails
          const target = e.target as HTMLImageElement;
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = children;
            parent.style.fontSize = `${size * 0.8}px`;
          }
        }}
      />
    </span>
  );
};

export default EmojiText;

// Example usage:
// <EmojiText size={48}>🚀</EmojiText>
// <EmojiText size={32} className="px-4">📚</EmojiText>
// <EmojiText size={24}>⚙️</EmojiText>
