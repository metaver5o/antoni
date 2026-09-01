import React, { useEffect } from 'react';
import { Dimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const { width: W, height: H } = Dimensions.get('window');

const COLORS = [
  '#FFB3BA', '#FFDAB9', '#FFFACD', '#B5EAD7',
  '#C7CEEA', '#FF9AA2', '#FFD700', '#98FB98',
  '#DDA0DD', '#87CEEB',
];

const SHAPES: Array<'circle' | 'rect' | 'strip'> = ['circle', 'rect', 'strip'];

// Seeded pseudo-random to avoid Math.random (deterministic per render)
function seededRand(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

interface Particle {
  id: number;
  x: number;
  color: string;
  size: number;
  duration: number;
  delay: number;
  rotation: number;
  shape: 'circle' | 'rect' | 'strip';
}

const PARTICLES: Particle[] = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  x: seededRand(i * 3) * W,
  color: COLORS[i % COLORS.length],
  size: 8 + Math.floor(seededRand(i * 7) * 10),
  duration: 1800 + Math.floor(seededRand(i * 11) * 1800),
  delay: Math.floor(seededRand(i * 13) * 1200),
  rotation: 360 * (seededRand(i * 17) > 0.5 ? 1 : -1),
  shape: SHAPES[i % SHAPES.length],
}));

const Particle: React.FC<Particle> = ({ x, color, size, duration, delay, rotation, shape }) => {
  const y = useSharedValue(-size - 20);
  const rot = useSharedValue(0);

  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withTiming(H + 20, { duration }), -1, false));
    rot.value = withDelay(delay, withRepeat(withTiming(rotation, { duration }), -1, false));
  }, [delay, duration, rotation, y, rot, size]);

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: x,
    top: y.value,
    transform: [{ rotate: `${rot.value}deg` }],
  }));

  const shapeStyle =
    shape === 'circle'
      ? { width: size, height: size, borderRadius: size / 2, backgroundColor: color }
      : shape === 'strip'
      ? { width: 3, height: size * 2, borderRadius: 2, backgroundColor: color }
      : { width: size, height: size * 0.6, borderRadius: 3, backgroundColor: color };

  return (
    <Animated.View style={style}>
      <View style={shapeStyle} />
    </Animated.View>
  );
};

export const ConfettiOverlay: React.FC = () => (
  <View
    style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}
    pointerEvents="none"
  >
    {PARTICLES.map((p) => (
      <Particle key={p.id} {...p} />
    ))}
  </View>
);
