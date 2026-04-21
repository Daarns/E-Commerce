interface AvatarProps {
  name?: string;
  className?: string;
}

export function Avatar({ name = 'User', className = '' }: AvatarProps) {
  // Generate initials from name
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

  // Generate a consistent color based on name
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-red-500',
    'bg-indigo-500',
    'bg-cyan-500',
  ];

  const colorIndex = name.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <div
      className={`flex items-center justify-center rounded-full font-bold text-white text-lg ${bgColor} ${className}`}
      title={name}
    >
      {initials || 'U'}
    </div>
  );
}

export function AvatarSVG({ name = 'User', size = 96 }: { name?: string; size?: number }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase();

  const colors = [
    '#3b82f6', // blue
    '#a855f7', // purple
    '#ec4899', // pink
    '#10b981', // green
    '#f97316', // orange
    '#ef4444', // red
    '#6366f1', // indigo
    '#06b6d4', // cyan
  ];

  const colorIndex = name.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width={size} height={size} rx={size / 2} fill={bgColor} />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={size / 2.5}
        fontWeight="bold"
        fill="white"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        {initials || 'U'}
      </text>
    </svg>
  );
}
