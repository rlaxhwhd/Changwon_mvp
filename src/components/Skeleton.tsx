interface SkeletonProps {
  lines?: number;
  height?: number;
}

export default function Skeleton({ lines = 4, height = 16 }: SkeletonProps) {
  return (
    <div className="skeleton-wrap">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{
            height,
            width: i === lines - 1 ? '60%' : '100%',
          }}
        />
      ))}
    </div>
  );
}
