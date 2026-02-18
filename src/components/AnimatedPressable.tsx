import React from 'react';
import { GestureResponderEvent, Pressable, PressableProps, ViewStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

type AnimatedPressableProps = PressableProps & {
  scale?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
};

export function AnimatedPressable({
  scale = 0.96,
  style,
  children,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableProps) {
  const active = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(active.value ? scale : 1, {
            damping: 15,
            stiffness: 150,
          }),
        },
      ],
    };
  });

  const handlePressIn = (e: GestureResponderEvent) => {
    active.value = 1;
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    active.value = 0;
    onPressOut?.(e);
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={style}
      {...props}
    >
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </Pressable>
  );
}
