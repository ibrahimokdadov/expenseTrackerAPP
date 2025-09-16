import React, {useEffect, useRef} from 'react';
import {View, Text, StyleSheet, Animated} from 'react-native';
import Svg, {Path, Circle, G} from 'react-native-svg';

interface DonutChartProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
  size?: number;
  strokeWidth?: number;
  total: number;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 80,
  strokeWidth = 12,
  total,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const animationValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animationValue, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [data]);

  const createPath = (startAngle: number, endAngle: number): string => {
    const start = polarToCartesian(center, center, radius, endAngle);
    const end = polarToCartesian(center, center, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

    return [
      'M', start.x, start.y,
      'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
    ].join(' ');
  };

  const polarToCartesian = (
    centerX: number,
    centerY: number,
    radius: number,
    angleInDegrees: number
  ) => {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
    return {
      x: centerX + (radius * Math.cos(angleInRadians)),
      y: centerY + (radius * Math.sin(angleInRadians))
    };
  };

  let currentAngle = 0;
  const paths = data.map((item, index) => {
    if (item.value === 0) return null;

    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    return {
      path: createPath(startAngle, endAngle),
      color: item.color,
      percentage,
      name: item.name,
    };
  }).filter(Boolean);

  if (!data || data.length === 0 || total === 0) {
    return (
      <View style={[styles.container, {width: size, height: size}]}>
        <Svg width={size} height={size}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="rgba(255, 255, 255, 0.2)"
            strokeWidth={strokeWidth}
            fill="none"
          />
        </Svg>
        <View style={styles.centerContent}>
          <Text style={styles.noDataText}>0%</Text>
        </View>
      </View>
    );
  }

  const largestCategory = data.reduce((prev, current) =>
    prev.value > current.value ? prev : current
  );
  const largestPercentage = Math.round((largestCategory.value / total) * 100);

  return (
    <View style={[styles.container, {width: size, height: size}]}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255, 255, 255, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <G>
          {paths.map((item, index) => (
            <Path
              key={index}
              d={item.path}
              stroke={item.color}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />
          ))}
        </G>
      </Svg>
      <View style={styles.centerContent}>
        <Text style={styles.percentageText}>{largestPercentage}%</Text>
        <Text style={styles.categoryText}>{largestCategory.name}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  percentageText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  categoryText: {
    fontSize: 8,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 1,
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.5)',
  },
});

export default DonutChart;